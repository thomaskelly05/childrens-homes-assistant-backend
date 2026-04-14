from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Literal

from services.assistant_context_service import build_assistant_context

AssistantType = Literal["public", "young_people_os"]


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = (young_person.get("preferred_name") or "").strip()
    first_name = (young_person.get("first_name") or "").strip()
    full_name = " ".join(
        part
        for part in [young_person.get("first_name"), young_person.get("last_name")]
        if part
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


def _clean_ui_context(context: dict[str, Any] | None) -> dict[str, Any]:
    context = context or {}
    cleaned = {
        "current_view": context.get("current_view"),
        "current_section": context.get("current_section"),
        "young_person_name": context.get("young_person_name"),
        "placement_status": context.get("placement_status"),
        "summary_risk_level": context.get("summary_risk_level"),
        "composer_record_type": context.get("composer_record_type"),
        "home_name": context.get("home_name"),
        "shift_context": context.get("shift_context"),
        "record_type": context.get("record_type"),
        "record_id": context.get("record_id"),
    }
    return {k: v for k, v in cleaned.items() if v not in (None, "", [], {})}


def _normalise_scope_for_assistant(
    scope: dict[str, Any] | None,
    *,
    assistant_type: AssistantType,
) -> dict[str, Any]:
    raw_scope = scope or {}
    scope_type = str(raw_scope.get("scope_type") or "global").strip().lower()

    home_id = raw_scope.get("home_id")
    young_person_id = raw_scope.get("young_person_id")
    record_type = raw_scope.get("record_type")
    record_id = raw_scope.get("record_id")

    if assistant_type == "public":
        return {
            "scope_type": "global",
            "home_id": None,
            "young_person_id": None,
            "record_type": None,
            "record_id": None,
        }

    if scope_type not in {"global", "young_person"}:
        raise ValueError("Unsupported scope_type for young people assistant.")

    if scope_type == "young_person" and not young_person_id:
        raise ValueError("young_person_id is required for young_person scope.")

    if scope_type == "global":
        young_person_id = None

    return {
        "scope_type": scope_type,
        "home_id": home_id,
        "young_person_id": young_person_id,
        "record_type": record_type,
        "record_id": record_id,
    }


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    safe_history: list[dict[str, str]] = []

    for item in history or []:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or item.get("message") or "").strip()

        if role not in {"user", "assistant", "system"}:
            continue

        if not content:
            continue

        safe_history.append(
            {
                "role": role,
                "content": content[:3000],
            }
        )

    return safe_history[-12:]


def _build_compact_public_context(context: dict[str, Any]) -> dict[str, Any]:
    public_context = context.get("public_context") or {}

    return {
        "scope": context.get("scope") or {},
        "public_context": {
            "assistant_type": public_context.get("assistant_type", "public"),
            "os_data_available": bool(public_context.get("os_data_available", False)),
            "young_person_data_available": bool(
                public_context.get("young_person_data_available", False)
            ),
            "home_data_available": bool(public_context.get("home_data_available", False)),
        },
    }


def _build_compact_global_os_context(context: dict[str, Any]) -> dict[str, Any]:
    tasks = _trim_list(context.get("tasks"), 8)
    manager_updates = _trim_list(context.get("manager_updates"), 5)
    handover = _trim_list(context.get("handover"), 5)
    chronology = _trim_list(context.get("chronology"), 8)
    documents = _trim_list(context.get("documents"), 8)
    incidents = _trim_list(context.get("incidents"), 8)
    compliance_items = _trim_list(context.get("compliance_items"), 8)

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
        "documents": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "document_type",
                    "status",
                    "review_date",
                    "updated_at",
                ],
            )
            for item in documents
        ],
        "incidents": [
            _pick_fields(
                item,
                [
                    "id",
                    "incident_type",
                    "title",
                    "severity",
                    "incident_datetime",
                    "updated_at",
                ],
            )
            for item in incidents
        ],
        "compliance_items": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "status",
                    "due_date",
                    "severity",
                    "updated_at",
                ],
            )
            for item in compliance_items
        ],
    }


def _build_compact_young_person_context(context: dict[str, Any]) -> dict[str, Any]:
    young_person = context.get("young_person") or {}
    identity = context.get("identity") or {}
    active_work = context.get("active_work") or {}
    recent_records = context.get("recent_records") or {}
    scoped_record = context.get("scoped_record") or {}

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
                    "religion_or_faith",
                    "updated_at",
                ],
            ),
            "legal_status": _pick_fields(
                identity.get("legal_status"),
                [
                    "legal_status",
                    "order_type",
                    "order_details",
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
                        "attendance_status",
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
                        "return_datetime",
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
        "scoped_record": {
            "record_type": scoped_record.get("record_type"),
            "record_id": scoped_record.get("record_id"),
            "record": _pick_fields(
                scoped_record.get("record"),
                [
                    "id",
                    "title",
                    "status",
                    "summary",
                    "updated_at",
                    "created_at",
                ],
            ),
            "workflow_events": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "event_type",
                        "created_at",
                        "note",
                        "user_id",
                    ],
                )
                for item in _trim_list(scoped_record.get("workflow_events"), 10)
            ],
            "record_standard_links": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "standard_code",
                        "updated_at",
                    ],
                )
                for item in _trim_list(scoped_record.get("record_standard_links"), 10)
            ],
            "chronology_events": [
                _pick_fields(
                    item,
                    [
                        "id",
                        "title",
                        "summary",
                        "event_datetime",
                        "category",
                    ],
                )
                for item in _trim_list(scoped_record.get("chronology_events"), 10)
            ],
        },
    }


def _build_compact_context(
    context: dict[str, Any],
    *,
    assistant_type: AssistantType,
) -> dict[str, Any]:
    scope = context.get("scope") or {}
    scope_type = (scope.get("scope_type") or "global").strip().lower()

    if assistant_type == "public":
        return _build_compact_public_context(context)

    if scope_type == "young_person":
        return _build_compact_young_person_context(context)

    return _build_compact_global_os_context(context)


def _build_public_summary(context: dict[str, Any]) -> str:
    public_context = context.get("public_context") or {}

    lines = [
        "Public assistant context loaded.",
        f"- OS data available: {bool(public_context.get('os_data_available', False))}",
        f"- Young person data available: {bool(public_context.get('young_person_data_available', False))}",
        f"- Home data available: {bool(public_context.get('home_data_available', False))}",
    ]
    return "\n".join(lines)


def _build_global_os_summary(context: dict[str, Any]) -> str:
    tasks = context.get("tasks") or []
    manager_updates = context.get("manager_updates") or []
    handover = context.get("handover") or []
    chronology = context.get("chronology") or []
    incidents = context.get("incidents") or []
    compliance_items = context.get("compliance_items") or []

    lines = [
        "Young People OS global context loaded.",
        f"- Home ID: {context.get('home_id')}",
        f"- Open/recent tasks loaded: {len(tasks)}",
        f"- Recent manager updates loaded: {len(manager_updates)}",
        f"- Recent handovers loaded: {len(handover)}",
        f"- Recent chronology events loaded: {len(chronology)}",
        f"- Recent incidents loaded: {len(incidents)}",
        f"- Recent compliance items loaded: {len(compliance_items)}",
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
        f"- Current formulation available: {'yes' if identity.get('current_formulation') else 'no'}",
        f"- Communication profile available: {'yes' if identity.get('communication_profile') else 'no'}",
    ]

    return "\n".join(lines)


def _build_ui_summary(ui_context: dict[str, Any] | None) -> str:
    ui_context = ui_context or {}
    if not ui_context:
        return "No extra UI context supplied."

    lines: list[str] = ["UI context provided."]

    if ui_context.get("current_view"):
        lines.append(f"- Current view: {ui_context.get('current_view')}")
    if ui_context.get("current_section"):
        lines.append(f"- Current section: {ui_context.get('current_section')}")
    if ui_context.get("young_person_name"):
        lines.append(f"- Young person name hint: {ui_context.get('young_person_name')}")
    if ui_context.get("placement_status"):
        lines.append(f"- Placement status hint: {ui_context.get('placement_status')}")
    if ui_context.get("summary_risk_level"):
        lines.append(f"- Summary risk level hint: {ui_context.get('summary_risk_level')}")
    if ui_context.get("composer_record_type"):
        lines.append(f"- Composer record type: {ui_context.get('composer_record_type')}")
    if ui_context.get("home_name"):
        lines.append(f"- Home name hint: {ui_context.get('home_name')}")
    if ui_context.get("shift_context"):
        lines.append(f"- Shift context: {ui_context.get('shift_context')}")
    if ui_context.get("record_type"):
        lines.append(f"- Record type: {ui_context.get('record_type')}")
    if ui_context.get("record_id") is not None:
        lines.append(f"- Record ID: {ui_context.get('record_id')}")

    return "\n".join(lines)


def _build_prompt(
    *,
    assistant_type: AssistantType,
    message: str,
    context: dict[str, Any],
    ui_context: dict[str, Any] | None = None,
    history: list[dict[str, str]] | None = None,
) -> str:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type")

    if assistant_type == "public":
        summary = _build_public_summary(context)
        assistant_header = "You are the IndiCare public assistant."
        guardrail = (
            "You must stay strictly within public assistant context. "
            "Do not use, infer, expose, or reference any young person OS data, "
            "home operational data, or safeguarding records."
        )
    elif scope_type == "young_person":
        summary = _build_young_person_summary(context)
        assistant_header = "You are the IndiCare Young People OS assistant."
        guardrail = (
            "You must stay strictly within the scoped young person OS context. "
            "Do not answer with information about other young people, other homes, "
            "or any public assistant context."
        )
    else:
        summary = _build_global_os_summary(context)
        assistant_header = "You are the IndiCare Young People OS assistant."
        guardrail = (
            "You must stay strictly within the scoped Young People OS home context. "
            "Do not expose information outside the current authorised home scope, "
            "and do not use any public assistant context."
        )

    ui_summary = _build_ui_summary(ui_context)

    history_lines: list[str] = []
    for item in history or []:
        role = str(item.get("role") or "").strip()
        content = str(item.get("content") or "").strip()
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    history_text = "\n".join(history_lines).strip()

    return f"""
{assistant_header}

{guardrail}

Use the context below to answer clearly, safely and practically.
Keep the answer grounded in the available data.
If there are gaps in the context, say so.
If the request appears to need drafting, produce a structured draft.
If the request relates to a young person, stay child-centred, trauma-informed and safeguarding-aware.

=== CONTEXT SUMMARY ===
{summary}

=== UI CONTEXT SUMMARY ===
{ui_summary}

=== STRUCTURED CONTEXT ===
{context}

=== UI CONTEXT ===
{ui_context or {}}

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
    context: dict[str, Any] | None = None,
    assistant_type: AssistantType = "public",
) -> dict[str, Any]:
    normalised_scope = _normalise_scope_for_assistant(
        scope,
        assistant_type=assistant_type,
    )

    built_context = build_assistant_context(
        conn,
        user_id=user_id,
        scope=normalised_scope,
        assistant_type=assistant_type,
    )

    ui_context = _clean_ui_context(context)
    safe_history = _normalise_history(history)
    compact_context = _build_compact_context(
        built_context,
        assistant_type=assistant_type,
    )

    if ui_context:
        compact_context["ui_context"] = ui_context

    prompt = _build_prompt(
        assistant_type=assistant_type,
        message=str(message or "").strip(),
        context=built_context,
        ui_context=ui_context,
        history=safe_history,
    )

    json_safe_context = json.loads(
        json.dumps(
            compact_context,
            ensure_ascii=False,
            default=_json_safe,
        )
    )

    built_scope = built_context.get("scope") or {}

    return {
        "prompt": prompt,
        "context": json_safe_context,
        "runtime": {
            "assistant_type": assistant_type,
            "scope_type": built_scope.get("scope_type"),
            "home_id": built_scope.get("home_id"),
            "young_person_id": built_scope.get("young_person_id"),
            "record_type": built_scope.get("record_type"),
            "record_id": built_scope.get("record_id"),
            "current_view": ui_context.get("current_view"),
            "current_section": ui_context.get("current_section"),
            "young_person_name": ui_context.get("young_person_name"),
            "placement_status": ui_context.get("placement_status"),
            "summary_risk_level": ui_context.get("summary_risk_level"),
            "composer_record_type": ui_context.get("composer_record_type"),
            "home_name": ui_context.get("home_name"),
            "shift_context": ui_context.get("shift_context"),
            "history_items_used": len(safe_history),
        },
    }