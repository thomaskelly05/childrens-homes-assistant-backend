from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal

from services.assistant_context_service import build_assistant_context

AssistantType = Literal["public", "young_people_os", "home_os", "quality_os"]
ReportType = Literal["monthly", "reg45", "yearly"]


@dataclass(frozen=True)
class ReportRequest:
    report_type: ReportType
    start_date: str
    end_date: str
    home_id: int | None
    home_name: str | None
    access_level: str | None
    allowed_home_ids: list[int]
    provider_id: int | None


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except Exception:
        return None


def _safe_int_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    result: list[int] = []
    for item in value:
        parsed = _safe_int(item)
        if parsed is not None:
            result.append(parsed)
    return result


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = _safe_str(young_person.get("preferred_name"))
    first_name = _safe_str(young_person.get("first_name"))
    full_name = " ".join(
        part
        for part in [
            _safe_str(young_person.get("first_name")),
            _safe_str(young_person.get("last_name")),
        ]
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


def _normalise_context(context: dict[str, Any] | None) -> dict[str, Any]:
    context = context or {}
    cleaned = {
        "home_id": _safe_int(context.get("home_id")),
        "home_name": _safe_str(context.get("home_name")) or None,
        "young_person_id": _safe_int(context.get("young_person_id")),
        "young_person_name": _safe_str(context.get("young_person_name")) or None,
        "current_view": _safe_str(context.get("current_view")) or None,
        "current_section": _safe_str(context.get("current_section")) or None,
        "record_type": _safe_str(context.get("record_type")) or None,
        "record_id": _safe_int(context.get("record_id")),
        "composer_record_type": _safe_str(context.get("composer_record_type")) or None,
        "shift_context": _safe_str(context.get("shift_context")) or None,
        "placement_status": _safe_str(context.get("placement_status")) or None,
        "summary_risk_level": _safe_str(context.get("summary_risk_level")) or None,
        "scope": _safe_str(context.get("scope")) or None,
        "scope_type": _safe_str(context.get("scope_type")) or None,
        "access_level": _safe_str(context.get("access_level")) or None,
        "allowed_home_ids": _safe_int_list(context.get("allowed_home_ids")),
        "provider_id": _safe_int(context.get("provider_id")),
        "start_date": _safe_str(context.get("start_date")) or None,
        "end_date": _safe_str(context.get("end_date")) or None,
    }
    return {k: v for k, v in cleaned.items() if v not in (None, "", [], {})}


def _normalise_scope_for_assistant(
    scope: dict[str, Any] | None,
    *,
    assistant_type: AssistantType,
    ui_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw_scope = scope or {}
    ui_context = ui_context or {}

    scope_type = _safe_str(raw_scope.get("scope_type") or ui_context.get("scope_type") or "global").lower()
    home_id = _safe_int(raw_scope.get("home_id") or ui_context.get("home_id"))
    young_person_id = _safe_int(raw_scope.get("young_person_id") or ui_context.get("young_person_id"))
    record_type = _safe_str(raw_scope.get("record_type") or ui_context.get("record_type")) or None
    record_id = _safe_int(raw_scope.get("record_id") or ui_context.get("record_id"))
    access_level = _safe_str(raw_scope.get("access_level") or ui_context.get("access_level")) or None
    allowed_home_ids = _safe_int_list(raw_scope.get("allowed_home_ids") or ui_context.get("allowed_home_ids"))
    provider_id = _safe_int(raw_scope.get("provider_id") or ui_context.get("provider_id"))

    if assistant_type == "public":
        return {
            "scope_type": "global",
            "home_id": None,
            "young_person_id": None,
            "record_type": None,
            "record_id": None,
            "access_level": None,
            "allowed_home_ids": [],
            "provider_id": None,
        }

    if assistant_type == "young_people_os":
        if scope_type not in {"global", "young_person"}:
            scope_type = "young_person" if young_person_id else "global"

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
            "access_level": "child",
            "allowed_home_ids": [home_id] if home_id else [],
            "provider_id": None,
        }

    if assistant_type == "home_os":
        if scope_type != "home":
            scope_type = "home"

        if not home_id:
            raise ValueError("home_id is required for home assistant scope.")

        return {
            "scope_type": "home",
            "home_id": home_id,
            "young_person_id": None,
            "record_type": record_type,
            "record_id": record_id,
            "access_level": access_level or "home",
            "allowed_home_ids": [home_id],
            "provider_id": provider_id,
        }

    if assistant_type == "quality_os":
        if scope_type != "quality":
            scope_type = "quality"

        return {
            "scope_type": "quality",
            "home_id": home_id,
            "young_person_id": None,
            "record_type": record_type,
            "record_id": record_id,
            "access_level": access_level or "home",
            "allowed_home_ids": allowed_home_ids,
            "provider_id": provider_id,
        }

    raise ValueError("Unsupported assistant type.")


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    safe_history: list[dict[str, str]] = []

    for item in history or []:
        if not isinstance(item, dict):
            continue

        role = _safe_str(item.get("role")).lower()
        content = _safe_str(item.get("content") or item.get("message"))

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


def _looks_like_report_request(message: str) -> bool:
    value = _safe_str(message).lower()
    triggers = [
        "reg 45",
        "regulation 45",
        "monthly report",
        "monthly summary",
        "monthly overview",
        "annual report",
        "annual overview",
        "yearly report",
        "yearly overview",
    ]
    return any(trigger in value for trigger in triggers)


def _detect_report_request(
    message: str,
    ui_context: dict[str, Any],
    scope: dict[str, Any],
) -> ReportRequest | None:
    value = _safe_str(message).lower()
    start_date = _safe_str(ui_context.get("start_date"))
    end_date = _safe_str(ui_context.get("end_date"))

    if "reg 45" in value or "regulation 45" in value:
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for Reg 45 reports")
        return ReportRequest(
            report_type="reg45",
            start_date=start_date,
            end_date=end_date,
            home_id=_safe_int(scope.get("home_id")),
            home_name=_safe_str(ui_context.get("home_name")) or None,
            access_level=_safe_str(scope.get("access_level")) or None,
            allowed_home_ids=_safe_int_list(scope.get("allowed_home_ids")),
            provider_id=_safe_int(scope.get("provider_id")),
        )

    if "monthly report" in value or "monthly summary" in value or "monthly overview" in value:
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for monthly reports")
        return ReportRequest(
            report_type="monthly",
            start_date=start_date,
            end_date=end_date,
            home_id=_safe_int(scope.get("home_id")),
            home_name=_safe_str(ui_context.get("home_name")) or None,
            access_level=_safe_str(scope.get("access_level")) or None,
            allowed_home_ids=_safe_int_list(scope.get("allowed_home_ids")),
            provider_id=_safe_int(scope.get("provider_id")),
        )

    if "yearly report" in value or "annual report" in value or "yearly overview" in value or "annual overview" in value:
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for yearly reports")
        return ReportRequest(
            report_type="yearly",
            start_date=start_date,
            end_date=end_date,
            home_id=_safe_int(scope.get("home_id")),
            home_name=_safe_str(ui_context.get("home_name")) or None,
            access_level=_safe_str(scope.get("access_level")) or None,
            allowed_home_ids=_safe_int_list(scope.get("allowed_home_ids")),
            provider_id=_safe_int(scope.get("provider_id")),
        )

    return None


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


def _build_compact_home_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "scope": context.get("scope") or {},
        "home": _pick_fields(
            context.get("home"),
            [
                "id",
                "name",
                "home_name",
                "status",
                "created_at",
                "updated_at",
            ],
        ),
        "summary": context.get("summary") or {},
        "young_people": [
            _pick_fields(
                item,
                [
                    "id",
                    "preferred_name",
                    "full_name",
                    "placement_status",
                    "summary_risk_level",
                    "home_name",
                ],
            )
            for item in _trim_list(context.get("young_people"), 12)
        ],
        "team": [
            _pick_fields(
                item,
                [
                    "id",
                    "full_name",
                    "staff_member",
                    "role",
                    "status",
                    "updated_at",
                ],
            )
            for item in _trim_list(context.get("team"), 12)
        ],
        "tasks": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "task",
                    "status",
                    "priority",
                    "due_date",
                    "assigned_role",
                ],
            )
            for item in _trim_list(context.get("tasks"), 12)
        ],
        "communications": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "communication_type",
                    "organisation",
                    "contact_datetime",
                    "status",
                ],
            )
            for item in _trim_list(context.get("communications"), 10)
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
                    "expiry_date",
                ],
            )
            for item in _trim_list(context.get("documents"), 10)
        ],
        "supervisions": [
            _pick_fields(
                item,
                [
                    "id",
                    "staff_member",
                    "role",
                    "status",
                    "due_date",
                ],
            )
            for item in _trim_list(context.get("supervisions"), 10)
        ],
        "therapy": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "service_name",
                    "professional_name",
                    "status",
                    "session_date",
                ],
            )
            for item in _trim_list(context.get("therapy"), 10)
        ],
        "reports": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "review_month",
                    "status",
                    "created_at",
                ],
            )
            for item in _trim_list(context.get("reports"), 10)
        ],
        "compliance_items": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "status",
                    "severity",
                    "due_date",
                ],
            )
            for item in _trim_list(context.get("compliance_items"), 12)
        ],
        "rota": [
            _pick_fields(
                item,
                [
                    "id",
                    "shift_date",
                    "shift_type",
                    "lead_name",
                    "status",
                ],
            )
            for item in _trim_list(context.get("rota"), 10)
        ],
        "onboarding": [
            _pick_fields(
                item,
                [
                    "id",
                    "staff_member",
                    "status",
                    "stage",
                    "review_date",
                ],
            )
            for item in _trim_list(context.get("onboarding"), 10)
        ],
        "training": [
            _pick_fields(
                item,
                [
                    "id",
                    "staff_member",
                    "training_name",
                    "status",
                    "expiry_date",
                ],
            )
            for item in _trim_list(context.get("training"), 10)
        ],
    }


def _build_compact_quality_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "scope": context.get("scope") or {},
        "homes": [
            _pick_fields(
                item,
                [
                    "id",
                    "name",
                    "home_name",
                    "status",
                ],
            )
            for item in _trim_list(context.get("homes"), 20)
        ],
        "summary": context.get("summary") or {},
        "audits": [
            _pick_fields(
                item,
                [
                    "id",
                    "audit_name",
                    "finding",
                    "status",
                    "audit_date",
                    "auditor",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("audits"), 12)
        ],
        "incidents": [
            _pick_fields(
                item,
                [
                    "id",
                    "incident_type",
                    "description",
                    "status",
                    "incident_datetime",
                    "location",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("incidents"), 12)
        ],
        "compliance_items": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "status",
                    "severity",
                    "due_date",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("compliance_items"), 12)
        ],
        "reports": [
            _pick_fields(
                item,
                [
                    "id",
                    "title",
                    "summary",
                    "report_type",
                    "status",
                    "created_at",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("reports"), 12)
        ],
        "team": [
            _pick_fields(
                item,
                [
                    "id",
                    "full_name",
                    "staff_member",
                    "role",
                    "status",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("team"), 12)
        ],
        "supervisions": [
            _pick_fields(
                item,
                [
                    "id",
                    "staff_member",
                    "role",
                    "status",
                    "due_date",
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("supervisions"), 12)
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
                    "home_id",
                ],
            )
            for item in _trim_list(context.get("documents"), 12)
        ],
    }


def _build_compact_report_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "report_type": context.get("report_type"),
        "period": context.get("period") or {},
        "access_level": context.get("access_level"),
        "provider_id": context.get("provider_id"),
        "home_ids": _trim_list(context.get("home_ids"), 20),
        "homes": [
            _pick_fields(
                item,
                [
                    "id",
                    "name",
                    "home_name",
                    "manager_email",
                    "provider_id",
                ],
            )
            for item in _trim_list(context.get("homes"), 20)
        ],
        "children_outcomes": [
            _pick_fields(
                item,
                [
                    "home_id",
                    "young_person_id",
                    "young_person_name",
                    "placement_status",
                    "summary_risk_level",
                    "education_records_count",
                    "health_records_count",
                    "family_contact_records_count",
                    "achievement_records_count",
                    "incidents_count",
                    "missing_episodes_count",
                ],
            )
            for item in _trim_list(context.get("children_outcomes"), 200)
        ],
        "incident_summary": [
            _pick_fields(
                item,
                [
                    "home_id",
                    "incident_type",
                    "count",
                ],
            )
            for item in _trim_list(context.get("incident_summary"), 100)
        ],
        "safeguarding_summary": [
            _pick_fields(
                item,
                [
                    "home_id",
                    "safeguarding_category",
                    "status",
                    "count",
                ],
            )
            for item in _trim_list(context.get("safeguarding_summary"), 100)
        ],
        "compliance_summary": [
            _pick_fields(
                item,
                [
                    "home_id",
                    "status",
                    "severity",
                    "count",
                ],
            )
            for item in _trim_list(context.get("compliance_summary"), 100)
        ],
        "workforce_summary": {
            "supervisions": [
                _pick_fields(item, ["home_id", "status", "count"])
                for item in _trim_list((context.get("workforce_summary") or {}).get("supervisions"), 100)
            ],
            "training": [
                _pick_fields(item, ["home_id", "status", "count"])
                for item in _trim_list((context.get("workforce_summary") or {}).get("training"), 100)
            ],
        },
        "positive_indicators": {
            "achievement_counts": [
                _pick_fields(item, ["home_id", "count"])
                for item in _trim_list((context.get("positive_indicators") or {}).get("achievement_counts"), 100)
            ],
            "keywork_counts": [
                _pick_fields(item, ["home_id", "count"])
                for item in _trim_list((context.get("positive_indicators") or {}).get("keywork_counts"), 100)
            ],
            "family_contact_counts": [
                _pick_fields(item, ["home_id", "count"])
                for item in _trim_list((context.get("positive_indicators") or {}).get("family_contact_counts"), 100)
            ],
        },
    }


def _build_compact_context(
    context: dict[str, Any],
    *,
    assistant_type: AssistantType,
) -> dict[str, Any]:
    if context.get("report_type") in {"monthly", "reg45", "yearly"} and context.get("period"):
        return _build_compact_report_context(context)

    scope = context.get("scope") or {}
    scope_type = _safe_str(scope.get("scope_type")).lower() or "global"

    if assistant_type == "public":
        return _build_compact_public_context(context)

    if assistant_type == "young_people_os":
        if scope_type == "young_person":
            return _build_compact_young_person_context(context)
        return _build_compact_global_os_context(context)

    if assistant_type == "home_os":
        return _build_compact_home_context(context)

    if assistant_type == "quality_os":
        return _build_compact_quality_context(context)

    return {"scope": scope}


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


def _build_home_summary(context: dict[str, Any]) -> str:
    home = context.get("home") or {}
    team = context.get("team") or []
    tasks = context.get("tasks") or []
    young_people = context.get("young_people") or []
    compliance_items = context.get("compliance_items") or []
    supervisions = context.get("supervisions") or []
    reports = context.get("reports") or []

    lines = [
        f"Home assistant context loaded for {home.get('home_name') or home.get('name') or 'the home'}.",
        f"- Home ID: {home.get('id') or context.get('home_id')}",
        f"- Young people loaded: {len(young_people)}",
        f"- Team items loaded: {len(team)}",
        f"- Tasks loaded: {len(tasks)}",
        f"- Compliance items loaded: {len(compliance_items)}",
        f"- Supervisions loaded: {len(supervisions)}",
        f"- Reports loaded: {len(reports)}",
    ]
    return "\n".join(lines)


def _build_quality_summary(context: dict[str, Any]) -> str:
    homes = context.get("homes") or []
    audits = context.get("audits") or []
    incidents = context.get("incidents") or []
    compliance_items = context.get("compliance_items") or []
    reports = context.get("reports") or []

    scope = context.get("scope") or {}

    lines = [
        "Quality assistant context loaded.",
        f"- Access level: {scope.get('access_level')}",
        f"- Selected home ID: {scope.get('home_id')}",
        f"- Allowed homes: {len(scope.get('allowed_home_ids') or [])}",
        f"- Homes loaded: {len(homes)}",
        f"- Audits loaded: {len(audits)}",
        f"- Incidents loaded: {len(incidents)}",
        f"- Compliance items loaded: {len(compliance_items)}",
        f"- Reports loaded: {len(reports)}",
    ]
    return "\n".join(lines)


def _build_report_summary(context: dict[str, Any]) -> str:
    period = context.get("period") or {}
    homes = context.get("homes") or []
    children_outcomes = context.get("children_outcomes") or []
    incident_summary = context.get("incident_summary") or []
    safeguarding_summary = context.get("safeguarding_summary") or []
    compliance_summary = context.get("compliance_summary") or []
    workforce_summary = context.get("workforce_summary") or {}
    positive_indicators = context.get("positive_indicators") or {}

    lines = [
        f"Aggregated {context.get('report_type')} report context loaded.",
        f"- Period start: {period.get('start_date')}",
        f"- Period end: {period.get('end_date')}",
        f"- Access level: {context.get('access_level')}",
        f"- Homes loaded: {len(homes)}",
        f"- Children outcomes rows: {len(children_outcomes)}",
        f"- Incident summary rows: {len(incident_summary)}",
        f"- Safeguarding summary rows: {len(safeguarding_summary)}",
        f"- Compliance summary rows: {len(compliance_summary)}",
        f"- Workforce supervision rows: {len(workforce_summary.get('supervisions') or [])}",
        f"- Workforce training rows: {len(workforce_summary.get('training') or [])}",
        f"- Achievement count rows: {len((positive_indicators.get('achievement_counts') or []))}",
        f"- Keywork count rows: {len((positive_indicators.get('keywork_counts') or []))}",
        f"- Family contact count rows: {len((positive_indicators.get('family_contact_counts') or []))}",
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
    if ui_context.get("access_level"):
        lines.append(f"- Access level: {ui_context.get('access_level')}")
    if ui_context.get("allowed_home_ids"):
        lines.append(f"- Allowed home IDs: {ui_context.get('allowed_home_ids')}")
    if ui_context.get("provider_id") is not None:
        lines.append(f"- Provider ID: {ui_context.get('provider_id')}")
    if ui_context.get("start_date"):
        lines.append(f"- Start date: {ui_context.get('start_date')}")
    if ui_context.get("end_date"):
        lines.append(f"- End date: {ui_context.get('end_date')}")

    return "\n".join(lines)


def _build_general_prompt(
    *,
    assistant_type: AssistantType,
    message: str,
    compact_context: dict[str, Any],
    ui_context: dict[str, Any] | None = None,
    history: list[dict[str, str]] | None = None,
) -> str:
    scope = compact_context.get("scope") or {}
    scope_type = scope.get("scope_type")

    if assistant_type == "public":
        summary = _build_public_summary(compact_context)
        assistant_header = "You are the IndiCare public assistant."
        guardrail = (
            "You must stay strictly within public assistant context. "
            "Do not use, infer, expose, or reference any young person OS data, "
            "home operational data, quality oversight data, or safeguarding records."
        )
    elif assistant_type == "young_people_os":
        if scope_type == "young_person":
            summary = _build_young_person_summary(compact_context)
            guardrail = (
                "You must stay strictly within the scoped young person OS context. "
                "Do not answer with information about other young people, other homes, "
                "quality/provider-wide data, or any public assistant context."
            )
        else:
            summary = _build_global_os_summary(compact_context)
            guardrail = (
                "You must stay strictly within the scoped Young People OS home context. "
                "Do not expose information outside the current authorised home scope, "
                "and do not use any public assistant context."
            )
        assistant_header = "You are the IndiCare Young People OS assistant."
    elif assistant_type == "home_os":
        summary = _build_home_summary(compact_context)
        assistant_header = "You are the IndiCare Home OS assistant."
        guardrail = (
            "You must stay strictly within the authorised home operational scope. "
            "Do not expose other homes, provider-wide oversight material, or any public assistant context."
        )
    elif assistant_type == "quality_os":
        summary = _build_quality_summary(compact_context)
        assistant_header = "You are the IndiCare Quality OS assistant."
        guardrail = (
            "You must stay strictly within the authorised quality and oversight scope. "
            "If access is home-level, do not answer across other homes. "
            "If access is provider-level, stay within the allowed homes only. "
            "Do not use any public assistant context."
        )
    else:
        summary = "No assistant summary available."
        assistant_header = "You are the IndiCare assistant."
        guardrail = "Stay within authorised context only."

    ui_summary = _build_ui_summary(ui_context)

    history_lines: list[str] = []
    for item in history or []:
        role = _safe_str(item.get("role"))
        content = _safe_str(item.get("content"))
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
{compact_context}

=== UI CONTEXT ===
{ui_context or {}}

=== CONVERSATION HISTORY ===
{history_text}

=== USER MESSAGE ===
{message}
""".strip()


def _build_report_prompt(
    *,
    report_request: ReportRequest,
    compact_context: dict[str, Any],
    history: list[dict[str, str]] | None = None,
) -> str:
    if report_request.report_type == "reg45":
        heading = "Regulation 45 report"
        structure = """
Produce a full Regulation 45 style report for the specified period.

Required structure:
1. Introduction and period covered
2. Overview of the home
3. Experiences, progress and outcomes for children
4. Education, health and emotional wellbeing
5. Relationships, contact and identity
6. Safeguarding, risk and behaviour patterns
7. Quality of care and staffing practice
8. Complaints, incidents and significant events
9. Management oversight and compliance themes
10. Strengths and positives
11. Areas for development
12. Clear recommendations
"""
    elif report_request.report_type == "monthly":
        heading = "Monthly management report"
        structure = """
Produce a monthly management report for the specified period.

Required structure:
1. Period overview
2. Children’s experiences and outcomes
3. Safeguarding and risk overview
4. Staffing, practice and operational themes
5. Compliance and outstanding actions
6. Strengths and positives
7. Concerns or gaps
8. Priority actions for the next period
"""
    else:
        heading = "Yearly overview report"
        structure = """
Produce a yearly overview report for the specified period.

Required structure:
1. Year in review
2. Outcomes for children across the year
3. Progress, strengths and positive developments
4. Safeguarding, incidents and risk trends
5. Education, health and emotional wellbeing themes
6. Workforce, stability and operational themes
7. Compliance and quality assurance themes
8. Key patterns over time
9. Strategic recommendations for the next year
"""

    history_lines: list[str] = []
    for item in history or []:
        role = _safe_str(item.get("role"))
        content = _safe_str(item.get("content"))
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    history_text = "\n".join(history_lines).strip()

    return f"""
You are the IndiCare reporting assistant.

Generate a {heading}.

{structure}

Rules:
- stay evidence-based
- include positive outcomes and strengths as well as risks
- use warm but professional language
- focus on what children experienced, what improved, and what still needs attention
- do not invent statistics or events
- where the context is incomplete, say so plainly
- write in a professional format suitable for managers and oversight
- where relevant, balance safeguarding concerns with progress, stability and protective factors

=== REPORT CONTEXT SUMMARY ===
{_build_report_summary(compact_context)}

=== STRUCTURED REPORT CONTEXT ===
{compact_context}

=== CONVERSATION HISTORY ===
{history_text}

=== REPORT REQUEST ===
- report_type: {report_request.report_type}
- period_start: {report_request.start_date}
- period_end: {report_request.end_date}
- home_id: {report_request.home_id}
- home_name: {report_request.home_name}
- access_level: {report_request.access_level}
- allowed_home_ids: {report_request.allowed_home_ids}
- provider_id: {report_request.provider_id}
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
    from services.report_scheduler import (
        build_monthly_report_context,
        build_reg45_context,
        build_yearly_report_context,
    )

    ui_context = _normalise_context(context)
    safe_history = _normalise_history(history)

    normalised_scope = _normalise_scope_for_assistant(
        scope,
        assistant_type=assistant_type,
        ui_context=ui_context,
    )

    report_request = _detect_report_request(
        _safe_str(message),
        ui_context,
        normalised_scope,
    )

    if report_request is not None:
        if report_request.report_type == "monthly":
            built_context = build_monthly_report_context(
                conn,
                home_id=report_request.home_id,
                start_date=report_request.start_date,
                end_date=report_request.end_date,
                access_level=report_request.access_level,
                allowed_home_ids=report_request.allowed_home_ids,
                provider_id=report_request.provider_id,
            )
        elif report_request.report_type == "reg45":
            built_context = build_reg45_context(
                conn,
                home_id=report_request.home_id,
                start_date=report_request.start_date,
                end_date=report_request.end_date,
                access_level=report_request.access_level,
                allowed_home_ids=report_request.allowed_home_ids,
                provider_id=report_request.provider_id,
            )
        else:
            built_context = build_yearly_report_context(
                conn,
                home_id=report_request.home_id,
                start_date=report_request.start_date,
                end_date=report_request.end_date,
                access_level=report_request.access_level,
                allowed_home_ids=report_request.allowed_home_ids,
                provider_id=report_request.provider_id,
            )

        compact_context = _build_compact_report_context(built_context)

        if ui_context:
            compact_context["ui_context"] = ui_context

        prompt = _build_report_prompt(
            report_request=report_request,
            compact_context=compact_context,
            history=safe_history,
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
                "assistant_type": assistant_type,
                "report_type": report_request.report_type,
                "home_id": report_request.home_id,
                "home_name": report_request.home_name,
                "start_date": report_request.start_date,
                "end_date": report_request.end_date,
                "access_level": report_request.access_level,
                "allowed_home_ids": report_request.allowed_home_ids,
                "provider_id": report_request.provider_id,
                "history_items_used": len(safe_history),
                "is_report_request": True,
            },
        }

    built_context = build_assistant_context(
        conn,
        user_id=user_id,
        scope=normalised_scope,
        assistant_type=assistant_type,
    )

    compact_context = _build_compact_context(
        built_context,
        assistant_type=assistant_type,
    )

    if ui_context:
        compact_context["ui_context"] = ui_context

    prompt = _build_general_prompt(
        assistant_type=assistant_type,
        message=_safe_str(message),
        compact_context=compact_context,
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
            "access_level": built_scope.get("access_level"),
            "allowed_home_ids": built_scope.get("allowed_home_ids"),
            "provider_id": built_scope.get("provider_id"),
            "current_view": ui_context.get("current_view"),
            "current_section": ui_context.get("current_section"),
            "young_person_name": ui_context.get("young_person_name"),
            "placement_status": ui_context.get("placement_status"),
            "summary_risk_level": ui_context.get("summary_risk_level"),
            "composer_record_type": ui_context.get("composer_record_type"),
            "home_name": ui_context.get("home_name"),
            "shift_context": ui_context.get("shift_context"),
            "start_date": ui_context.get("start_date"),
            "end_date": ui_context.get("end_date"),
            "history_items_used": len(safe_history),
            "is_report_request": False,
        },
    }
