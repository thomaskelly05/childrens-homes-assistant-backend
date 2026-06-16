from __future__ import annotations

"""
assistant/prompt_router.py

Production-ready routing layer for IndiCare Assistant.

Purpose:
- Detect the active assistant mode
- Distinguish standalone assistant from OS-embedded assistant
- Apply safeguarding-first routing
- Apply evidence-grounding rules
- Select response formatter mode
- Select prompt emphasis/lenses
- Produce a clean routing payload for orchestration, prompting, logging and UI

This file does not call OpenAI directly.
It prepares routing intelligence for the assistant stack.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.modes import AssistantMode, detect_mode, resolve_mode
from assistant.response_formatter import infer_response_mode


# =====================================================
# TYPES
# =====================================================

AssistantSurface = str
ResponseMode = str


OS_ASSISTANT_TYPES = {
    "os",
    "embedded",
    "care_os",
    "indicare_os",
    "young_people_os",
    "home_os",
    "quality_os",
    "ofsted_os",
    "manager_os",
}


SAFEGUARDING_LEVELS = {
    "normal",
    "watchful",
    "heightened",
    "urgent",
}


ROLE_PROFILES = {
    "staff",
    "senior",
    "manager",
    "provider",
    "quality",
    "unknown",
}


@dataclass
class PromptRoute:
    assistant_surface: AssistantSurface = "standalone"
    assistant_type: str = "standalone"
    mode: AssistantMode = "guidance"
    response_mode: ResponseMode = "default"
    role_profile: str = "staff"
    safeguarding_level: str = "normal"
    requires_evidence_grounding: bool = False
    should_use_knowledge_library: bool = True
    should_use_record_evidence: bool = False
    should_use_web_guidance: bool = False
    should_use_manager_lens: bool = False
    should_use_ofsted_lens: bool = False
    should_use_ri_lens: bool = False
    should_use_reflective_lens: bool = False
    should_use_recording_lens: bool = False
    should_lead_with_safety: bool = False
    should_warn_if_no_evidence: bool = False
    user_intent_summary: str = ""
    routing_reasons: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


# =====================================================
# HELPERS
# =====================================================

def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _normalise_text(value: Any) -> str:
    return f" {_safe_string(value).lower()} "


def _contains_any(text: str, terms: set[str] | list[str]) -> bool:
    normalised = _normalise_text(text)
    return any(term.lower() in normalised for term in terms)


def _normalise_safeguarding_level(value: Any) -> str:
    level = _safe_string(value).lower()
    if level in SAFEGUARDING_LEVELS:
        return level
    return "normal"


def _normalise_role_profile(value: Any) -> str:
    role = _safe_string(value).lower()

    if not role:
        return "staff"

    if any(term in role for term in {"responsible individual", "provider", "director", "operations", "head of care", "governance"}):
        return "provider"

    if any(term in role for term in {"registered manager", "manager", "deputy", "home manager"}):
        return "manager"

    if any(term in role for term in {"quality", "compliance", "qa", "auditor", "inspection"}):
        return "quality"

    if any(term in role for term in {"senior", "team leader", "shift lead", "shift leader"}):
        return "senior"

    return "staff"


def _assistant_surface_from_context(user_context: dict[str, Any] | None) -> tuple[str, str, list[str]]:
    reasons: list[str] = []

    if not isinstance(user_context, dict):
        return "standalone", "standalone", ["no_context_defaults_to_standalone"]

    explicit_surface = _safe_string(user_context.get("assistant_surface")).lower()
    assistant_type = _safe_string(user_context.get("assistant_type")).lower()

    if explicit_surface in {"standalone", "os_embedded"}:
        reasons.append(f"explicit_surface_{explicit_surface}")
        return explicit_surface, assistant_type or explicit_surface, reasons

    if assistant_type in OS_ASSISTANT_TYPES or assistant_type.endswith("_os"):
        reasons.append(f"assistant_type_{assistant_type}_means_os_embedded")
        return "os_embedded", assistant_type, reasons

    scope_type = _safe_string(user_context.get("scope_type")).lower()
    if scope_type in {"young_person", "child", "home", "quality"}:
        reasons.append(f"scope_type_{scope_type}_means_os_embedded")
        return "os_embedded", assistant_type or "os_embedded", reasons

    scope = user_context.get("scope")
    if isinstance(scope, dict):
        nested_scope = _safe_string(scope.get("scope_type") or scope.get("scope")).lower()
        if nested_scope in {"young_person", "child", "home", "quality"}:
            reasons.append(f"nested_scope_{nested_scope}_means_os_embedded")
            return "os_embedded", assistant_type or "os_embedded", reasons
    elif _safe_string(scope).lower() in {"young_person", "child", "home", "quality"}:
        reasons.append("string_scope_means_os_embedded")
        return "os_embedded", assistant_type or "os_embedded", reasons

    if user_context.get("evidence_index") or user_context.get("sources"):
        reasons.append("evidence_or_sources_present_means_os_embedded")
        return "os_embedded", assistant_type or "os_embedded", reasons

    if user_context.get("report_snapshot"):
        reasons.append("report_snapshot_present_means_os_embedded")
        return "os_embedded", assistant_type or "os_embedded", reasons

    return "standalone", assistant_type or "standalone", ["default_standalone"]


def _has_visible_evidence(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    if user_context.get("evidence_index"):
        return True

    if user_context.get("sources"):
        return True

    if user_context.get("report_snapshot"):
        return True

    evidence_keys = {
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
    }

    return any(key in user_context for key in evidence_keys)


def _requires_evidence_grounding(
    *,
    assistant_surface: str,
    user_context: dict[str, Any] | None,
) -> bool:
    if isinstance(user_context, dict):
        explicit = user_context.get("requires_evidence_grounding")
        if isinstance(explicit, bool):
            return explicit

    return assistant_surface == "os_embedded"


# =====================================================
# INTENT KEYWORDS
# =====================================================

KNOWLEDGE_LIBRARY_TERMS = {
    "what is",
    "explain",
    "definition",
    "law",
    "regulation",
    "regulations",
    "quality standard",
    "quality standards",
    "ofsted",
    "sccif",
    "guidance",
    "statutory",
    "how often",
    "timescale",
    "requirement",
}

RECORD_SPECIFIC_TERMS = {
    "record",
    "records",
    "whole record",
    "whole scoped record",
    "across all records",
    "full summary",
    "full overview",
    "chronology",
    "timeline",
    "risk view",
    "what does the record show",
    "what do the records show",
    "what is missing",
    "evidence index",
    "inspection pack",
    "report snapshot",
}

OFSTED_TERMS = {
    "ofsted",
    "inspection",
    "inspector",
    "sccif",
    "inspection-readiness",
    "Inspection evidence preparation",
    "what would ofsted",
    "what would an inspector",
    "evidence pack",
    "audit trail",
    "triangulation",
}

RI_TERMS = {
    "responsible individual",
    "ri",
    "provider",
    "governance",
    "assurance",
    "quality assurance",
    "provider oversight",
    "service drift",
    "cross-home",
    "all homes",
}

MANAGER_TERMS = {
    "manager",
    "registered manager",
    "deputy",
    "oversight",
    "audit",
    "review",
    "action plan",
    "monitoring",
    "follow up",
    "follow-up",
}

REFLECTIVE_TERMS = {
    "reflect",
    "reflection",
    "supervision",
    "debrief",
    "what could i have done",
    "what can i learn",
    "mentor",
    "support me",
    "help me think",
}

RECORDING_TERMS = {
    "write",
    "rewrite",
    "record",
    "recording",
    "daily note",
    "daily log",
    "handover",
    "incident",
    "chronology",
    "professional wording",
    "reword",
}

SAFEGUARDING_TERMS = {
    "safeguarding",
    "missing",
    "missing from care",
    "self-harm",
    "suicidal",
    "overdose",
    "assault",
    "violence",
    "exploitation",
    "cse",
    "criminal exploitation",
    "county lines",
    "allegation",
    "disclosure",
    "injury",
    "bruise",
    "lado",
    "police",
    "child protection",
    "immediate danger",
    "unsafe now",
}


# =====================================================
# ROUTING
# =====================================================

def build_prompt_route(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
    selected_mode: str | None = None,
    output_type: str | None = None,
    task_type: str | None = None,
    user_role: str | None = None,
) -> PromptRoute:
    """
    Main production routing function.

    This should be called before building the final prompt if you want
    a single clean route object to feed into:
    - prompt building
    - response formatting
    - explainability
    - UI mode badges
    - audit logs
    """
    user_context = user_context or {}
    runtime = runtime or {}
    reasons: list[str] = []

    text = _safe_string(message)
    lowered = text.lower()

    assistant_surface, assistant_type, surface_reasons = _assistant_surface_from_context(user_context)
    reasons.extend(surface_reasons)

    safeguarding_level = _normalise_safeguarding_level(
        runtime.get("safeguarding_level")
        or user_context.get("safeguarding_level")
    )

    role_profile = _normalise_role_profile(
        user_role
        or runtime.get("user_role_profile")
        or user_context.get("role")
        or user_context.get("user_role")
        or user_context.get("job_title")
    )

    requires_evidence = _requires_evidence_grounding(
        assistant_surface=assistant_surface,
        user_context=user_context,
    )

    visible_evidence = _has_visible_evidence(user_context)

    detected_mode = detect_mode(text)

    resolved = resolve_mode(
        message=text,
        user_context=user_context,
        runtime={
            **runtime,
            "safeguarding_level": safeguarding_level,
        },
    )

    mode: AssistantMode = resolved or detected_mode

    if selected_mode:
        selected_mode_value = _safe_string(selected_mode).lower()
        if selected_mode_value in {
            "guidance",
            "recording",
            "rewrite",
            "handover",
            "incident",
            "chronology",
            "safeguarding",
            "reflection",
            "mentor",
            "supervision",
            "manager_review",
            "ofsted_view",
            "reg45",
            "planning",
            "support_plan",
            "knowledge",
        }:
            mode = selected_mode_value  # type: ignore[assignment]
            reasons.append(f"explicit_selected_mode_{selected_mode_value}")

    if safeguarding_level in {"heightened", "urgent"}:
        mode = "safeguarding"
        reasons.append(f"safeguarding_level_{safeguarding_level}_overrides_mode")

    if _safe_string(user_context.get("report_type")).lower() in {"reg45", "quality_of_care"}:
        mode = "reg45"
        reasons.append("report_type_reg45_overrides_mode")

    if _safe_bool(user_context.get("reg45_requested")):
        mode = "reg45"
        reasons.append("reg45_requested_overrides_mode")

    should_use_record_evidence = requires_evidence and visible_evidence
    should_warn_if_no_evidence = requires_evidence and not visible_evidence and _contains_any(lowered, RECORD_SPECIFIC_TERMS)

    should_use_knowledge_library = True
    should_use_web_guidance = _contains_any(lowered, KNOWLEDGE_LIBRARY_TERMS | OFSTED_TERMS) and assistant_surface == "standalone"

    if assistant_surface == "os_embedded" and _contains_any(lowered, RECORD_SPECIFIC_TERMS):
        should_use_web_guidance = False
        reasons.append("os_record_specific_request_prefers_scoped_evidence_over_web_guidance")

    should_use_ofsted_lens = (
        mode in {"ofsted_view", "reg45", "manager_review"}
        or _contains_any(lowered, OFSTED_TERMS)
    )

    should_use_ri_lens = (
        role_profile == "provider"
        or _contains_any(lowered, RI_TERMS)
    )

    should_use_manager_lens = (
        role_profile in {"manager", "provider", "quality"}
        or mode in {"manager_review", "ofsted_view", "reg45"}
        or _contains_any(lowered, MANAGER_TERMS)
    )

    should_use_reflective_lens = (
        mode in {"reflection", "mentor", "supervision"}
        or _contains_any(lowered, REFLECTIVE_TERMS)
    )

    should_use_recording_lens = (
        mode in {"recording", "rewrite", "handover", "incident", "chronology", "safeguarding"}
        or _contains_any(lowered, RECORDING_TERMS)
    )

    should_lead_with_safety = (
        safeguarding_level in {"heightened", "urgent"}
        or _contains_any(lowered, SAFEGUARDING_TERMS)
    )

    response_mode = infer_response_mode(
        output_type=_safe_string(output_type or runtime.get("output_type")),
        task_type=_safe_string(task_type or runtime.get("task_type")),
        mode=mode,
        message=text,
    )

    if mode == "safeguarding":
        response_mode = "safeguarding"
    elif mode == "reg45":
        response_mode = "reg45"
    elif mode == "ofsted_view":
        response_mode = "ofsted_view"
    elif mode == "manager_review":
        response_mode = "manager_review"
    elif mode == "recording":
        response_mode = "record"
    elif mode == "rewrite":
        response_mode = "rewrite"
    elif mode == "handover":
        response_mode = "handover"
    elif mode == "incident":
        response_mode = "incident"
    elif mode == "chronology":
        response_mode = "chronology"
    elif mode in {"reflection", "mentor", "supervision"}:
        response_mode = "reflection"
    elif mode in {"planning", "support_plan"}:
        response_mode = "support_plan"
    elif mode == "knowledge":
        response_mode = "default"

    if should_warn_if_no_evidence:
        reasons.append("requires_evidence_but_no_visible_evidence")

    if should_lead_with_safety:
        reasons.append("safety_first_route_enabled")

    if should_use_ofsted_lens:
        reasons.append("ofsted_lens_enabled")

    if should_use_manager_lens:
        reasons.append("manager_lens_enabled")

    if should_use_ri_lens:
        reasons.append("ri_lens_enabled")

    if should_use_reflective_lens:
        reasons.append("reflective_lens_enabled")

    if should_use_recording_lens:
        reasons.append("recording_lens_enabled")

    user_intent_summary = _summarise_intent(
        mode=mode,
        response_mode=response_mode,
        assistant_surface=assistant_surface,
        safeguarding_level=safeguarding_level,
        requires_evidence=requires_evidence,
        visible_evidence=visible_evidence,
    )

    return PromptRoute(
        assistant_surface=assistant_surface,
        assistant_type=assistant_type or assistant_surface,
        mode=mode,
        response_mode=response_mode,
        role_profile=role_profile,
        safeguarding_level=safeguarding_level,
        requires_evidence_grounding=requires_evidence,
        should_use_knowledge_library=should_use_knowledge_library,
        should_use_record_evidence=should_use_record_evidence,
        should_use_web_guidance=should_use_web_guidance,
        should_use_manager_lens=should_use_manager_lens,
        should_use_ofsted_lens=should_use_ofsted_lens,
        should_use_ri_lens=should_use_ri_lens,
        should_use_reflective_lens=should_use_reflective_lens,
        should_use_recording_lens=should_use_recording_lens,
        should_lead_with_safety=should_lead_with_safety,
        should_warn_if_no_evidence=should_warn_if_no_evidence,
        user_intent_summary=user_intent_summary,
        routing_reasons=_dedupe(reasons),
        metadata={
            "detected_mode": detected_mode,
            "resolved_mode": resolved,
            "visible_evidence": visible_evidence,
            "selected_mode": selected_mode,
            "output_type": output_type or runtime.get("output_type"),
            "task_type": task_type or runtime.get("task_type"),
        },
    )


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        text = _safe_string(item)
        if not text:
            continue
        if text in seen:
            continue
        seen.add(text)
        result.append(text)

    return result


def _summarise_intent(
    *,
    mode: str,
    response_mode: str,
    assistant_surface: str,
    safeguarding_level: str,
    requires_evidence: bool,
    visible_evidence: bool,
) -> str:
    parts = [
        f"mode={mode}",
        f"response_mode={response_mode}",
        f"surface={assistant_surface}",
        f"safeguarding={safeguarding_level}",
    ]

    if requires_evidence:
        parts.append("evidence_grounded=yes")
        parts.append(f"visible_evidence={'yes' if visible_evidence else 'no'}")
    else:
        parts.append("evidence_grounded=no")

    return "; ".join(parts)


# =====================================================
# PROMPT BLOCK GENERATION
# =====================================================

def build_route_prompt_block(route: PromptRoute) -> str:
    """
    Converts the route into a prompt block that can be appended to the system prompt.
    """
    lines = [
        "PROMPT ROUTER CONTEXT",
        "",
        f"Assistant surface: {route.assistant_surface}",
        f"Assistant type: {route.assistant_type}",
        f"Resolved mode: {route.mode}",
        f"Response formatter mode: {route.response_mode}",
        f"Role profile: {route.role_profile}",
        f"Safeguarding level: {route.safeguarding_level}",
        f"Requires evidence grounding: {route.requires_evidence_grounding}",
        f"Use record evidence: {route.should_use_record_evidence}",
        f"Use knowledge library: {route.should_use_knowledge_library}",
        f"Use web guidance: {route.should_use_web_guidance}",
        f"Lead with safety: {route.should_lead_with_safety}",
    ]

    enabled_lenses: list[str] = []
    if route.should_use_manager_lens:
        enabled_lenses.append("manager")
    if route.should_use_ofsted_lens:
        enabled_lenses.append("ofsted")
    if route.should_use_ri_lens:
        enabled_lenses.append("responsible_individual")
    if route.should_use_reflective_lens:
        enabled_lenses.append("reflective")
    if route.should_use_recording_lens:
        enabled_lenses.append("recording")

    if enabled_lenses:
        lines.append(f"Enabled lenses: {', '.join(enabled_lenses)}")

    if route.should_warn_if_no_evidence:
        lines.extend(
            [
                "",
                "Evidence warning:",
                "The user appears to be asking for a record-based answer, but no scoped evidence is visible. Do not infer facts. State the limitation clearly and offer a safe structure or general practice guidance.",
            ]
        )

    if route.routing_reasons:
        lines.extend(["", "Routing reasons:"])
        for reason in route.routing_reasons:
            lines.append(f"• {reason}")

    return "\n".join(lines).strip()


def route_to_metadata(route: PromptRoute) -> dict[str, Any]:
    """
    JSON-safe metadata for runtime/explainability.
    """
    return {
        "assistant_surface": route.assistant_surface,
        "assistant_type": route.assistant_type,
        "mode": route.mode,
        "response_mode": route.response_mode,
        "role_profile": route.role_profile,
        "safeguarding_level": route.safeguarding_level,
        "requires_evidence_grounding": route.requires_evidence_grounding,
        "should_use_knowledge_library": route.should_use_knowledge_library,
        "should_use_record_evidence": route.should_use_record_evidence,
        "should_use_web_guidance": route.should_use_web_guidance,
        "should_use_manager_lens": route.should_use_manager_lens,
        "should_use_ofsted_lens": route.should_use_ofsted_lens,
        "should_use_ri_lens": route.should_use_ri_lens,
        "should_use_reflective_lens": route.should_use_reflective_lens,
        "should_use_recording_lens": route.should_use_recording_lens,
        "should_lead_with_safety": route.should_lead_with_safety,
        "should_warn_if_no_evidence": route.should_warn_if_no_evidence,
        "user_intent_summary": route.user_intent_summary,
        "routing_reasons": route.routing_reasons,
        "metadata": route.metadata,
    }


# =====================================================
# CONVENIENCE WRAPPER
# =====================================================

def route_prompt(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
    selected_mode: str | None = None,
    output_type: str | None = None,
    task_type: str | None = None,
    user_role: str | None = None,
) -> dict[str, Any]:
    """
    Convenience function for callers that prefer dicts.
    """
    route = build_prompt_route(
        message=message,
        user_context=user_context,
        runtime=runtime,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=user_role,
    )

    return {
        "route": route_to_metadata(route),
        "prompt_block": build_route_prompt_block(route),
        "response_mode": route.response_mode,
        "mode": route.mode,
    }
