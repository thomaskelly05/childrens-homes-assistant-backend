from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from services.assistant_context_service import build_assistant_context


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = (young_person.get("preferred_name") or "").strip()
    first_name = (young_person.get("first_name") or "").strip()
    full_name = " ".join(
        part for part in [young_person.get("first_name"), young_person.get("last_name")] if part
    ).strip()

    return preferred or first_name or full_name or "the young person"


def _json_safe(value: Any):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _trim_list(value: Any, limit: int = 5) -> list[Any]:
    if not isinstance(value, list):
        return []
    return value[:limit]


def _pick_fields(item: Any, allowed: list[str]) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {}
    return {
        key: item.get(key)
        for key in allowed
        if item.get(key) not in (None, "", [], {})
    }


def _build_compact_global_context(context: dict[str, Any]) -> dict[str, Any]:
    tasks = _trim_list(context.get("tasks"), 8)
    manager_updates = _trim_list(context.get("manager_updates"), 5)
    handover = _trim_list(context.get("handover"), 5)
    chronology = _trim_list(context.get("chronology"), 8)

    return {
        "scope": context.get("scope") or {},
        "home_id": context.get("home_id"),
        "tasks": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "description",
                    "status",
                    "priority",
                    "due_date",
                    "young_person_id",
                    "created_at",
                ],
            )
            for item in tasks
        ],
        "manager_updates": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "message",
                    "status",
                    "created_at",
                ],
            )
            for item in manager_updates
        ],
        "handover": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "created_at",
                    "shift_type",
                ],
            )
            for item in handover
        ],
        "chronology": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "event_datetime",
                    "category",
                    "significance",
                    "young_person_id",
                ],
            )
            for item in chronology
        ],
    }


def _build_compact_young_person_context(context: dict[str, Any]) -> dict[str, Any]:
    young_person = context.get("young_person") or {}
    identity = context.get("identity") or {}
    active_work = context.get("active_work") or {}
    recent_records = context.get("recent_records") or {}

    return {
        "scope": context.get("scope") or {},
        "young_person": _pick_fields(
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
                "discharge_date",
                "archived",
                "created_at",
                "updated_at",
            ],
        ),
        "identity": {
            "communication_profile": _pick_fields(
                identity.get("communication_profile"),
                [
                    "communication_style",
                    "what_helps",
                    "triggers",
                    "updated_at",
                ],
            ),
            "education_profile": _pick_fields(
                identity.get("education_profile"),
                [
                    "school_name",
                    "education_status",
                    "year_group",
                    "support_summary",
                    "updated_at",
                ],
            ),
            "health_profile": _pick_fields(
                identity.get("health_profile"),
                [
                    "gp_name",
                    "allergies",
                    "diagnoses",
                    "mental_health_summary",
                    "medication_summary",
                    "updated_at",
                ],
            ),
            "identity_profile": _pick_fields(
                identity.get("identity_profile"),
                [
                    "interests",
                    "strengths_summary",
                    "cultural_identity",
                    "religion",
                    "updated_at",
                ],
            ),
            "legal_status": _pick_fields(
                identity.get("legal_status"),
                [
                    "legal_status",
                    "local_authority",
                    "social_worker_name",
                    "social_worker_email",
                    "updated_at",
                ],
            ),
            "current_formulation": _pick_fields(
                identity.get("current_formulation"),
                [
                    "summary",
                    "hypothesis",
                    "updated_at",
                ],
            ),
            "active_alerts": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "description",
                        "severity",
                        "is_active",
                        "updated_at",
                    ],
                )
                for item in _trim_list(identity.get("active_alerts"), 8)
            ],
        },
        "active_work": {
            "support_plans": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "summary",
                        "plan_type",
                        "approval_status",
                        "status",
                        "review_date",
                        "updated_at",
                    ],
                )
                for item in _trim_list(active_work.get("support_plans"), 6)
            ],
            "risk_assessments": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "category",
                        "concern_summary",
                        "severity",
                        "likelihood",
                        "approval_status",
                        "status",
                        "review_date",
                        "updated_at",
                    ],
                )
                for item in _trim_list(active_work.get("risk_assessments"), 6)
            ],
            "appointments": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "appointment_type",
                        "appointment_date",
                        "status",
                        "location",
                        "professional_name",
                        "follow_up_actions",
                    ],
                )
                for item in _trim_list(active_work.get("appointments"), 6)
            ],
            "compliance_items": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "compliance_type",
                        "due_date",
                        "status",
                        "approval_status",
                    ],
                )
                for item in _trim_list(active_work.get("compliance_items"), 8)
            ],
            "tasks": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "description",
                        "status",
                        "priority",
                        "due_date",
                        "created_at",
                    ],
                )
                for item in _trim_list(active_work.get("tasks"), 8)
            ],
        },
        "recent_records": {
            "daily_notes": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "note_date",
                        "shift_type",
                        "mood",
                        "presentation",
                        "young_person_voice",
                        "actions_required",
                        "created_at",
                        "updated_at",
                    ],
                )
                for item in _trim_list(recent_records.get("daily_notes"), 6)
            ],
            "incidents": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "incident_datetime",
                        "incident_type",
                        "severity",
                        "location",
                        "description",
                        "child_voice",
                        "outcome",
                        "created_at",
                        "updated_at",
                    ],
                )
                for item in _trim_list(recent_records.get("incidents"), 6)
            ],
            "health_records": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "event_datetime",
                        "title",
                        "summary",
                        "outcome",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("health_records"), 5)
            ],
            "education_records": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "record_date",
                        "title",
                        "summary",
                        "attendance",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("education_records"), 5)
            ],
            "family_contact_records": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "contact_datetime",
                        "contact_type",
                        "summary",
                        "outcome",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("family_contact_records"), 5)
            ],
            "keywork_sessions": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "session_date",
                        "title",
                        "summary",
                        "child_voice",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("keywork_sessions"), 5)
            ],
            "missing_episodes": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "start_datetime",
                        "end_datetime",
                        "summary",
                        "outcome",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("missing_episodes"), 5)
            ],
            "safeguarding_records": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "concern_datetime",
                        "title",
                        "summary",
                        "status",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("safeguarding_records"), 5)
            ],
            "achievements": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "achievement_date",
                        "title",
                        "summary",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("achievements"), 5)
            ],
            "chronology": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "summary",
                        "event_datetime",
                        "category",
                        "significance",
                        "created_at",
                    ],
                )
                for item in _trim_list(recent_records.get("chronology"), 10)
            ],
        },
    }


def _build_compact_context(context: dict[str, Any]) -> dict[str, Any]:
    scope = context.get("scope") or {}
    scope_type = (scope.get("scope_type") or "global").strip().lower()

    if scope_type == "young_person":
        return _build_compact_young_person_context(context)

    return _build_compact_global_context(context)


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

    current_formulation = identity.get("current_formulation")
    if current_formulation:
        lines.append("- Current formulation available: yes")
    else:
        lines.append("- Current formulation available: no")

    communication_profile = identity.get("communication_profile")
    if communication_profile:
        lines.append("- Communication profile available: yes")
    else:
        lines.append("- Communication profile available: no")

    return "\n".join(lines)


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

    history_text = "\n".join(history_lines[-12:]).strip()

    return f"""
You are the IndiCare assistant.

Use the context below to answer clearly, safely and practically for a children's home setting.
Keep the answer grounded in the available data.
If there are gaps in the context, say so.
If the request appears to need drafting, produce a structured draft.
If the request relates to a young person, stay child-centred, trauma-informed and safeguarding-aware.

=== CONTEXT SUMMARY ===
{summary}

=== STRUCTURED CONTEXT ===
{context}

=== CONVERSATION HISTORY ===
{history_text}

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

    compact_context = _build_compact_context(context)

    prompt = _build_prompt(
        message=message,
        context=context,
        history=history,
    )

    json_safe_context = json.loads(
        json.dumps(
            compact_context,
            ensure_ascii=False,
            default=_json_safe,
        )
    )

    return {
        "prompt": prompt,
        "context": json_safe_context,
        "runtime": {
            "scope_type": (context.get("scope") or {}).get("scope_type"),
            "home_id": (context.get("scope") or {}).get("home_id"),
            "young_person_id": (context.get("scope") or {}).get("young_person_id"),
        },
    }
