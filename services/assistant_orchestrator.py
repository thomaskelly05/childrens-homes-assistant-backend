from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from services.assistant_context_service import build_assistant_context


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = str(young_person.get("preferred_name") or "").strip()
    first_name = str(young_person.get("first_name") or "").strip()
    full_name = " ".join(
        str(part).strip()
        for part in [young_person.get("first_name"), young_person.get("last_name")]
        if str(part or "").strip()
    ).strip()

    return preferred or first_name or full_name or "the young person"


def _json_safe(value: Any):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _compact_item(item: dict[str, Any], allowed_keys: list[str]) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    return {
        key: item.get(key)
        for key in allowed_keys
        if item.get(key) not in (None, "", [], {})
    }


def _compact_list(
    items: list[dict[str, Any]] | None,
    allowed_keys: list[str],
    limit: int,
) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    return [
        _compact_item(item, allowed_keys)
        for item in items[:limit]
        if isinstance(item, dict)
    ]


def _build_global_summary(context: dict[str, Any]) -> str:
    tasks = context.get("tasks") or []
    manager_updates = context.get("manager_updates") or []
    handover = context.get("handover") or []
    chronology = context.get("chronology") or []

    lines = [
        "Global assistant context loaded.",
        f"- Home ID: {context.get('home_id')}",
        f"- Open/recent tasks loaded: {len(tasks)}",
        f"- Recent manager updates loaded: {len(manager_updates)}",
        f"- Recent handovers loaded: {len(handover)}",
        f"- Recent chronology events loaded: {len(chronology)}",
    ]
    return "\n".join(lines)


def _build_young_person_summary(context: dict[str, Any]) -> str:
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
    ]

    lines.append(
        f"- Current formulation available: {'yes' if identity.get('current_formulation') else 'no'}"
    )
    lines.append(
        f"- Communication profile available: {'yes' if identity.get('communication_profile') else 'no'}"
    )

    return "\n".join(lines)


def _build_compact_context(context: dict[str, Any]) -> dict[str, Any]:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type") or "global"

    if scope_type != "young_person":
        return {
            "scope": scope,
            "home_id": context.get("home_id"),
            "tasks": _compact_list(
                context.get("tasks"),
                ["id", "title", "status", "due_date", "priority", "young_person_id"],
                8,
            ),
            "manager_updates": _compact_list(
                context.get("manager_updates"),
                ["id", "title", "summary", "created_at"],
                5,
            ),
            "handover": _compact_list(
                context.get("handover"),
                ["id", "title", "summary", "created_at"],
                5,
            ),
            "chronology": _compact_list(
                context.get("chronology"),
                ["id", "title", "summary", "event_datetime", "category"],
                8,
            ),
        }

    young_person = context.get("young_person") or {}
    identity = context.get("identity") or {}
    active_work = context.get("active_work") or {}
    recent_records = context.get("recent_records") or {}

    return {
        "scope": scope,
        "young_person": _compact_item(
            young_person,
            [
                "id",
                "home_id",
                "first_name",
                "last_name",
                "preferred_name",
                "placement_status",
                "summary_risk_level",
                "date_of_birth",
                "admission_date",
            ],
        ),
        "identity": {
            "communication_profile": _compact_item(
                identity.get("communication_profile") or {},
                ["communication_style", "what_helps", "sensory_needs", "distress_indicators"],
            ),
            "education_profile": _compact_item(
                identity.get("education_profile") or {},
                ["school_name", "education_status", "year_group"],
            ),
            "health_profile": _compact_item(
                identity.get("health_profile") or {},
                ["allergies", "diagnoses", "medication_summary", "mental_health_summary"],
            ),
            "identity_profile": _compact_item(
                identity.get("identity_profile") or {},
                ["interests", "strengths_summary", "identity_notes"],
            ),
            "legal_status": _compact_item(
                identity.get("legal_status") or {},
                ["legal_status", "local_authority", "delegated_authority_notes"],
            ),
            "current_formulation": _compact_item(
                identity.get("current_formulation") or {},
                ["title", "summary", "updated_at"],
            ),
            "active_alerts": _compact_list(
                identity.get("active_alerts"),
                ["id", "title", "description", "severity", "updated_at"],
                6,
            ),
        },
        "active_work": {
            "support_plans": _compact_list(
                active_work.get("support_plans"),
                ["id", "title", "summary", "approval_status", "review_date", "updated_at"],
                6,
            ),
            "risk_assessments": _compact_list(
                active_work.get("risk_assessments"),
                ["id", "title", "category", "concern_summary", "severity", "review_date", "updated_at"],
                6,
            ),
            "appointments": _compact_list(
                active_work.get("appointments"),
                ["id", "title", "appointment_type", "appointment_date", "status", "location", "professional_name"],
                6,
            ),
            "compliance_items": _compact_list(
                active_work.get("compliance_items"),
                ["id", "title", "status", "approval_status", "due_date", "compliance_type"],
                8,
            ),
            "tasks": _compact_list(
                active_work.get("tasks"),
                ["id", "title", "status", "priority", "due_date"],
                8,
            ),
        },
        "recent_records": {
            "daily_notes": _compact_list(
                recent_records.get("daily_notes"),
                ["id", "note_date", "shift_type", "mood", "presentation", "young_person_voice", "updated_at"],
                4,
            ),
            "incidents": _compact_list(
                recent_records.get("incidents"),
                ["id", "incident_datetime", "incident_type", "severity", "description", "outcome", "updated_at"],
                4,
            ),
            "health_records": _compact_list(
                recent_records.get("health_records"),
                ["id", "event_datetime", "title", "summary", "outcome"],
                3,
            ),
            "education_records": _compact_list(
                recent_records.get("education_records"),
                ["id", "record_date", "title", "summary"],
                3,
            ),
            "family_contact_records": _compact_list(
                recent_records.get("family_contact_records"),
                ["id", "contact_datetime", "title", "summary", "outcome"],
                3,
            ),
            "keywork_sessions": _compact_list(
                recent_records.get("keywork_sessions"),
                ["id", "session_date", "title", "summary", "child_voice"],
                3,
            ),
            "missing_episodes": _compact_list(
                recent_records.get("missing_episodes"),
                ["id", "start_datetime", "end_datetime", "summary", "outcome"],
                3,
            ),
            "safeguarding_records": _compact_list(
                recent_records.get("safeguarding_records"),
                ["id", "concern_datetime", "title", "summary", "status"],
                3,
            ),
            "achievements": _compact_list(
                recent_records.get("achievements"),
                ["id", "achievement_date", "title", "summary"],
                3,
            ),
            "chronology": _compact_list(
                recent_records.get("chronology"),
                ["id", "event_datetime", "title", "summary", "category", "subcategory", "significance"],
                8,
            ),
        },
    }


def _build_prompt(
    *,
    message: str,
    context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
) -> str:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type")

    if scope_type == "young_person":
        summary = _build_young_person_summary(context)
    else:
        summary = _build_global_summary(context)

    history_lines: list[str] = []
    for item in history or []:
        role = str(item.get("role") or "").strip()
        content = str(item.get("message") or "").strip()
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    history_text = "\n".join(history_lines[-8:]).strip()

    compact_context = _build_compact_context(context)
    compact_context_json = json.dumps(
        compact_context,
        ensure_ascii=False,
        default=_json_safe,
        indent=2,
    )

    return f"""
You are the IndiCare assistant.

Use the context below to answer clearly, safely and practically for a children's home setting.
Keep the answer grounded in the available data.
If information is missing, say so clearly.
If the user wants drafting, provide a structured draft.
If the request relates to a young person, remain child-centred, trauma-informed and safeguarding-aware.

Important:
- Do not repeat the raw context back unless useful.
- Prefer concise, practical answers.
- Use chronology, plans, risks, incidents, daily notes and tasks only where relevant.
- If the user asks for a time period summary, focus on patterns, risks, protective factors, progress, incidents, child voice, professional involvement, and actions.

=== CONTEXT SUMMARY ===
{summary}

=== COMPACT STRUCTURED CONTEXT ===
{compact_context_json}

=== RECENT CONVERSATION HISTORY ===
{history_text or "No prior history."}

=== USER MESSAGE ===
{message}
""".strip()


def build_assistant_prompt(
    conn,
    *,
    user_id: int,
    message: str,
    scope: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    context = build_assistant_context(
        conn,
        user_id=user_id,
        scope=scope,
    )

    prompt = _build_prompt(
        message=message,
        context=context,
        history=history,
    )

    return {
        "prompt": prompt,
        "context": _build_compact_context(context),
        "runtime": {
            "scope_type": (context.get("scope") or {}).get("scope_type"),
            "home_id": (context.get("scope") or {}).get("home_id"),
            "young_person_id": (context.get("scope") or {}).get("young_person_id"),
        },
    }
