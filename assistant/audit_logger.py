from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("indicare.audit")


@dataclass
class AssistantAuditEvent:
    event_id: str
    event_type: str
    session_id: str
    conversation_id: str | None = None
    user_id: str | None = None
    role: str | None = None
    message_preview: str | None = None
    selected_mode: str | None = None
    detected_mode: str | None = None
    task_type: str | None = None
    output_type: str | None = None
    safeguarding_level: str | None = None
    urgency: str | None = None
    response_stance: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    guidance_search_enabled: bool | None = None
    guidance_search_reason: str | None = None
    has_document: bool | None = None
    source_count: int | None = None
    evidence_count: int | None = None
    regulation_count: int | None = None
    duration_ms: int | None = None
    success: bool | None = None
    error_code: str | None = None
    error_message: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AssistantAuditTimer:
    started_at: float

    @classmethod
    def start(cls) -> "AssistantAuditTimer":
        return cls(started_at=time.perf_counter())

    def duration_ms(self) -> int:
        return int((time.perf_counter() - self.started_at) * 1000)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _truncate(text: str | None, limit: int = 220) -> str:
    value = " ".join(_safe_string(text).split())
    if len(value) <= limit:
        return value
    return value[:limit].rsplit(" ", 1)[0].strip() + "..."


def _coerce_bool(value: Any) -> bool | None:
    if value is None:
        return None
    return bool(value)


def _clean_dict(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if item not in (None, "", [], {})}


def _runtime_value(runtime: Any, name: str, default: Any = None) -> Any:
    if runtime is None:
        return default
    return getattr(runtime, name, default)


def _safe_len(value: Any) -> int:
    if isinstance(value, (list, tuple, set, dict)):
        return len(value)
    return 0


def build_audit_id() -> str:
    return str(uuid.uuid4())


def build_assistant_request_event(
    *,
    session_id: str,
    conversation_id: str | None,
    user_id: str | int | None,
    role: str | None,
    message: str,
    selected_mode: str,
    orchestration: Any,
) -> AssistantAuditEvent:
    runtime = getattr(orchestration, "runtime", None)
    guidance_plan = getattr(orchestration, "guidance_plan", None)
    model_plan = getattr(orchestration, "model_plan", None)
    sources = getattr(orchestration, "sources", []) or []
    regulation_payload = getattr(orchestration, "regulation_payload", []) or []
    runtime_payload = getattr(orchestration, "runtime_payload", {}) or {}
    evidence_index = runtime_payload.get("evidence_index") or getattr(runtime, "evidence_index", []) or []

    return AssistantAuditEvent(
        event_id=build_audit_id(),
        event_type="assistant_request_started",
        session_id=_safe_string(session_id),
        conversation_id=_safe_string(conversation_id) or None,
        user_id=_safe_string(user_id) or None,
        role=_safe_string(role) or None,
        message_preview=_truncate(message),
        selected_mode=_safe_string(selected_mode) or None,
        detected_mode=_safe_string(_runtime_value(runtime, "mode")) or None,
        task_type=_safe_string(_runtime_value(runtime, "task_type")) or None,
        output_type=_safe_string(_runtime_value(runtime, "output_type")) or None,
        safeguarding_level=_safe_string(_runtime_value(runtime, "safeguarding_level")) or None,
        urgency=_safe_string(_runtime_value(runtime, "urgency")) or None,
        response_stance=_safe_string(_runtime_value(runtime, "response_stance")) or None,
        model=_safe_string(getattr(model_plan, "model", None)) or None,
        temperature=getattr(model_plan, "temperature", None),
        max_tokens=getattr(model_plan, "max_tokens", None),
        guidance_search_enabled=_coerce_bool(getattr(guidance_plan, "enabled", None)),
        guidance_search_reason=_safe_string(getattr(guidance_plan, "reason", None)) or None,
        has_document=_coerce_bool(getattr(orchestration, "trimmed_document_text", None)),
        source_count=_safe_len(sources),
        evidence_count=_safe_len(evidence_index),
        regulation_count=_safe_len(regulation_payload),
    )


def build_assistant_result_event(
    *,
    base_event: AssistantAuditEvent,
    duration_ms: int,
    success: bool,
    source_count: int | None = None,
    evidence_count: int | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    extra: dict[str, Any] | None = None,
) -> AssistantAuditEvent:
    return AssistantAuditEvent(
        event_id=build_audit_id(),
        event_type="assistant_request_finished",
        session_id=base_event.session_id,
        conversation_id=base_event.conversation_id,
        user_id=base_event.user_id,
        role=base_event.role,
        message_preview=base_event.message_preview,
        selected_mode=base_event.selected_mode,
        detected_mode=base_event.detected_mode,
        task_type=base_event.task_type,
        output_type=base_event.output_type,
        safeguarding_level=base_event.safeguarding_level,
        urgency=base_event.urgency,
        response_stance=base_event.response_stance,
        model=base_event.model,
        temperature=base_event.temperature,
        max_tokens=base_event.max_tokens,
        guidance_search_enabled=base_event.guidance_search_enabled,
        guidance_search_reason=base_event.guidance_search_reason,
        has_document=base_event.has_document,
        source_count=source_count if source_count is not None else base_event.source_count,
        evidence_count=evidence_count if evidence_count is not None else base_event.evidence_count,
        regulation_count=base_event.regulation_count,
        duration_ms=duration_ms,
        success=success,
        error_code=_safe_string(error_code) or None,
        error_message=_truncate(error_message, 180) or None,
        extra=extra or {},
    )


def serialise_audit_event(event: AssistantAuditEvent) -> dict[str, Any]:
    payload = {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "session_id": event.session_id,
        "conversation_id": event.conversation_id,
        "user_id": event.user_id,
        "role": event.role,
        "message_preview": event.message_preview,
        "selected_mode": event.selected_mode,
        "detected_mode": event.detected_mode,
        "task_type": event.task_type,
        "output_type": event.output_type,
        "safeguarding_level": event.safeguarding_level,
        "urgency": event.urgency,
        "response_stance": event.response_stance,
        "model": event.model,
        "temperature": event.temperature,
        "max_tokens": event.max_tokens,
        "guidance_search_enabled": event.guidance_search_enabled,
        "guidance_search_reason": event.guidance_search_reason,
        "has_document": event.has_document,
        "source_count": event.source_count,
        "evidence_count": event.evidence_count,
        "regulation_count": event.regulation_count,
        "duration_ms": event.duration_ms,
        "success": event.success,
        "error_code": event.error_code,
        "error_message": event.error_message,
        "extra": event.extra,
    }
    return _clean_dict(payload)


def log_audit_event(event: AssistantAuditEvent) -> None:
    try:
        payload = serialise_audit_event(event)
        logger.info(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    except Exception:
        logger.exception("Failed to write assistant audit event")


def log_assistant_request_started(
    *,
    session_id: str,
    conversation_id: str | None,
    user_id: str | int | None,
    role: str | None,
    message: str,
    selected_mode: str,
    orchestration: Any,
) -> AssistantAuditEvent:
    event = build_assistant_request_event(
        session_id=session_id,
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        message=message,
        selected_mode=selected_mode,
        orchestration=orchestration,
    )
    log_audit_event(event)
    return event


def log_assistant_request_finished(
    *,
    base_event: AssistantAuditEvent,
    duration_ms: int,
    success: bool,
    source_count: int | None = None,
    evidence_count: int | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    extra: dict[str, Any] | None = None,
) -> AssistantAuditEvent:
    event = build_assistant_result_event(
        base_event=base_event,
        duration_ms=duration_ms,
        success=success,
        source_count=source_count,
        evidence_count=evidence_count,
        error_code=error_code,
        error_message=error_message,
        extra=extra,
    )
    log_audit_event(event)
    return event