from __future__ import annotations

import logging
import uuid
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
from services.assistant_security import (
    contains_prompt_injection_attempt,
    normalise_history as normalise_safe_history,
    safe_string,
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
    user_id: Any | None = None


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
    return safe_string(value)


def _normalise_response_mode(response_mode: str | None) -> str:
    value = _safe_string(response_mode).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    if value == "slow":
        return "deep"
    return "balanced"


def _coerce_bool(value: Any, default: bool = False) -> bool:
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


def _build_fallback_session_id(message: Any = None) -> str:
    suffix = uuid.uuid4().hex[:12]
    message_hint = _safe_string(message)[:24].replace(" ", "-")
    if message_hint:
        return f"orchestrator-{message_hint}-{suffix}"
    return f"orchestrator-{suffix}"


def _extract_attr(obj: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if obj is None:
            continue

        if isinstance(obj, dict) and name in obj:
            value = obj.get(name)
            if value is not None:
                return value

        value = getattr(obj, name, None)
        if value is not None:
            return value

    return default


def _merge_dicts(
    base: dict[str, Any] | None,
    overlay: dict[str, Any] | None,
) -> dict[str, Any]:
    merged: dict[str, Any] = dict(base or {})
    for key, value in (overlay or {}).items():
        merged[key] = value
    return merged


def _detect_assistant_surface(user_context: dict[str, Any] | None) -> str:
    if not isinstance(user_context, dict):
        return "standalone"

    explicit = _safe_string(user_context.get("assistant_surface")).lower()
    if explicit in {"standalone", "os_embedded"}:
        return explicit

    assistant_type = _safe_string(user_context.get("assistant_type")).lower()

    if assistant_type in {
        "os",
        "embedded",
        "care_os",
        "indicare_os",
        "young_people_os",
        "home_os",
        "quality_os",
        "ofsted_os",
        "manager_os",
    }:
        return "os_embedded"

    if assistant_type.endswith("_os"):
        return "os_embedded"

    scope_type = _safe_string(user_context.get("scope_type")).lower()
    if scope_type in {"young_person", "child", "home", "quality"}:
        return "os_embedded"

    scope = user_context.get("scope")
    if isinstance(scope, dict):
        nested_scope = _safe_string(scope.get("scope_type") or scope.get("scope")).lower()
        if nested_scope in {"young_person", "child", "home", "quality"}:
            return "os_embedded"
    elif _safe_string(scope).lower() in {"young_person", "child", "home", "quality"}:
        return "os_embedded"

    if user_context.get("evidence_index") or user_context.get("sources"):
        return "os_embedded"

    if user_context.get("report_snapshot"):
        return "os_embedded"

    return "standalone"


def _detect_evidence_grounding(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    explicit = user_context.get("requires_evidence_grounding")
    if isinstance(explicit, bool):
        return explicit

    if user_context.get("evidence_index"):
        return True

    if user_context.get("sources"):
        return True

    if user_context.get("report_snapshot"):
        return True

    if user_context.get("scope_type"):
        return True

    return _detect_assistant_surface(user_context) == "os_embedded"


def _trim_history(
    history: list[dict[str, Any]] | None,
    selected_mode: str,
) -> list[dict[str, str]]:
    if not history:
        return []

    if selected_mode == "quick":
        limit = 3
        max_chars = 3000
    elif selected_mode == "deep":
        limit = 8
        max_chars = 8000
    else:
        limit = 5
        max_chars = 5000

    safe_history = normalise_safe_history(
        history,
        max_items=20,
        max_chars=max_chars,
    )

    trimmed = safe_history[-limit:]

    if trimmed and _safe_string(trimmed[-1].get("role")).lower() == "user":
        trimmed = trimmed[:-1]

    cleaned: list[dict[str, str]] = []

    for item in trimmed:
        if not isinstance(item, dict):
            continue

        role_name = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("content") or item.get("message"))

        if role_name not in {"user", "assistant"}:
            continue

        if not content:
            continue

        if contains_prompt_injection_attempt(content):
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

        record_type = item.get("record_type") or item.get("type")
        record_id = item.get("record_id") or item.get("id")
        citation_ref = item.get("citation_ref") or item.get("citation_format")

        if not citation_ref and record_type and record_id:
            citation_ref = f"[{record_type}:{record_id}]"

        source = {
            "type": item.get("type"),
            "source_type": item.get("source_type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
            "record_type": record_type,
            "record_id": record_id,
            "citation_ref": citation_ref,
            "summary": item.get("summary"),
            "title": item.get("title"),
            "description": item.get("description"),
            "date": item.get("date") or item.get("event_at") or item.get("updated_at"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
            "is_record_source": bool(item.get("is_record_source")),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in [
                "type",
                "source_type",
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

        record_type = item.get("record_type") or item.get("type")
        record_id = item.get("record_id") or item.get("id")
        citation_ref = item.get("citation_ref") or item.get("citation_format")

        if not citation_ref and record_type and record_id:
            citation_ref = f"[{record_type}:{record_id}]"

        entry = {
            "citation_ref": citation_ref,
            "record_type": record_type,
            "record_id": record_id,
            "label": item.get("label"),
            "title": item.get("title"),
            "section": item.get("section"),
            "excerpt": item.get("excerpt"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "date": item.get("date") or item.get("event_at") or item.get("updated_at"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
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

    candidates = (
        user_context.get("evidence_index"),
        (user_context.get("context") or {}).get("evidence_index")
        if isinstance(user_context.get("context"), dict)
        else None,
        (user_context.get("runtime") or {}).get("evidence_index")
        if isinstance(user_context.get("runtime"), dict)
        else None,
    )

    for candidate in candidates:
        if isinstance(candidate, list):
            return _normalise_evidence_index(candidate)

    return []


def _extract_sources_from_context(user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(user_context, dict):
        return []

    candidates = (
        user_context.get("sources"),
        (user_context.get("context") or {}).get("sources")
        if isinstance(user_context.get("context"), dict)
        else None,
        (user_context.get("runtime") or {}).get("sources")
        if isinstance(user_context.get("runtime"), dict)
        else None,
    )

    for candidate in candidates:
        if isinstance(candidate, list):
            return _normalise_sources(candidate)

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

        if line.upper().startswith("SUGGESTED ACTIONS"):
            continue

        if line.startswith("•"):
            line = line.lstrip("•").strip()

        if line.startswith("-"):
            line = line.lstrip("-").strip()

        if line.startswith("*"):
            line = line.lstrip("*").strip()

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

    reg45_requested = _coerce_bool(user_context.get("reg45_requested"))
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
    sources: list[dict[str, Any]] | None = None,
    selected_mode: str = "balanced",
    user_id: Any | None = None,
    user_context: dict[str, Any] | None = None,
    response_plan: ResponsePlan | None = None,
    assistant_surface: str = "standalone",
    requires_evidence_grounding: bool = False,
    trimmed_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    if runtime is None:
        return {}

    evidence_index = evidence_index or []
    sources = sources or []
    user_context = user_context or {}
    trimmed_history = trimmed_history or []

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
        "classification_signals": getattr(runtime, "classification_signals", None),
        "suggested_actions": _extract_suggested_actions(runtime),
        "regulation_basis": regulation_payload or [],
        "response_mode": selected_mode,
        "assistant_surface": assistant_surface,
        "requires_evidence_grounding": requires_evidence_grounding,
        "evidence_items_loaded": len(evidence_index),
        "evidence_preview": evidence_index[:10],
        "source_count": len(sources),
        "source_preview": sources[:10],
        "history_items_loaded": len(trimmed_history),
        "user_id": user_id,
        "scope": scope or None,
        "scope_type": scope_type or None,
        "assistant_type": assistant_type or None,
        "report_type": report_type or None,
        "has_internal_evidence": bool(evidence_index or sources),
        "reg45_requested": _coerce_bool(user_context.get("reg45_requested")),
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

    if response_plan is not None:
        payload["response_plan"] = {
            "stance": response_plan.response_stance,
            "mode": response_plan.selected_mode,
            "use_memory": response_plan.should_use_memory,
            "use_retrieval": response_plan.should_use_retrieval,
            "use_reflection": response_plan.should_use_reflection,
            "use_supervision": response_plan.should_use_supervision,
            "use_leadership_lens": response_plan.should_use_leadership_lens,
            "use_inspection_lens": response_plan.should_use_inspection_lens,
            "use_ri_lens": response_plan.should_use_ri_lens,
            "use_therapeutic_lens": response_plan.should_use_therapeutic_lens,
            "guidance_enabled": response_plan.should_use_guidance_search,
            "must_lead_with_safety": response_plan.must_lead_with_safety,
            "must_preserve_source_facts": response_plan.must_preserve_source_facts,
            "fact_vs_inference": response_plan.should_distinguish_fact_from_inference,
            "brief": response_plan.should_be_brief,
            "assistant_surface": response_plan.assistant_surface,
            "requires_evidence_grounding": response_plan.requires_evidence_grounding,
            "reasons": response_plan.reasons,
        }

        payload["model"] = {
            "name": response_plan.model_plan.model,
            "temperature": response_plan.model_plan.temperature,
            "max_tokens": response_plan.model_plan.max_tokens,
        }

        payload["guidance"] = {
            "enabled": response_plan.guidance_plan.enabled,
            "reason": response_plan.guidance_plan.reason,
            "query": response_plan.guidance_plan.search_query,
        }

    return {key: value for key, value in payload.items() if value not in (None, "", [])}


def _append_regulation_context(
    system_prompt: str,
    regulation_context_block: str,
) -> str:
    if not regulation_context_block:
        return system_prompt

    return (
        f"{system_prompt}\n\n"
        "============================================================\n"
        "REGULATION AND STANDARDS CONTEXT\n\n"
        f"{regulation_context_block}"
    ).strip()


def _append_orchestrator_evidence_guard(
    system_prompt: str,
    *,
    evidence_index: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    assistant_surface: str,
    requires_evidence_grounding: bool,
) -> str:
    guard = (
        "ORCHESTRATOR EVIDENCE GUARD\n\n"
        "Use the evidence index and source list as supplied.\n"
        "Do not invent citations, record IDs, record dates, or source titles.\n"
        "Use exact citation_ref values where they exist.\n"
        "If a record_type and record_id are visible but citation_ref is missing, use [record_type:record_id].\n"
        "If evidence is missing or unclear, say what is not visible.\n"
        "Do not treat internal knowledge or regulation guidance as evidence that something happened to a child.\n"
        f"Assistant surface: {assistant_surface}.\n"
        f"Requires evidence grounding: {requires_evidence_grounding}.\n"
        f"Evidence index items available: {len(evidence_index)}.\n"
        f"Sources available: {len(sources)}."
    )

    if requires_evidence_grounding and not evidence_index and not sources:
        guard += (
            "\nNo structured OS evidence is visible. For record-specific questions, "
            "state that the scoped evidence is not visible and avoid guessing."
        )

    return (
        f"{system_prompt}\n\n"
        "============================================================\n"
        f"{guard}"
    ).strip()


def build_orchestrator_result(req: OrchestratorRequest) -> OrchestratorResult:
    selected_mode = _normalise_response_mode(req.speed)
    trimmed_history = _trim_history(req.history, selected_mode)
    trimmed_document_text = _trim_document_text(req.document_text, selected_mode)

    assistant_surface = _detect_assistant_surface(req.user_context)
    requires_evidence_grounding = _detect_evidence_grounding(req.user_context)

    logger.info(
        "Orchestrator starting session_id=%s response_mode=%s history=%s has_document=%s user_id=%s surface=%s evidence_grounding=%s",
        req.session_id,
        selected_mode,
        len(trimmed_history),
        bool(trimmed_document_text),
        req.user_id,
        assistant_surface,
        requires_evidence_grounding,
    )

    enriched_user_context = dict(req.user_context or {})
    enriched_user_context.setdefault("assistant_surface", assistant_surface)
    enriched_user_context.setdefault("requires_evidence_grounding", requires_evidence_grounding)

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
            user_context=enriched_user_context,
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

    inferred_overrides = _infer_output_overrides(req.message, enriched_user_context)

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
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    runtime.response_plan = response_plan
    runtime.assistant_surface = assistant_surface
    runtime.requires_evidence_grounding = requires_evidence_grounding

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

    system_prompt = _append_regulation_context(system_prompt, regulation_context_block)

    runtime_sources = _normalise_sources(getattr(runtime, "sources_used", []))
    context_sources = _extract_sources_from_context(enriched_user_context)
    sources = _normalise_sources(runtime_sources + context_sources)

    runtime_evidence = _normalise_evidence_index(getattr(runtime, "evidence_index", []))
    context_evidence = _extract_evidence_index(enriched_user_context)
    evidence_index = _normalise_evidence_index(runtime_evidence + context_evidence)

    system_prompt = _append_orchestrator_evidence_guard(
        system_prompt,
        evidence_index=evidence_index,
        sources=sources,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    runtime_payload = _serialise_runtime(
        runtime,
        regulation_payload=regulation_payload,
        evidence_index=evidence_index,
        sources=sources,
        selected_mode=selected_mode,
        user_id=req.user_id,
        user_context=enriched_user_context,
        response_plan=response_plan,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
        trimmed_history=trimmed_history,
    )

    if evidence_index:
        runtime_payload["evidence_index"] = evidence_index

    if sources:
        runtime_payload["sources"] = sources

    runtime_payload["source_count"] = len(sources)
    runtime_payload["history_items_loaded"] = len(trimmed_history)
    runtime_payload["document_attached"] = bool(trimmed_document_text)
    runtime_payload["regulation_refs_count"] = len(regulation_payload)
    runtime_payload["has_internal_evidence"] = _has_internal_evidence(enriched_user_context)

    messages = _build_messages(
        system_prompt=system_prompt,
        user_message=user_message,
        history=trimmed_history,
    )

    logger.info(
        (
            "Orchestrator built session_id=%s surface=%s evidence_grounding=%s "
            "mode=%s task_type=%s output_type=%s safeguarding=%s urgency=%s "
            "response_mode=%s stance=%s guidance_enabled=%s guidance_reason=%s "
            "model=%s temp=%s max_tokens=%s memory=%s retrieval=%s reflection=%s "
            "supervision=%s leadership=%s regulation_refs=%s sources=%s evidence=%s "
            "history=%s user_id=%s"
        ),
        req.session_id,
        assistant_surface,
        requires_evidence_grounding,
        mode,
        task_type,
        output_type,
        safeguarding_level,
        urgency,
        response_plan.selected_mode,
        response_plan.response_stance,
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
        len(trimmed_history),
        req.user_id,
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
    Backwards-compatible shim for older and newer callers.

    Supports:
    - build_assistant_prompt(conn, user_id=..., message=..., scope=..., ...)
    - build_assistant_prompt(request_obj, ...)
    - build_assistant_prompt(message=..., session_id=..., ...)
    """

    request_obj = None

    if args:
        first_arg = args[0]
        if not hasattr(first_arg, "cursor"):
            request_obj = first_arg

    message = kwargs.pop("message", None)
    session_id = kwargs.pop("session_id", None)
    history = kwargs.pop("history", None)
    role = kwargs.pop("role", "residential care staff")
    document_text = kwargs.pop("document_text", None)
    document_name = kwargs.pop("document_name", None)
    ld_lens = kwargs.pop("ld_lens", False)
    training_mode = kwargs.pop("training_mode", False)
    speed = kwargs.pop("speed", None) or kwargs.pop("response_mode", "balanced")
    user_context = kwargs.pop("user_context", None) or {}
    user_id = kwargs.pop("user_id", None)
    scope = kwargs.pop("scope", None)
    assistant_type = kwargs.pop("assistant_type", None)

    if request_obj is not None:
        if message is None:
            message = _extract_attr(
                request_obj,
                "message",
                "query",
                "prompt",
                "text",
                default=None,
            )

        if session_id is None:
            session_id = _extract_attr(
                request_obj,
                "session_id",
                "sessionId",
                "chat_session_id",
                "conversation_id",
                "conversationId",
                "thread_id",
                "threadId",
                "id",
                default=None,
            )

        if history is None:
            history = _extract_attr(request_obj, "history", "messages", default=None)

        if role == "residential care staff":
            role = _extract_attr(request_obj, "role", "user_role", default=role)

        if document_text is None:
            document_text = _extract_attr(
                request_obj,
                "document_text",
                "documentText",
                default=None,
            )

        if document_name is None:
            document_name = _extract_attr(
                request_obj,
                "document_name",
                "documentName",
                default=None,
            )

        if ld_lens is False:
            ld_lens = _coerce_bool(
                _extract_attr(request_obj, "ld_lens", "ldLens", default=ld_lens)
            )

        if training_mode is False:
            training_mode = _coerce_bool(
                _extract_attr(
                    request_obj,
                    "training_mode",
                    "trainingMode",
                    default=training_mode,
                )
            )

        if speed == "balanced":
            speed = _extract_attr(
                request_obj,
                "speed",
                "response_mode",
                "responseMode",
                default=speed,
            )

        request_user_context = _extract_attr(
            request_obj,
            "user_context",
            "context",
            "runtime",
            default=None,
        )

        if isinstance(request_user_context, dict):
            user_context = _merge_dicts(request_user_context, user_context)

        if user_id is None:
            user_id = _extract_attr(request_obj, "user_id", "userId", default=None)

        if scope is None:
            scope = _extract_attr(
                request_obj,
                "scope",
                "scope_type",
                "scopeType",
                default=None,
            )

    if message is None:
        raise TypeError("build_assistant_prompt() missing required argument: 'message'")

    if contains_prompt_injection_attempt(message):
        raise ValueError("Prompt injection attempt detected.")

    if session_id is None:
        session_id = _build_fallback_session_id(message)
        logger.warning(
            "build_assistant_prompt called without session_id; generated fallback session_id=%s",
            session_id,
        )

    merged_user_context = dict(user_context)

    if user_id is not None and "user_id" not in merged_user_context:
        merged_user_context["user_id"] = user_id

    if scope is not None and "scope" not in merged_user_context:
        merged_user_context["scope"] = scope

    if assistant_type is not None and "assistant_type" not in merged_user_context:
        merged_user_context["assistant_type"] = assistant_type

    assistant_surface = _detect_assistant_surface(merged_user_context)
    requires_evidence_grounding = _detect_evidence_grounding(merged_user_context)

    merged_user_context.setdefault("assistant_surface", assistant_surface)
    merged_user_context.setdefault("requires_evidence_grounding", requires_evidence_grounding)

    if kwargs:
        merged_user_context.setdefault("_orchestrator_extra_kwargs", {})
        merged_user_context["_orchestrator_extra_kwargs"].update(kwargs)

        for key, value in kwargs.items():
            if key not in merged_user_context:
                merged_user_context[key] = value

    result = build_orchestrator_result(
        OrchestratorRequest(
            message=message,
            session_id=session_id,
            history=history or [],
            role=role,
            document_text=document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=speed,
            user_context=merged_user_context,
            user_id=user_id,
        )
    )

    context_payload = dict(merged_user_context)

    if result.sources:
        context_payload["sources"] = result.sources

    if result.runtime_payload.get("evidence_index"):
        context_payload["evidence_index"] = result.runtime_payload.get("evidence_index")

    return {
        "prompt": message,
        "context": context_payload,
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