from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.assistant_engine import (
    AssistantRequest,
    AssistantRuntimeContext,
    build_assistant_prompt_package,
)
from assistant.regulation_mapper import (
    RegulationMappingResult,
    build_regulation_context_block,
    map_regulation_references,
    serialise_regulation_mapping,
)
from assistant.response_planner import (
    GuidancePlan,
    ModelPlan,
    ResponsePlan,
    build_response_plan,
)

logger = logging.getLogger("indicare.orchestrator")


@dataclass
class OrchestratorRequest:
    message: str
    session_id: str
    history: list[dict[str, Any]] = field(default_factory=list)
    role: str = "residential care staff"
    document_text: str | None = None
    document_name: str | None = None
    ld_lens: bool = False
    training_mode: bool = False
    speed: str = "balanced"
    user_context: dict[str, Any] = field(default_factory=dict)


@dataclass
class OrchestratorResult:
    system_prompt: str
    user_message: str
    runtime: AssistantRuntimeContext
    messages: list[dict[str, str]]
    selected_mode: str
    trimmed_history: list[dict[str, str]]
    trimmed_document_text: str | None
    sources: list[dict[str, Any]] = field(default_factory=list)
    runtime_payload: dict[str, Any] = field(default_factory=dict)
    response_plan: ResponsePlan = field(default_factory=ResponsePlan)
    guidance_plan: GuidancePlan = field(default_factory=GuidancePlan)
    model_plan: ModelPlan = field(default_factory=ModelPlan)
    regulation_mapping: RegulationMappingResult = field(default_factory=RegulationMappingResult)
    regulation_payload: list[dict[str, str]] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _normalise_response_mode(response_mode: str | None) -> str:
    value = _safe_string(response_mode).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def _trim_history(
    history: list[dict[str, Any]] | None,
    selected_mode: str,
) -> list[dict[str, str]]:
    if not history:
        return []

    if selected_mode == "quick":
        limit = 3
        max_chars = 4000
    elif selected_mode == "deep":
        limit = 8
        max_chars = 12000
    else:
        limit = 5
        max_chars = 8000

    trimmed = history[-limit:]

    if trimmed and _safe_string(trimmed[-1].get("role")).lower() == "user":
        trimmed = trimmed[:-1]

    cleaned: list[dict[str, str]] = []
    for item in trimmed:
        if not isinstance(item, dict):
            continue

        role_name = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("message") or item.get("content"))

        if role_name not in {"user", "assistant"}:
            continue
        if not content:
            continue

        cleaned.append(
            {
                "role": role_name,
                "content": content[:max_chars],
            }
        )

    return cleaned


def _trim_document_text(document_text: str | None, selected_mode: str) -> str | None:
    text = _safe_string(document_text)
    if not text:
        return None

    if selected_mode == "quick":
        limit = 6000
    elif selected_mode == "deep":
        limit = 24000
    else:
        limit = 12000

    return text[:limit]


def _build_messages(
    system_prompt: str,
    user_message: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


def _normalise_sources(sources: Any) -> list[dict[str, Any]]:
    if not isinstance(sources, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in sources:
        if not isinstance(item, dict):
            continue

        source = {
            "type": item.get("type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
            "record_type": item.get("record_type"),
            "record_id": item.get("record_id"),
            "citation_ref": item.get("citation_ref"),
            "summary": item.get("summary"),
            "title": item.get("title"),
            "description": item.get("description"),
            "date": item.get("date"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in [
                "type",
                "label",
                "document_title",
                "section",
                "page_number",
                "url",
                "record_type",
                "record_id",
                "citation_ref",
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


def _normalise_evidence_index(
    value: Any,
    *,
    limit: int = 150,
) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in value[:limit]:
        if not isinstance(item, dict):
            continue

        entry = {
            "citation_ref": item.get("citation_ref"),
            "record_type": item.get("record_type"),
            "record_id": item.get("record_id"),
            "label": item.get("label"),
            "title": item.get("title"),
            "section": item.get("section"),
            "excerpt": item.get("excerpt"),
            "description": item.get("description"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "date": item.get("date"),
            "url": item.get("url"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
        }

        key = "|".join(
            str(entry.get(k) or "")
            for k in [
                "citation_ref",
                "record_type",
                "record_id",
                "label",
                "section",
                "url",
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(entry)

    return cleaned


def _extract_evidence_index(user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(user_context, dict):
        return []

    direct = user_context.get("evidence_index")
    if isinstance(direct, list):
        return _normalise_evidence_index(direct)

    context_block = user_context.get("context")
    if isinstance(context_block, dict):
        nested = context_block.get("evidence_index")
        if isinstance(nested, list):
            return _normalise_evidence_index(nested)

    runtime_block = user_context.get("runtime")
    if isinstance(runtime_block, dict):
        nested_runtime = runtime_block.get("evidence_index")
        if isinstance(nested_runtime, list):
            return _normalise_evidence_index(nested_runtime)

    return []


def _extract_sources_from_context(user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(user_context, dict):
        return []

    direct = user_context.get("sources")
    if isinstance(direct, list):
        return _normalise_sources(direct)

    context_block = user_context.get("context")
    if isinstance(context_block, dict):
        nested = context_block.get("sources")
        if isinstance(nested, list):
            return _normalise_sources(nested)

    runtime_block = user_context.get("runtime")
    if isinstance(runtime_block, dict):
        nested_runtime = runtime_block.get("sources")
        if isinstance(nested_runtime, list):
            return _normalise_sources(nested_runtime)

    return []


def _extract_suggested_actions(runtime: AssistantRuntimeContext | None) -> list[str]:
    if runtime is None:
        return []

    raw_actions = getattr(runtime, "suggested_actions_context", "") or ""
    if not raw_actions:
        return []

    cleaned: list[str] = []
    seen: set[str] = set()

    for line in raw_actions.splitlines():
        line = line.strip()
        if not line:
            continue

        if line.startswith("-"):
            line = line.lstrip("-").strip()

        if line.startswith("*"):
            line = line.lstrip("*").strip()

        if line.startswith("•"):
            line = line.lstrip("•").strip()

        if not line:
            continue

        lowered = line.lower()
        if lowered in seen:
            continue

        seen.add(lowered)
        cleaned.append(line)

    return cleaned


def _has_internal_evidence(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    if _extract_evidence_index(user_context):
        return True

    if _extract_sources_from_context(user_context):
        return True

    keys = {
        "young_person",
        "identity",
        "active_work",
        "recent_records",
        "links",
        "home",
        "homes",
        "team",
        "tasks",
        "communications",
        "documents",
        "reports",
        "incidents",
        "inspection_actions",
        "inspection_lines",
        "audits",
        "compliance_items",
        "children_outcomes",
        "incident_summary",
        "safeguarding_summary",
        "compliance_summary",
        "staffing_summary",
        "supervision_summary",
        "management_summary",
        "positive_indicators",
        "report_snapshot",
    }

    return any(key in user_context for key in keys)


def _infer_output_overrides(
    message: str,
    user_context: dict[str, Any] | None,
) -> dict[str, str]:
    text = _safe_string(message).lower()
    user_context = user_context or {}

    reg45_requested = _safe_bool(user_context.get("reg45_requested"))
    report_type = _safe_string(user_context.get("report_type")).lower()

    if reg45_requested or report_type == "reg45":
        return {
            "task_type": "report",
            "output_type": "structured_report",
            "response_stance": "inspection_ready",
        }

    report_terms = [
        "reg 45",
        "reg45",
        "overview",
        "full overview",
        "chronology",
        "summary",
        "report",
        "review pack",
        "inspection",
        "compliance view",
    ]

    if any(term in text for term in report_terms):
        task_type = "summary"
        output_type = "plain_response"

        if "report" in text or "reg 45" in text or "reg45" in text:
            task_type = "report"
            output_type = "structured_report"

        if "review pack" in text:
            task_type = "report"
            output_type = "structured_report"

        return {
            "task_type": task_type,
            "output_type": output_type,
        }

    return {}


def _serialise_runtime(
    runtime: AssistantRuntimeContext | None,
    *,
    regulation_payload: list[dict[str, str]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
    selected_mode: str = "balanced",
    user_context: dict[str, Any] | None = None,
    sources: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    if runtime is None:
        return {}

    evidence_index = evidence_index or []
    sources = sources or []
    user_context = user_context or {}

    scope = _safe_string(user_context.get("scope"))
    scope_type = _safe_string(user_context.get("scope_type"))
    assistant_type = _safe_string(user_context.get("assistant_type"))
    report_type = _safe_string(user_context.get("report_type"))

    payload = {
        "mode": getattr(runtime, "mode", None),
        "task_type": getattr(runtime, "task_type", None),
        "output_type": getattr(runtime, "output_type", None),
        "urgency": getattr(runtime, "urgency", None),
        "safeguarding_level": getattr(runtime, "safeguarding_level", None),
        "user_role_profile": getattr(runtime, "user_role_profile", None),
        "retrieval_level": getattr(runtime, "retrieval_level", None),
        "reflection_level": getattr(runtime, "reflection_level", None),
        "response_stance": getattr(runtime, "response_stance", None),
        "classification_confidence": getattr(runtime, "classification_confidence", None),
        "secondary_intents": getattr(runtime, "secondary_intents", None),
        "suggested_actions": _extract_suggested_actions(runtime),
        "regulation_basis": regulation_payload or [],
        "response_mode": selected_mode,
        "evidence_items_loaded": len(evidence_index),
        "evidence_preview": evidence_index[:10],
        "source_count": len(sources),
        "scope": scope or None,
        "scope_type": scope_type or None,
        "assistant_type": assistant_type or None,
        "report_type": report_type or None,
        "has_internal_evidence": bool(evidence_index or sources),
        "reg45_requested": _safe_bool(user_context.get("reg45_requested")),
        "current_view": user_context.get("current_view"),
        "current_section": user_context.get("current_section"),
        "shift_context": user_context.get("shift_context"),
        "young_person_id": user_context.get("young_person_id"),
        "young_person_name": user_context.get("young_person_name"),
        "home_id": user_context.get("home_id"),
        "home_name": user_context.get("home_name"),
        "allowed_home_ids": user_context.get("allowed_home_ids"),
        "access_level": user_context.get("access_level"),
        "assistant_intent": user_context.get("assistant_intent"),
        "retrieval_mode": user_context.get("retrieval_mode"),
        "output_mode": user_context.get("output_mode"),
    }

    return {k: v for k, v in payload.items() if v not in (None, "", [])}


def build_orchestrator_result(req: OrchestratorRequest) -> OrchestratorResult:
    selected_mode = _normalise_response_mode(req.speed)
    trimmed_history = _trim_history(req.history, selected_mode)
    trimmed_document_text = _trim_document_text(req.document_text, selected_mode)

    logger.info(
        "Orchestrator starting session_id=%s response_mode=%s history=%s has_document=%s",
        req.session_id,
        selected_mode,
        len(trimmed_history),
        bool(trimmed_document_text),
    )

    prompt_package = build_assistant_prompt_package(
        AssistantRequest(
            message=req.message,
            session_id=req.session_id,
            history=req.history[-8:] if req.history else [],
            role=req.role,
            document_text=trimmed_document_text,
            document_name=req.document_name,
            ld_lens=req.ld_lens,
            training_mode=req.training_mode,
            speed=selected_mode,
            user_context=req.user_context,
        )
    )

    runtime = prompt_package.runtime
    system_prompt = prompt_package.system_prompt
    user_message = prompt_package.user_message

    mode = getattr(runtime, "mode", "general_practice")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    urgency = getattr(runtime, "urgency", "routine")
    user_role_profile = getattr(runtime, "user_role_profile", "staff")
    response_stance = getattr(runtime, "response_stance", "practice_support")

    inferred_overrides = _infer_output_overrides(req.message, req.user_context)

    if inferred_overrides.get("task_type"):
        task_type = inferred_overrides["task_type"]

    if inferred_overrides.get("output_type"):
        output_type = inferred_overrides["output_type"]

    if inferred_overrides.get("response_stance"):
        response_stance = inferred_overrides["response_stance"]

    response_plan = build_response_plan(
        message=req.message,
        mode=mode,
        task_type=task_type,
        output_type=output_type,
        safeguarding_level=safeguarding_level,
        urgency=urgency,
        user_role_profile=user_role_profile,
        selected_mode=selected_mode,
        has_document=bool(trimmed_document_text),
    )

    regulation_mapping = map_regulation_references(
        message=req.message,
        mode=mode,
        task_type=task_type,
        output_type=output_type,
        safeguarding_level=safeguarding_level,
        urgency=urgency,
        user_role_profile=user_role_profile,
        response_stance=response_stance,
    )

    regulation_payload = serialise_regulation_mapping(regulation_mapping)
    regulation_context_block = build_regulation_context_block(regulation_mapping)

    if regulation_context_block:
        system_prompt = (
            f"{system_prompt}\n\n"
            "============================================================\n"
            "REGULATION AND STANDARDS CONTEXT\n\n"
            f"{regulation_context_block}"
        ).strip()

    runtime_sources = _normalise_sources(getattr(runtime, "sources_used", []))
    context_sources = _extract_sources_from_context(req.user_context)
    sources = _normalise_sources(runtime_sources + context_sources)

    evidence_index = _extract_evidence_index(req.user_context)

    runtime_payload = _serialise_runtime(
        runtime,
        regulation_payload=regulation_payload,
        evidence_index=evidence_index,
        selected_mode=selected_mode,
        user_context=req.user_context,
        sources=sources,
    )

    if evidence_index:
        runtime_payload["evidence_index"] = evidence_index

    runtime_payload["history_items_loaded"] = len(trimmed_history)
    runtime_payload["document_attached"] = bool(trimmed_document_text)
    runtime_payload["regulation_refs_count"] = len(regulation_payload)
    runtime_payload["has_internal_evidence"] = _has_internal_evidence(req.user_context)

    messages = _build_messages(
        system_prompt=system_prompt,
        user_message=user_message,
        history=trimmed_history,
    )

    logger.info(
        (
            "Orchestrator built session_id=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s urgency=%s response_mode=%s stance=%s "
            "guidance_enabled=%s guidance_reason=%s model=%s temp=%s max_tokens=%s "
            "memory=%s retrieval=%s reflection=%s supervision=%s leadership=%s "
            "regulation_refs=%s sources=%s evidence=%s internal_evidence=%s"
        ),
        req.session_id,
        mode,
        task_type,
        output_type,
        safeguarding_level,
        urgency,
        response_plan.selected_mode,
        response_stance,
        response_plan.guidance_plan.enabled,
        response_plan.guidance_plan.reason,
        response_plan.model_plan.model,
        response_plan.model_plan.temperature,
        response_plan.model_plan.max_tokens,
        response_plan.should_use_memory,
        response_plan.should_use_retrieval,
        response_plan.should_use_reflection,
        response_plan.should_use_supervision,
        response_plan.should_use_leadership_lens,
        len(regulation_payload),
        len(sources),
        len(evidence_index),
        runtime_payload.get("has_internal_evidence"),
    )

    return OrchestratorResult(
        system_prompt=system_prompt,
        user_message=user_message,
        runtime=runtime,
        messages=messages,
        selected_mode=response_plan.selected_mode,
        trimmed_history=trimmed_history,
        trimmed_document_text=trimmed_document_text,
        sources=sources,
        runtime_payload=runtime_payload,
        response_plan=response_plan,
        guidance_plan=response_plan.guidance_plan,
        model_plan=response_plan.model_plan,
        regulation_mapping=regulation_mapping,
        regulation_payload=regulation_payload,
    )


def build_assistant_prompt(*args: Any, **kwargs: Any) -> dict[str, Any]:
    """
    Backwards-compatible shim for older callers that expect
    build_assistant_prompt(...) to return a dict.
    """

    request_obj = args[0] if args else None

    message = kwargs.pop("message", None)
    session_id = kwargs.pop("session_id", None)
    history = kwargs.pop("history", None) or []
    role = kwargs.pop("role", "residential care staff")
    document_text = kwargs.pop("document_text", None)
    document_name = kwargs.pop("document_name", None)
    ld_lens = kwargs.pop("ld_lens", False)
    training_mode = kwargs.pop("training_mode", False)
    speed = kwargs.pop("speed", kwargs.pop("response_mode", "balanced"))
    user_context = kwargs.pop("user_context", None) or {}
    user_id = kwargs.pop("user_id", None)
    scope = kwargs.pop("scope", None)

    if message is None and request_obj is not None:
        message = getattr(request_obj, "message", None)

    if not message:
        raise TypeError("build_assistant_prompt() missing required argument: 'message'")

    if session_id is None:
        session_id = f"orchestrator-{abs(hash(message))}"

    merged_context = dict(user_context)

    if user_id is not None:
        merged_context.setdefault("user_id", user_id)

    if scope is not None:
        merged_context.setdefault("scope", scope)

        if isinstance(scope, dict):
            for key, value in scope.items():
                merged_context.setdefault(key, value)

    if kwargs:
        merged_context.setdefault("_orchestrator_extra_kwargs", {})
        merged_context["_orchestrator_extra_kwargs"].update(kwargs)

    result = build_orchestrator_result(
        OrchestratorRequest(
            message=message,
            session_id=session_id,
            history=history,
            role=role,
            document_text=document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=speed,
            user_context=merged_context,
        )
    )

    return {
        "prompt": result.user_message,
        "context": merged_context,
        "session_id": session_id,
        "system_prompt": result.system_prompt,
        "user_message": result.user_message,
        "messages": result.messages,
        "runtime": result.runtime_payload,
        "runtime_payload": result.runtime_payload,
        "runtime_model": result.runtime,
        "sources": result.sources,
        "selected_mode": result.selected_mode,
        "trimmed_history": result.trimmed_history,
        "trimmed_document_text": result.trimmed_document_text,
        "response_plan": result.response_plan,
        "guidance_plan": result.guidance_plan,
        "model_plan": result.model_plan,
        "regulation_mapping": result.regulation_mapping,
        "regulation_payload": result.regulation_payload,
    }
