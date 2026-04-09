from __future__ import annotations

from typing import Any

from services.assistant_context_service import build_assistant_context


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = _safe_string(young_person.get("preferred_name"))
    first_name = _safe_string(young_person.get("first_name"))
    full_name = " ".join(
        part for part in [
            _safe_string(young_person.get("first_name")),
            _safe_string(young_person.get("last_name")),
        ]
        if part
    ).strip()

    return preferred or first_name or full_name or "the young person"


def _normalise_scope(scope: dict[str, Any] | None) -> dict[str, Any]:
    scope = scope or {}
    return {
        "scope_type": _safe_string(scope.get("scope_type") or scope.get("scope") or "global").lower() or "global",
        "home_id": scope.get("home_id"),
        "young_person_id": scope.get("young_person_id"),
        "record_type": _safe_string(scope.get("record_type")),
        "record_id": scope.get("record_id"),
    }


def _normalise_ui_context(context: dict[str, Any] | None) -> dict[str, Any]:
    context = context or {}
    return {
        "current_view": _safe_string(context.get("current_view")),
        "young_person_name": _safe_string(context.get("young_person_name")),
        "placement_status": _safe_string(context.get("placement_status")),
        "summary_risk_level": _safe_string(context.get("summary_risk_level")),
        "composer_record_type": _safe_string(context.get("composer_record_type")),
        "home_name": _safe_string(context.get("home_name")),
        "shift_context": _safe_string(context.get("shift_context")),
    }


def _build_global_summary(context: dict[str, Any], ui_context: dict[str, Any]) -> str:
    tasks = context.get("tasks") or []
    manager_updates = context.get("manager_updates") or []
    handover = context.get("handover") or []
    chronology = context.get("chronology") or []
    scope = context.get("scope") or {}

    lines = [
        "Global assistant context loaded.",
        f"- Home ID: {scope.get('home_id')}",
        f"- Open/recent tasks loaded: {len(tasks)}",
        f"- Recent manager updates loaded: {len(manager_updates)}",
        f"- Recent handovers loaded: {len(handover)}",
        f"- Recent chronology events loaded: {len(chronology)}",
    ]

    if ui_context.get("home_name"):
        lines.append(f"- Home name from UI context: {ui_context['home_name']}")
    if ui_context.get("shift_context"):
        lines.append(f"- Shift context from UI: {ui_context['shift_context']}")

    return "\n".join(lines)


def _build_young_person_summary(context: dict[str, Any], ui_context: dict[str, Any]) -> str:
    young_person = context.get("young_person") or {}
    identity = context.get("identity") or {}
    active_work = context.get("active_work") or {}
    recent_records = context.get("recent_records") or {}

    display_name = _safe_name(young_person)

    alerts = identity.get("active_alerts") or []
    plans = active_work.get("support_plans") or []
    risks = active_work.get("risk_assessments") or []
    tasks = active_work.get("tasks") or []
    incidents = recent_records.get("incidents") or []
    daily_notes = recent_records.get("daily_notes") or []
    chronology = recent_records.get("chronology") or []
    appointments = recent_records.get("appointments") or []
    keywork = recent_records.get("keywork") or []

    lines = [
        f"Young person assistant context loaded for {display_name}.",
        f"- Young person ID: {young_person.get('id')}",
        f"- Home ID: {young_person.get('home_id')}",
        f"- Placement status: {young_person.get('placement_status')}",
        f"- Summary risk level: {young_person.get('summary_risk_level')}",
        f"- Active alerts: {len(alerts)}",
        f"- Active support plans: {len(plans)}",
        f"- Active/current risk records: {len(risks)}",
        f"- Current tasks: {len(tasks)}",
        f"- Recent incidents loaded: {len(incidents)}",
        f"- Recent daily notes loaded: {len(daily_notes)}",
        f"- Recent chronology loaded: {len(chronology)}",
        f"- Recent appointments loaded: {len(appointments)}",
        f"- Recent keywork records loaded: {len(keywork)}",
    ]

    current_formulation = identity.get("current_formulation")
    lines.append(
        "- Current formulation available: yes"
        if current_formulation
        else "- Current formulation available: no"
    )

    communication_profile = identity.get("communication_profile")
    lines.append(
        "- Communication profile available: yes"
        if communication_profile
        else "- Communication profile available: no"
    )

    if ui_context.get("current_view"):
        lines.append(f"- Current workspace view: {ui_context['current_view']}")
    if ui_context.get("composer_record_type"):
        lines.append(f"- Open composer record type: {ui_context['composer_record_type']}")
    if ui_context.get("young_person_name"):
        lines.append(f"- UI context young person name: {ui_context['young_person_name']}")
    if ui_context.get("placement_status"):
        lines.append(f"- UI placement status: {ui_context['placement_status']}")
    if ui_context.get("summary_risk_level"):
        lines.append(f"- UI summary risk level: {ui_context['summary_risk_level']}")
    if ui_context.get("home_name"):
        lines.append(f"- UI home name: {ui_context['home_name']}")
    if ui_context.get("shift_context"):
        lines.append(f"- UI shift context: {ui_context['shift_context']}")

    return "\n".join(lines)


def _build_scope_instruction(scope: dict[str, Any], ui_context: dict[str, Any]) -> str:
    scope_type = scope.get("scope_type") or "global"

    if scope_type == "young_person":
        current_view = ui_context.get("current_view")
        composer_record_type = ui_context.get("composer_record_type")
        record_type = scope.get("record_type")
        record_id = scope.get("record_id")

        lines = [
            "This request is scoped to a single young person workspace.",
            "Answer as a child-centred, safeguarding-aware, trauma-informed assistant for residential care.",
            "Be practical and specific.",
            "Where appropriate, help with:",
            "- daily recording",
            "- incident analysis and wording",
            "- risk formulation and guidance",
            "- handover summaries",
            "- chronology summaries",
            "- manager review preparation",
            "- Ofsted/evidence-ready summaries",
        ]

        if current_view:
            lines.append(f"Current workspace view: {current_view}")
        if composer_record_type:
            lines.append(f"Open composer type: {composer_record_type}")
        if record_type:
            lines.append(f"Scoped record type: {record_type}")
        if record_id is not None:
            lines.append(f"Scoped record id: {record_id}")

        lines.extend(
            [
                "Prefer concise, useful answers over generic advice.",
                "If drafting is requested, produce paste-ready professional wording.",
                "If summarising is requested, identify what matters now, what adults need to know, and what needs doing next.",
            ]
        )

        return "\n".join(lines)

    return "\n".join(
        [
            "This request is using the global assistant scope.",
            "Support the user clearly and practically for children's home operations, documentation, safeguarding, reflection, management, and professional communication.",
        ]
    )


def _build_history_text(history: list[dict[str, Any]] | None) -> str:
    history_lines: list[str] = []

    for item in history or []:
        role = _safe_string(item.get("role"))
        content = _safe_string(item.get("message"))
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    return "\n".join(history_lines[-12:]).strip()


def _build_prompt(
    *,
    message: str,
    context: dict[str, Any],
    ui_context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
) -> str:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type")

    if scope_type == "young_person":
        summary = _build_young_person_summary(context, ui_context)
    else:
        summary = _build_global_summary(context, ui_context)

    scope_instruction = _build_scope_instruction(scope, ui_context)
    history_text = _build_history_text(history)

    return f"""
You are the IndiCare assistant.

Use the context below to answer clearly, safely and practically for a children's home setting.
Keep the answer grounded in the available data.
If there are gaps in the context, say so.
If the request appears to need drafting, produce a structured draft.
If the request relates to a young person, stay child-centred, trauma-informed and safeguarding-aware.

=== SCOPE INSTRUCTION ===
{scope_instruction}

=== CONTEXT SUMMARY ===
{summary}

=== UI CONTEXT ===
{ui_context}

=== STRUCTURED CONTEXT ===
{context}

=== CONVERSATION HISTORY ===
{history_text}

=== USER MESSAGE ===
{message}
""".strip()


def _build_runtime_payload(context: dict[str, Any], ui_context: dict[str, Any]) -> dict[str, Any]:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type") or "global"

    suggested_actions: list[str] = []

    if scope_type == "young_person":
        suggested_actions.extend(
            [
                "Draft handover",
                "Summarise current risks",
                "Pull child voice themes",
                "Summarise recent incidents",
            ]
        )

        current_view = ui_context.get("current_view", "").lower()

        if current_view == "handover":
            suggested_actions.append("Write next shift handover")
        elif current_view == "risk":
            suggested_actions.append("Review risk wording")
        elif current_view == "incidents":
            suggested_actions.append("Summarise incident patterns")
        elif current_view == "manager":
            suggested_actions.append("Highlight manager priorities")
        elif current_view == "evidence":
            suggested_actions.append("Pull Ofsted-ready evidence points")

    deduped_actions: list[str] = []
    seen: set[str] = set()
    for action in suggested_actions:
        key = action.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped_actions.append(action.strip())

    return {
        "scope_type": scope_type,
        "home_id": scope.get("home_id"),
        "young_person_id": scope.get("young_person_id"),
        "record_type": scope.get("record_type"),
        "record_id": scope.get("record_id"),
        "current_view": ui_context.get("current_view"),
        "composer_record_type": ui_context.get("composer_record_type"),
        "suggested_actions": deduped_actions,
    }


def _build_frontend_context(context: dict[str, Any], ui_context: dict[str, Any]) -> dict[str, Any]:
    scope = context.get("scope") or {}
    young_person = context.get("young_person") or {}

    return {
        "scope_type": scope.get("scope_type") or "global",
        "young_person": {
            "id": young_person.get("id") or scope.get("young_person_id"),
            "name": ui_context.get("young_person_name") or _safe_name(young_person),
            "placement_status": ui_context.get("placement_status") or young_person.get("placement_status"),
            "summary_risk_level": ui_context.get("summary_risk_level") or young_person.get("summary_risk_level"),
        }
        if (scope.get("scope_type") or "global") == "young_person"
        else {},
        "workspace": {
            "current_view": ui_context.get("current_view"),
            "composer_record_type": ui_context.get("composer_record_type"),
            "home_name": ui_context.get("home_name"),
            "shift_context": ui_context.get("shift_context"),
        },
    }


def build_assistant_prompt(
    conn,
    *,
    user_id: int,
    message: str,
    scope: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalised_scope = _normalise_scope(scope)
    ui_context = _normalise_ui_context(context)

    assistant_context = build_assistant_context(
        conn,
        user_id=user_id,
        scope=normalised_scope,
    )

    assistant_context["scope"] = {
        **(assistant_context.get("scope") or {}),
        **normalised_scope,
    }

    prompt = _build_prompt(
        message=message,
        context=assistant_context,
        ui_context=ui_context,
        history=history,
    )

    runtime = _build_runtime_payload(assistant_context, ui_context)
    frontend_context = _build_frontend_context(assistant_context, ui_context)

    return {
        "prompt": prompt,
        "context": frontend_context,
        "runtime": runtime,
    }
