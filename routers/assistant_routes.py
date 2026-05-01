from __future__ import annotations

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.ai_service import generate_ai_stream
from services.assistant_context_service import build_runtime_assistant_context
from services.assistant_orchestrator import build_assistant_prompt
from services.assistant_security import (
    contains_prompt_injection_attempt,
    is_provider_level_role,
    normalise_history as normalise_safe_history,
    normalise_role,
    safe_int,
    safe_int_list,
    safe_string,
)
from services.report_scheduler import preview_report_snapshot, send_scheduled_report_now
from services.young_person_service import YoungPersonService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant-api", tags=["Operational Assistant"])

MAX_PUBLIC_MESSAGE_CHARS = 3000
MAX_OS_MESSAGE_CHARS = 20000


class AssistantScope(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope_type: Literal["global", "young_person", "home", "quality"] = "global"
    home_id: int | None = None
    young_person_id: int | None = None


class AssistantContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: AssistantScope


class AssistantPromptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=MAX_PUBLIC_MESSAGE_CHARS)
    scope: AssistantScope | None = None
    history: list[dict[str, Any]] | None = None


class YoungPersonAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: str | None = "young_person"
    young_person_id: int
    current_view: str | None = None
    current_section: str | None = None
    young_person_name: str | None = None
    placement_status: str | None = None
    summary_risk_level: str | None = None
    composer_record_type: str | None = None
    home_name: str | None = None
    shift_context: str | None = None
    record_type: str | None = None
    record_id: int | None = None
    start_date: str | None = None
    end_date: str | None = None
    reporting_period_start: str | None = None
    reporting_period_end: str | None = None
    reporting_period_inferred: bool | None = None


class YoungPersonAssistantPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=MAX_OS_MESSAGE_CHARS)
    context: YoungPersonAssistantContext
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None


class HomeAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: str | None = "home"
    home_id: int | None = None
    home_name: str | None = None
    current_view: str | None = None
    current_section: str | None = None
    shift_context: str | None = None
    composer_record_type: str | None = None
    record_type: str | None = None
    record_id: int | None = None
    access_level: str | None = None
    allowed_home_ids: list[int] | None = None
    provider_id: int | None = None
    start_date: str | None = None
    end_date: str | None = None
    reporting_period_start: str | None = None
    reporting_period_end: str | None = None
    reporting_period_inferred: bool | None = None


class HomeAssistantPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=MAX_OS_MESSAGE_CHARS)
    context: HomeAssistantContext
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None


class QualityAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: str | None = "quality"
    home_id: int | None = None
    home_name: str | None = None
    current_view: str | None = None
    current_section: str | None = None
    shift_context: str | None = None
    composer_record_type: str | None = None
    record_type: str | None = None
    record_id: int | None = None
    access_level: str | None = None
    allowed_home_ids: list[int] | None = None
    provider_id: int | None = None
    start_date: str | None = None
    end_date: str | None = None
    reporting_period_start: str | None = None
    reporting_period_end: str | None = None
    reporting_period_inferred: bool | None = None


class QualityAssistantPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=MAX_OS_MESSAGE_CHARS)
    context: QualityAssistantContext
    response_mode: str | None = "balanced"
    history: list[dict[str, Any]] | None = None


class ReportSendPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_type: str
    home_id: int | None = None
    start_date: str
    end_date: str
    email_to: str | None = None
    access_level: str | None = None
    allowed_home_ids: list[int] | None = None
    provider_id: int | None = None
    force_refresh: bool | None = False


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = safe_int(
        current_user.get("user_id")
        or current_user.get("id")
        or current_user.get("sub")
    )
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user_id


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("home_id"))


def _user_provider_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(current_user.get("provider_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return normalise_role(current_user.get("role"))


def _normalise_response_mode(value: str | None) -> str:
    mode = safe_string(value or "balanced").lower()
    if mode in {"quick", "balanced", "deep"}:
        return mode
    return "balanced"


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    return normalise_safe_history(history or [], max_items=20, max_chars=3000)


def _assert_safe_message(message: str) -> None:
    clean = safe_string(message)

    if not clean:
        raise HTTPException(status_code=400, detail="Message is required.")

    if contains_prompt_injection_attempt(clean):
        raise HTTPException(status_code=400, detail="Prompt injection attempt detected.")


def _normalise_public_scope(scope: AssistantScope | None) -> dict[str, Any]:
    if scope is None:
        return {
            "scope_type": "global",
            "home_id": None,
            "young_person_id": None,
        }

    if scope.scope_type != "global":
        raise HTTPException(
            status_code=403,
            detail="Public assistant does not support young person, home, or quality scope.",
        )

    if scope.home_id is not None or scope.young_person_id is not None:
        raise HTTPException(
            status_code=403,
            detail="Public assistant cannot accept home_id or young_person_id.",
        )

    return {
        "scope_type": "global",
        "home_id": None,
        "young_person_id": None,
    }


def _assert_home_access(
    current_user: dict[str, Any],
    record_home_id: int | None,
) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if is_provider_level_role(role):
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified.")

    if user_home_id != record_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this home or young person.",
        )


def _assert_requested_home_access(
    current_user: dict[str, Any],
    requested_home_id: int | None,
) -> int:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if requested_home_id is None:
        if user_home_id is None:
            raise HTTPException(status_code=403, detail="Home access could not be verified.")
        return user_home_id

    if is_provider_level_role(role):
        return requested_home_id

    if user_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified.")

    if requested_home_id != user_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this home.")

    return requested_home_id


def _resolve_quality_home_ids(
    current_user: dict[str, Any],
    payload_allowed_home_ids: list[int] | None,
    payload_home_id: int | None,
) -> list[int]:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if is_provider_level_role(role):
        allowed = safe_int_list(payload_allowed_home_ids or [])
        if allowed:
            return allowed
        if payload_home_id is not None:
            return [payload_home_id]
        if user_home_id is not None:
            return [user_home_id]
        return []

    if user_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified.")

    if payload_home_id is not None and payload_home_id != user_home_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this quality scope.",
        )

    return [user_home_id]


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found.")

    _assert_home_access(current_user, safe_int(record.get("home_id")))
    return record


def _normalise_young_person_scope(
    payload: YoungPersonAssistantPayload,
    current_user: dict[str, Any],
    record: dict[str, Any],
) -> dict[str, Any]:
    record_home_id = safe_int(record.get("home_id"))
    _assert_home_access(current_user, record_home_id)

    return {
        "scope_type": "young_person",
        "scope": "child",
        "access_level": "child",
        "home_id": record_home_id,
        "young_person_id": int(payload.context.young_person_id),
    }


def _normalise_home_scope(
    payload: HomeAssistantPayload,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    resolved_home_id = _assert_requested_home_access(
        current_user,
        safe_int(payload.context.home_id),
    )

    return {
        "scope_type": "home",
        "scope": "home",
        "access_level": "home",
        "home_id": resolved_home_id,
        "allowed_home_ids": [resolved_home_id],
        "provider_id": _user_provider_id(current_user),
    }


def _normalise_quality_scope(
    payload: QualityAssistantPayload,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    role = _user_role(current_user)
    payload_home_id = safe_int(payload.context.home_id)

    allowed_home_ids = _resolve_quality_home_ids(
        current_user=current_user,
        payload_allowed_home_ids=payload.context.allowed_home_ids,
        payload_home_id=payload_home_id,
    )

    access_level = "provider" if is_provider_level_role(role) else "home"

    selected_home_id = payload_home_id
    if selected_home_id is None and len(allowed_home_ids) == 1:
        selected_home_id = allowed_home_ids[0]

    return {
        "scope_type": "quality",
        "scope": "quality",
        "access_level": access_level,
        "home_id": selected_home_id,
        "allowed_home_ids": allowed_home_ids,
        "provider_id": payload.context.provider_id or _user_provider_id(current_user),
    }


def _normalise_young_person_context(
    payload: YoungPersonAssistantPayload,
    record: dict[str, Any],
) -> dict[str, Any]:
    full_name = (
        " ".join(
            [
                safe_string(record.get("first_name")),
                safe_string(record.get("last_name")),
            ]
        ).strip()
        or safe_string(record.get("preferred_name"))
        or "Young person"
    )

    current_view = payload.context.current_view or payload.context.current_section

    return {
        "current_view": current_view,
        "current_section": payload.context.current_section or current_view,
        "young_person_name": payload.context.young_person_name or full_name,
        "placement_status": payload.context.placement_status or record.get("placement_status"),
        "summary_risk_level": payload.context.summary_risk_level or record.get("summary_risk_level"),
        "composer_record_type": payload.context.composer_record_type,
        "home_name": payload.context.home_name or record.get("home_name"),
        "shift_context": payload.context.shift_context or current_view,
        "record_type": payload.context.record_type,
        "record_id": payload.context.record_id,
        "young_person_id": int(payload.context.young_person_id),
        "home_id": safe_int(record.get("home_id")),
        "start_date": payload.context.start_date,
        "end_date": payload.context.end_date,
        "reporting_period_start": payload.context.reporting_period_start or payload.context.start_date,
        "reporting_period_end": payload.context.reporting_period_end or payload.context.end_date,
        "reporting_period_inferred": payload.context.reporting_period_inferred,
    }


def _normalise_home_context(
    payload: HomeAssistantPayload,
    scope: dict[str, Any],
    current_user: dict[str, Any],
) -> dict[str, Any]:
    current_view = payload.context.current_view or payload.context.current_section

    home_name = (
        payload.context.home_name
        or current_user.get("home_name")
        or current_user.get("homeName")
        or f"Home {scope.get('home_id')}"
    )

    return {
        "current_view": current_view,
        "current_section": payload.context.current_section or current_view,
        "home_name": home_name,
        "shift_context": payload.context.shift_context or current_view,
        "composer_record_type": payload.context.composer_record_type,
        "record_type": payload.context.record_type,
        "record_id": payload.context.record_id,
        "home_id": scope.get("home_id"),
        "access_level": scope.get("access_level"),
        "allowed_home_ids": scope.get("allowed_home_ids", []),
        "provider_id": scope.get("provider_id"),
        "start_date": payload.context.start_date,
        "end_date": payload.context.end_date,
        "reporting_period_start": payload.context.reporting_period_start or payload.context.start_date,
        "reporting_period_end": payload.context.reporting_period_end or payload.context.end_date,
        "reporting_period_inferred": payload.context.reporting_period_inferred,
    }


def _normalise_quality_context(
    payload: QualityAssistantPayload,
    scope: dict[str, Any],
    current_user: dict[str, Any],
) -> dict[str, Any]:
    current_view = payload.context.current_view or payload.context.current_section

    home_name = (
        payload.context.home_name
        or current_user.get("home_name")
        or current_user.get("homeName")
        or (
            f"Home {scope.get('home_id')}"
            if scope.get("home_id") is not None
            else "Quality oversight"
        )
    )

    return {
        "current_view": current_view,
        "current_section": payload.context.current_section or current_view,
        "home_name": home_name,
        "shift_context": payload.context.shift_context or current_view,
        "composer_record_type": payload.context.composer_record_type,
        "record_type": payload.context.record_type,
        "record_id": payload.context.record_id,
        "home_id": scope.get("home_id"),
        "access_level": scope.get("access_level"),
        "allowed_home_ids": scope.get("allowed_home_ids", []),
        "provider_id": scope.get("provider_id"),
        "start_date": payload.context.start_date,
        "end_date": payload.context.end_date,
        "reporting_period_start": payload.context.reporting_period_start or payload.context.start_date,
        "reporting_period_end": payload.context.reporting_period_end or payload.context.end_date,
        "reporting_period_inferred": payload.context.reporting_period_inferred,
    }


def _sse_message(data: str) -> str:
    safe = (data or "").replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in safe.split("\n")) + "\n"


def _sse_event(event: str, payload: Any) -> str:
    body = json.dumps(payload, ensure_ascii=False)
    return f"event: {event}\ndata: {body}\n\n"


def _sse_done() -> str:
    return "event: done\ndata: [DONE]\n\n"


def _stream_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }


def _dedupe_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source in sources or []:
        if not isinstance(source, dict):
            continue

        key = "|".join(
            str(source.get(k) or "")
            for k in (
                "type",
                "source_type",
                "record_type",
                "record_id",
                "citation_ref",
                "label",
                "document_title",
                "url",
            )
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


async def _stream_assistant_response(
    *,
    assistant_prompt_bundle: dict[str, Any],
    response_mode: str,
    session_id: str,
    conversation_id: str,
    user_id: int,
    meta_payload: dict[str, Any],
):
    sources: list[dict[str, Any]] = []
    runtime: dict[str, Any] = {}
    explainability: dict[str, Any] = {}
    suggested_actions: list[str] = []
    pipeline: dict[str, Any] = {}
    user_transparency_panel: dict[str, Any] = {}
    audit_panel: dict[str, Any] = {}

    assistant_scope_meta: dict[str, Any] = dict(meta_payload.get("assistant_scope") or {})
    assistant_context_meta: dict[str, Any] = (
        assistant_prompt_bundle.get("context")
        or meta_payload.get("assistant_context")
        or {}
    )

    try:
        generator = generate_ai_stream(
            message=assistant_prompt_bundle["prompt"],
            session_id=session_id,
            history=[],
            document_text=None,
            document_name=None,
            response_mode=response_mode,
            user_context=assistant_prompt_bundle.get("context") or {},
            user_id=user_id,
            conversation_id=conversation_id,
        )

        async for item in generator:
            if isinstance(item, str):
                yield _sse_message(item)
                continue

            if not isinstance(item, dict):
                continue

            item_type = item.get("type")

            if item_type == "progress":
                content = safe_string(item.get("content"))
                if content:
                    yield _sse_event("progress", {"content": content})
                continue

            if item_type == "token":
                token = str(item.get("content") or "")
                if token:
                    yield _sse_message(token)
                continue

            if item_type == "sources" and isinstance(item.get("sources"), list):
                sources = item.get("sources") or []
                continue

            if item_type == "runtime" and isinstance(item.get("runtime"), dict):
                runtime = item.get("runtime") or {}
                continue

            if item_type == "explainability" and isinstance(item.get("explainability"), dict):
                explainability = item.get("explainability") or {}
                continue

            if item_type == "meta":
                if isinstance(item.get("sources"), list):
                    sources = item.get("sources") or sources
                if isinstance(item.get("runtime"), dict):
                    runtime = item.get("runtime") or runtime
                if isinstance(item.get("explainability"), dict):
                    explainability = item.get("explainability") or explainability
                if isinstance(item.get("assistant_scope"), dict):
                    assistant_scope_meta = item.get("assistant_scope") or assistant_scope_meta
                if isinstance(item.get("assistant_context"), dict):
                    assistant_context_meta = item.get("assistant_context") or assistant_context_meta
                if isinstance(item.get("suggested_actions"), list):
                    suggested_actions = [
                        safe_string(action)
                        for action in item.get("suggested_actions")
                        if safe_string(action)
                    ]
                if isinstance(item.get("pipeline"), dict):
                    pipeline = item.get("pipeline") or {}
                if isinstance(item.get("user_transparency_panel"), dict):
                    user_transparency_panel = item.get("user_transparency_panel") or {}
                if isinstance(item.get("audit_panel"), dict):
                    audit_panel = item.get("audit_panel") or {}
                continue

    except Exception:
        logger.exception("Assistant streaming failed")
        yield _sse_message(
            "Sorry, the assistant could not generate that response just now. "
            "Please try again, or ask a shorter question."
        )

    finally:
        final_runtime = dict(runtime)
        prompt_runtime = assistant_prompt_bundle.get("runtime") or {}
        assistant_context = meta_payload.get("assistant_context") or {}

        if isinstance(prompt_runtime, dict):
            for key, value in prompt_runtime.items():
                if value not in (None, "", []):
                    final_runtime.setdefault(key, value)

        if isinstance(assistant_context, dict):
            for key, value in assistant_context.items():
                if value not in (None, "", []):
                    final_runtime.setdefault(key, value)

        final_runtime.setdefault("assistant_type", meta_payload.get("assistant_type", "public"))

        if pipeline:
            final_runtime.setdefault("pipeline", pipeline)

        final_sources = _dedupe_sources(
            [
                *(sources or []),
                *(assistant_prompt_bundle.get("sources") or []),
                *(assistant_context.get("sources") if isinstance(assistant_context, dict) else [] or []),
            ]
        )

        evidence_index = []
        if isinstance(assistant_context, dict):
            evidence_index = assistant_context.get("evidence_index") or []

        yield _sse_event(
            "meta",
            {
                **meta_payload.get("top_level_meta", {}),
                "sources": final_sources,
                "runtime": final_runtime,
                "explainability": explainability,
                "assistant_scope": assistant_scope_meta,
                "assistant_context": assistant_context_meta,
                "suggested_actions": suggested_actions,
                "evidence_index": evidence_index,
                "evidence_count": len(evidence_index) if isinstance(evidence_index, list) else 0,
                "pipeline": pipeline,
                "user_transparency_panel": user_transparency_panel,
                "audit_panel": audit_panel,
            },
        )
        yield _sse_done()


@router.post("/context")
def get_assistant_context(
    payload: AssistantContextRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        user_id = _safe_user_id(current_user)
        scope = _normalise_public_scope(payload.scope)

        result = build_assistant_prompt(
            conn,
            user_id=user_id,
            message="Provide assistant context only.",
            scope=scope,
            history=[],
            assistant_type="public",
        )

        return {
            "ok": True,
            "context": result.get("context", {}),
            "runtime": {
                **result.get("runtime", {}),
                "assistant_type": "public",
                "scope_enforced": "global",
            },
        }

    except HTTPException:
        raise
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Public assistant context failed")
        raise HTTPException(status_code=500, detail="Unable to build assistant context.")


@router.post("/prompt")
def build_prompt(
    payload: AssistantPromptRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        _assert_safe_message(payload.message)

        user_id = _safe_user_id(current_user)
        scope = _normalise_public_scope(payload.scope)
        history = _normalise_history(payload.history)

        result = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message.strip(),
            scope=scope,
            history=history,
            assistant_type="public",
        )

        return {
            "ok": True,
            "prompt": result.get("prompt", ""),
            "context": result.get("context", {}),
            "runtime": {
                **result.get("runtime", {}),
                "assistant_type": "public",
                "scope_enforced": "global",
                "history_items_used": len(history),
            },
        }

    except HTTPException:
        raise
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Public assistant prompt build failed")
        raise HTTPException(status_code=500, detail="Unable to build assistant prompt.")


@router.post("/young-people/assistant")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_safe_message(payload.message)

    record = _load_and_check_young_person(payload.context.young_person_id, current_user)

    try:
        scope = _normalise_young_person_scope(payload, current_user, record)
        context = _normalise_young_person_context(payload, record)
        response_mode = _normalise_response_mode(payload.response_mode)
        history = _normalise_history(payload.history)
        user_id = _safe_user_id(current_user)

        runtime_context = build_runtime_assistant_context(
            conn,
            user_id=user_id,
            assistant_type="young_people_os",
            scope=scope,
            ui_context=context,
            message=payload.message,
        )

        assistant_prompt_bundle = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message,
            scope=scope,
            history=history,
            user_context=runtime_context,
            assistant_type="young_people_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to prepare young person assistant")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare young person assistant: {str(exc)}",
        ) from exc

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=f"young-person-{payload.context.young_person_id}",
            conversation_id=f"young-person-{payload.context.young_person_id}",
            user_id=user_id,
            meta_payload={
                "assistant_type": "young_people_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or runtime_context,
                "top_level_meta": {
                    "young_person_id": payload.context.young_person_id,
                    "young_person_name": runtime_context.get("young_person_name") or context.get("young_person_name"),
                    "home_id": runtime_context.get("home_id") or scope.get("home_id"),
                    "reporting_period_start": runtime_context.get("reporting_period_start"),
                    "reporting_period_end": runtime_context.get("reporting_period_end"),
                    "reporting_period_inferred": runtime_context.get("reporting_period_inferred"),
                    "evidence_count": len(runtime_context.get("evidence_index", []) or []),
                },
            },
        ),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.post("/home/assistant")
async def ask_home_assistant(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_safe_message(payload.message)

    try:
        scope = _normalise_home_scope(payload, current_user)
        context = _normalise_home_context(payload, scope, current_user)
        response_mode = _normalise_response_mode(payload.response_mode)
        history = _normalise_history(payload.history)
        user_id = _safe_user_id(current_user)

        runtime_context = build_runtime_assistant_context(
            conn,
            user_id=user_id,
            assistant_type="home_os",
            scope=scope,
            ui_context=context,
            message=payload.message,
        )

        assistant_prompt_bundle = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message,
            scope=scope,
            history=history,
            user_context=runtime_context,
            assistant_type="home_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to prepare home assistant")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare home assistant: {str(exc)}",
        ) from exc

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=f"home-{scope['home_id']}",
            conversation_id=f"home-{scope['home_id']}",
            user_id=user_id,
            meta_payload={
                "assistant_type": "home_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or runtime_context,
                "top_level_meta": {
                    "home_id": scope.get("home_id"),
                    "home_name": runtime_context.get("home_name") or context.get("home_name"),
                    "reporting_period_start": runtime_context.get("reporting_period_start"),
                    "reporting_period_end": runtime_context.get("reporting_period_end"),
                    "reporting_period_inferred": runtime_context.get("reporting_period_inferred"),
                    "evidence_count": len(runtime_context.get("evidence_index", []) or []),
                },
            },
        ),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.post("/quality/assistant")
async def ask_quality_assistant(
    payload: QualityAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_safe_message(payload.message)

    try:
        scope = _normalise_quality_scope(payload, current_user)
        context = _normalise_quality_context(payload, scope, current_user)
        response_mode = _normalise_response_mode(payload.response_mode)
        history = _normalise_history(payload.history)
        user_id = _safe_user_id(current_user)

        runtime_context = build_runtime_assistant_context(
            conn,
            user_id=user_id,
            assistant_type="quality_os",
            scope=scope,
            ui_context=context,
            message=payload.message,
        )

        assistant_prompt_bundle = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message,
            scope=scope,
            history=history,
            user_context=runtime_context,
            assistant_type="quality_os",
        )

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to prepare quality assistant")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare quality assistant: {str(exc)}",
        ) from exc

    conversation_scope = (
        f"quality-provider-{scope.get('provider_id')}"
        if scope.get("access_level") == "provider"
        else f"quality-home-{scope.get('home_id')}"
    )

    return StreamingResponse(
        _stream_assistant_response(
            assistant_prompt_bundle=assistant_prompt_bundle,
            response_mode=response_mode,
            session_id=conversation_scope,
            conversation_id=conversation_scope,
            user_id=user_id,
            meta_payload={
                "assistant_type": "quality_os",
                "assistant_scope": dict(scope),
                "assistant_context": assistant_prompt_bundle.get("context") or runtime_context,
                "top_level_meta": {
                    "home_id": scope.get("home_id"),
                    "home_name": runtime_context.get("home_name") or context.get("home_name"),
                    "allowed_home_ids": scope.get("allowed_home_ids", []),
                    "access_level": scope.get("access_level"),
                    "provider_id": scope.get("provider_id"),
                    "reporting_period_start": runtime_context.get("reporting_period_start"),
                    "reporting_period_end": runtime_context.get("reporting_period_end"),
                    "reporting_period_inferred": runtime_context.get("reporting_period_inferred"),
                    "evidence_count": len(runtime_context.get("evidence_index", []) or []),
                },
            },
        ),
        media_type="text/event-stream",
        headers=_stream_headers(),
    )


@router.post("/reports/preview")
async def preview_report(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        _assert_safe_message(payload.message)

        if not payload.context.start_date or not payload.context.end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date and end_date are required for report preview.",
            )

        scope = _normalise_home_scope(payload, current_user)
        user_id = _safe_user_id(current_user)

        lowered = payload.message.lower()
        report_type = (
            "reg45"
            if "reg 45" in lowered or "regulation 45" in lowered
            else "yearly"
            if "yearly" in lowered or "annual" in lowered
            else "monthly"
        )

        result = preview_report_snapshot(
            conn,
            report_type=report_type,
            home_id=scope.get("home_id"),
            start_date=payload.context.start_date,
            end_date=payload.context.end_date,
            access_level=scope.get("access_level"),
            allowed_home_ids=scope.get("allowed_home_ids"),
            provider_id=scope.get("provider_id"),
            generated_by=user_id,
            force_refresh=False,
        )

        snapshot = result.get("snapshot") or {}

        return {
            "ok": True,
            "preview": result.get("preview"),
            "snapshot": {
                "id": snapshot.get("id"),
                "report_type": snapshot.get("report_type"),
                "period_start": snapshot.get("period_start"),
                "period_end": snapshot.get("period_end"),
                "status": snapshot.get("status"),
            },
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to preview report")
        raise HTTPException(status_code=500, detail=f"Failed to preview report: {str(exc)}") from exc


@router.post("/reports/send-now")
async def send_report_now(
    payload: ReportSendPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        user_id = _safe_user_id(current_user)
        role = _user_role(current_user)
        access_level = payload.access_level or (
            "provider" if is_provider_level_role(role) else "home"
        )

        allowed_home_ids = safe_int_list(payload.allowed_home_ids)
        resolved_home_id = payload.home_id

        if access_level != "provider":
            resolved_home_id = _assert_requested_home_access(current_user, payload.home_id)
            allowed_home_ids = [resolved_home_id]
        else:
            allowed_home_ids = _resolve_quality_home_ids(
                current_user,
                allowed_home_ids,
                payload.home_id,
            )

        result = send_scheduled_report_now(
            conn,
            report_type=payload.report_type,
            home_id=resolved_home_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            email_to=payload.email_to,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=payload.provider_id or _user_provider_id(current_user),
            triggered_by_user_id=user_id,
            force_refresh=bool(payload.force_refresh),
        )

        return {"ok": True, "result": result}

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Failed to send report")
        raise HTTPException(status_code=500, detail=f"Failed to send report: {str(exc)}") from exc