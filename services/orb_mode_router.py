from __future__ import annotations

from typing import Any

from auth.rbac import normalise_role
from schemas.orb import OrbContext, OrbModeDecision, OrbSelectedMode
from services.orb_persona_policy import CARE_ASSISTANT_TONE, INSPECTOR_TONE


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

CARE_OPERATION_KEYWORDS = {
    "start my shift",
    "handover",
    "daily note",
    "dictate",
    "observation",
    "what should i record",
    "actions overdue",
    "reminder",
    "chronology",
    "young person summary",
    "lac review",
}

INSPECTION_KEYWORDS = {
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

SAFEGUARDING_KEYWORDS = {
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


def _role(current_user: dict[str, Any]) -> str:
    return normalise_role(current_user.get("role"))


def _workspace(context: OrbContext | None) -> str:
    if not context:
        return ""
    return _text(context.workspace or context.assistant_context.get("current_workspace_type") or context.route).lower()


def _contains_any(message: str, terms: set[str]) -> bool:
    return any(term in message for term in terms)


def _assistant_mode_for(brain: str, message: str, context: OrbContext | None) -> str:
    workspace = _workspace(context)
    if brain == "inspector":
        if "reg 44" in message or "reg44" in message:
            return "reg44_action_plan"
        if "reg 45" in message or "reg45" in message:
            return "reg45_writer"
        if "safeguarding" in message:
            return "safeguarding_review"
        if "ofsted" in message or "sccif" in message or "inspection" in message:
            return "ofsted_evidence_pack"
        return "regulatory_readiness"

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


def route_orb_mode(
    *,
    message: str | None,
    current_user: dict[str, Any],
    selected_mode: OrbSelectedMode = "auto",
    context: OrbContext | None = None,
) -> OrbModeDecision:
    """Route Orb turns to care or inspection persona while preserving the shared assistant core."""

    lower = _text(message).lower()
    role = _role(current_user)
    workspace = _workspace(context)
    safety_flags: list[str] = []
    if _contains_any(lower, SAFEGUARDING_KEYWORDS):
        safety_flags.append("safeguarding_sensitive")
    if "inspection" in workspace or "regulatory" in workspace or "ofsted" in workspace:
        safety_flags.append("inspection_context")

    if selected_mode == "inspector":
        brain = "inspector"
        reason = "Inspector mode was selected by the user."
    elif selected_mode == "care":
        brain = "care_assistant"
        reason = "Care mode was selected by the user."
    elif _contains_any(lower, INSPECTION_KEYWORDS) and role in INSPECTOR_ROLES:
        brain = "inspector"
        reason = "The question asks for regulatory, SCCIF, Ofsted or oversight challenge and the role can access that view."
    elif workspace in {"regulatory", "ofsted-readiness", "management", "inspection"} and role in INSPECTOR_ROLES:
        brain = "inspector"
        reason = "The current workspace is inspection or management focused."
    else:
        brain = "care_assistant"
        reason = "The turn is operational care support or the role should receive practical care guidance."

    assistant_mode = _assistant_mode_for(brain, lower, context)
    return OrbModeDecision(
        brain=brain,  # type: ignore[arg-type]
        assistant_mode=assistant_mode,
        reason=reason,
        tone=INSPECTOR_TONE if brain == "inspector" else CARE_ASSISTANT_TONE,
        safety_flags=safety_flags,
        requires_citations=True,
        requires_confirmation_before_write=True,
        selected_mode=selected_mode,
    )


def can_use_inspector_brain(current_user: dict[str, Any]) -> bool:
    return _role(current_user) in INSPECTOR_ROLES

