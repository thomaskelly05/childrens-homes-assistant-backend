from __future__ import annotations

from typing import Any

from schemas.orb import OrbContext, OrbModeDecision, OrbSelectedMode
from services.orb_persona_policy import (
    CARE_ASSISTANT_TONE,
    GENERAL_ASSISTANT_TONE,
    INSPECTOR_TONE,
    PRODUCTIVITY_TONE,
    WEB_RESEARCH_TONE,
)


INSPECTOR_ROLES = {
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
    "provider_admin",
    "provider",
    "responsible_individual",
    "ri",
    "registered_manager",
    "manager",
    "deputy_manager",
}

CARE_RECORD_TERMS = {
    "jamie",
    "young person",
    "child",
    "resident",
    "chronology",
    "daily note",
    "daily log",
    "incident",
    "safeguarding",
    "missing episode",
    "restraint",
    "keywork",
    "family time",
    "placement",
    "risk assessment",
    "care plan",
    "lac review",
    "handover",
    "last 7 days",
    "last seven days",
    "records",
    "recording",
    "what should i record",
}

VOICE_RECORDING_TERMS = {
    "dictate",
    "voice note",
    "record this",
    "create a daily note",
    "create daily note",
    "create an incident",
    "create incident",
    "create safeguarding",
    "write a record",
    "start recording",
    "transcribe",
}

INSPECTION_TERMS = {
    "ofsted",
    "sccif",
    "reg 44",
    "reg44",
    "reg 45",
    "reg45",
    "quality standards",
    "children's homes regulations",
    "inspection",
    "evidence gap",
    "challenge",
    "readiness",
    "management oversight",
    "responsible individual",
    "ri ",
}

CURRENT_TERMS = {
    "weather",
    "forecast",
    "temperature",
    "sport",
    "sports",
    "score",
    "fixture",
    "played last week",
    "newcastle",
    "news",
    "current",
    "today's",
    "today",
    "latest",
    "price",
    "prices",
    "stock",
    "schedule",
    "timetable",
}

PRODUCTIVITY_TERMS = {
    "email",
    "write an email",
    "draft an email",
    "plan my day",
    "to-do",
    "todo",
    "agenda",
    "summarise this",
    "rewrite",
    "professional",
    "calculate",
    "calculation",
    "maths",
    "math",
}

REPORT_TERMS = {
    "report",
    "reg 45 section",
    "reg45 section",
    "lac review draft",
    "handover summary",
    "quality of care",
}

SAFEGUARDING_TERMS = {
    "safeguarding",
    "incident",
    "allegation",
    "missing",
    "self-harm",
    "self harm",
    "restraint",
    "harm",
    "risk",
    "dsl",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _norm(value: Any) -> str:
    return _text(value).lower().replace("-", "_")


def _role(current_user: dict[str, Any]) -> str:
    role = _norm(current_user.get("role")).replace(" ", "_")
    return role or "viewer"


def _workspace(context: OrbContext | None) -> str:
    if not context:
        return ""
    return _norm(context.workspace or context.assistant_context.get("current_workspace_type") or context.route)


def _contains_any(message: str, terms: set[str]) -> bool:
    return any(term in message for term in terms)


def _has_child_context(context: OrbContext | None) -> bool:
    if not context:
        return False
    return bool(
        context.selected_young_person_id
        or context.current_child
        or context.selected_record_id
        or context.selected_record_type
    )


def _is_standalone_context(context: OrbContext | None) -> bool:
    if not context:
        return False
    workspace = _workspace(context)
    return workspace in {"standalone_orb", "standalone_assistant", "assistant"} or _text(context.route).startswith("/assistant")


def _assistant_mode_for(brain: str, message: str, context: OrbContext | None) -> str:
    workspace = _workspace(context)
    if _is_standalone_context(context) and brain in {"care_brain", "inspector_brain", "report_writer_brain", "voice_recording_brain"}:
        return "standalone"
    if brain == "inspector_brain":
        if "reg 44" in message or "reg44" in message:
            return "reg44_action_plan"
        if "reg 45" in message or "reg45" in message:
            return "reg45_writer"
        if "safeguarding" in message:
            return "safeguarding_review"
        if "ofsted" in message or "sccif" in message or "inspection" in message:
            return "ofsted_evidence_pack"
        return "regulatory_readiness"

    if brain == "report_writer_brain":
        if "lac" in message:
            return "lac_review_writer"
        if "reg 45" in message or "reg45" in message:
            return "reg45_writer"
        if "reg 44" in message or "reg44" in message:
            return "reg44_action_plan"
        return "report_writer"

    if brain == "voice_recording_brain":
        if "incident" in message:
            return "safeguarding_review" if "safeguarding" in message else "embedded"
        if "handover" in message:
            return "handover"
        return "shift_operations" if "shift" in message or "daily note" in message else "embedded"

    if brain == "care_brain":
        if "handover" in message or "handover" in workspace:
            return "handover"
        if "shift" in message or "shift" in workspace:
            return "shift_operations"
        if "chronology" in message or "chronology" in workspace:
            return "chronology_qna"
        if "report" in message or "summary" in message:
            return "report_writer"
        if "safeguarding" in message:
            return "safeguarding_review"
        return "embedded" if workspace and workspace != "standalone_assistant" else "standalone"

    if brain == "web_research_brain":
        return "web_research"
    if brain == "productivity_brain":
        return "productivity"
    return "general"


def route_orb_intent(
    *,
    message: str | None,
    current_user: dict[str, Any],
    selected_mode: OrbSelectedMode = "auto",
    context: OrbContext | None = None,
) -> OrbModeDecision:
    """Route an Orb turn across care, inspection, current-facts and everyday assistant brains."""

    lower = _text(message).lower()
    role = _role(current_user)
    workspace = _workspace(context)
    safety_flags: list[str] = []
    if _contains_any(lower, SAFEGUARDING_TERMS):
        safety_flags.append("safeguarding_sensitive")
    if "inspection" in workspace or "regulatory" in workspace or "ofsted" in workspace:
        safety_flags.append("inspection_context")

    standalone_context = _is_standalone_context(context)
    has_child_context = False if standalone_context else _has_child_context(context)
    asks_inspection = _contains_any(lower, INSPECTION_TERMS)
    asks_current = _contains_any(lower, CURRENT_TERMS)
    asks_productivity = _contains_any(lower, PRODUCTIVITY_TERMS)
    asks_report = _contains_any(lower, REPORT_TERMS)
    asks_voice_recording = _contains_any(lower, VOICE_RECORDING_TERMS)
    asks_care = not standalone_context and (has_child_context or _contains_any(lower, CARE_RECORD_TERMS) or workspace in {
        "shift_operations",
        "chronology",
        "young_person",
        "handover",
        "safeguarding",
    })

    brain = "general_assistant_brain"
    reason = "The turn is an everyday assistant question and does not need IndiCare record retrieval."

    if selected_mode == "inspector":
        brain = "inspector_brain"
        reason = "Inspector mode was selected by the user."
    elif selected_mode == "care":
        brain = "care_brain"
        reason = "Care mode was selected by the user."
    elif selected_mode == "general":
        brain = "general_assistant_brain"
        reason = "General assistant mode was selected by the user."
    elif asks_inspection and role in INSPECTOR_ROLES:
        brain = "inspector_brain"
        reason = "The question asks for regulatory, SCCIF, Ofsted or oversight challenge and the role can access that view."
    elif asks_inspection:
        brain = "care_brain"
        reason = "The question asks about inspection, but this role is routed through care-safe guidance rather than Inspector Brain."
        safety_flags.append("inspector_permission_limited")
    elif asks_voice_recording:
        brain = "voice_recording_brain"
        reason = "The turn asks Orb to capture or draft a care record by voice."
    elif asks_report and asks_care:
        brain = "report_writer_brain"
        reason = "The turn asks for a care/report draft and must use citable IndiCare evidence."
    elif asks_current:
        brain = "web_research_brain"
        reason = "The turn asks for current or live information, so Orb must use configured external tools/search."
    elif asks_productivity:
        brain = "productivity_brain"
        reason = "The turn asks for writing, planning, summarising or calculation support."
    elif asks_care:
        brain = "care_brain"
        reason = "The turn is operational care support or asks about records in the permitted IndiCare scope."

    if standalone_context and brain in {"care_brain", "inspector_brain", "report_writer_brain", "voice_recording_brain"}:
        brain = "general_assistant_brain"
        reason = "Standalone ORB can support general care practice but cannot retrieve IndiCare OS records."
        safety_flags.append("standalone_no_os_access")

    care_scope_required = brain in {"care_brain", "inspector_brain", "report_writer_brain", "voice_recording_brain"}
    requires_citations = care_scope_required
    requires_external_tool = brain == "web_research_brain"
    allow_general_knowledge = brain in {"general_assistant_brain", "web_research_brain", "productivity_brain"}

    tool_categories_by_brain = {
        "care_brain": ["care_records", "citations", "evidence_gaps"],
        "inspector_brain": ["care_records", "citations", "sccif", "quality_standards", "inspection_challenge"],
        "report_writer_brain": ["care_records", "citations", "report_writer", "pending_draft"],
        "voice_recording_brain": ["care_records", "voice_recording", "pending_draft", "citations"],
        "web_research_brain": ["web_search", "weather", "sports", "news"],
        "productivity_brain": ["writing", "planning", "summarising", "calculations"],
        "general_assistant_brain": ["general_qna"],
    }

    return OrbModeDecision(
        brain=brain,  # type: ignore[arg-type]
        assistant_mode=_assistant_mode_for(brain, lower, context),
        reason=reason,
        tone={
            "inspector_brain": INSPECTOR_TONE,
            "web_research_brain": WEB_RESEARCH_TONE,
            "productivity_brain": PRODUCTIVITY_TONE,
            "general_assistant_brain": GENERAL_ASSISTANT_TONE,
        }.get(brain, CARE_ASSISTANT_TONE),
        safety_flags=safety_flags,
        requires_citations=requires_citations,
        requires_confirmation_before_write=care_scope_required,
        requires_external_tool=requires_external_tool,
        allow_general_knowledge=allow_general_knowledge,
        care_scope_required=care_scope_required,
        tool_categories=tool_categories_by_brain.get(brain, []),
        memory_updates={
            "current_child": context.current_child if context and context.current_child else None,
            "current_shift": context.current_shift if context and context.current_shift else None,
            "current_task": context.current_task if context and context.current_task else None,
        },
        selected_mode=selected_mode,
    )


def can_use_inspector_brain(current_user: dict[str, Any]) -> bool:
    return _role(current_user) in INSPECTOR_ROLES

