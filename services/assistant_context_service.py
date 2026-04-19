from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from psycopg2.extras import RealDictCursor


AssistantType = Literal["public", "young_people_os", "home_os", "quality_os"]


def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchone()


def _fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return list(cur.fetchall())


def _safe_fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    try:
        return _fetch_all(conn, query, params)
    except Exception:
        return []


def _safe_fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    try:
        return _fetch_one(conn, query, params)
    except Exception:
        return None


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_int_list(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    result: list[int] = []
    for item in value:
        safe = _safe_int(item)
        if safe is not None:
            result.append(safe)
    return result


def _normalise_scope(scope: dict[str, Any] | None) -> dict[str, Any]:
    scope = scope or {}
    raw_scope_type = _safe_string(scope.get("scope_type")).lower()
    raw_scope = _safe_string(scope.get("scope")).lower()

    if not raw_scope_type:
        if raw_scope in {"child", "young_person"}:
            raw_scope_type = "young_person"
        elif raw_scope == "home":
            raw_scope_type = "home"
        elif raw_scope == "quality":
            raw_scope_type = "quality"
        else:
            raw_scope_type = "global"

    return {
        "scope_type": raw_scope_type,
        "scope": raw_scope or raw_scope_type,
        "home_id": _safe_int(scope.get("home_id")),
        "young_person_id": _safe_int(scope.get("young_person_id")),
        "record_type": _safe_string(scope.get("record_type")).lower(),
        "record_id": _safe_int(scope.get("record_id")),
        "access_level": _safe_string(scope.get("access_level")).lower(),
        "provider_id": _safe_int(scope.get("provider_id")),
        "allowed_home_ids": _safe_int_list(scope.get("allowed_home_ids")),
    }


def _isoish(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    text = _safe_string(value)
    return text or None


def _first_non_empty(item: dict[str, Any], keys: list[str]) -> Any:
    for key in keys:
        value = item.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def _record_title(record_type: str, item: dict[str, Any]) -> str:
    value = _first_non_empty(
        item,
        [
            "title",
            "name",
            "summary",
            "incident_type",
            "contact_type",
            "appointment_type",
            "training_name",
            "course_name",
            "session_title",
            "service_name",
            "staff_member",
            "full_name",
            "communication_type",
            "document_type",
            "category",
            "status",
            "vacancy_title",
            "visitor_name",
            "action_title",
            "line_of_enquiry",
        ],
    )
    if value not in (None, ""):
        return _safe_string(value)
    return record_type.replace("_", " ").strip().title()


def _record_excerpt(item: dict[str, Any], max_chars: int = 280) -> str:
    value = _first_non_empty(
        item,
        [
            "summary",
            "description",
            "message",
            "outcome",
            "presentation",
            "young_person_voice",
            "child_voice",
            "follow_up_actions",
            "support_summary",
            "concern_summary",
            "mental_health_summary",
            "medication_summary",
            "session_summary",
            "recommendation",
            "notes",
            "rationale",
            "action_description",
            "review_reason",
            "narrative_summary",
            "headline_summary",
            "top_concerns",
            "urgent_actions",
        ],
    )
    text = _safe_string(value)
    if not text:
        return ""
    return text[:max_chars]


def _record_date(item: dict[str, Any]) -> str | None:
    value = _first_non_empty(
        item,
        [
            "event_datetime",
            "incident_datetime",
            "contact_datetime",
            "appointment_date",
            "meeting_date",
            "session_date",
            "scheduled_date",
            "completed_date",
            "note_date",
            "record_date",
            "review_date",
            "next_due_date",
            "target_date",
            "review_month",
            "achievement_date",
            "audit_date",
            "shift_date",
            "handover_date",
            "due_date",
            "expiry_date",
            "expires_on",
            "follow_up_date",
            "journey_date",
            "booking_date",
            "check_date",
            "arrival_time",
            "arrived_at",
            "departure_time",
            "departed_at",
            "report_date",
            "opening_date",
            "closing_date",
            "period_end",
            "review_period_end",
            "created_at",
            "updated_at",
        ],
    )
    return _isoish(value)


def _source_section_for_record_type(record_type: str) -> str:
    mapping = {
        "daily_note": "timeline",
        "incident": "timeline",
        "health_record": "health",
        "education_record": "education",
        "family_contact": "family",
        "keywork": "keywork",
        "missing_episode": "incidents",
        "safeguarding_record": "incidents",
        "achievement_record": "education",
        "support_plan": "plans",
        "risk": "plans",
        "appointment": "calendar",
        "task": "readiness",
        "monthly_review": "reports",
        "manager_action": "manager",
        "document": "documents",
        "statutory_document": "documents",
        "handover_record": "handover",
        "quality_audit": "quality",
        "inspection_action": "quality",
        "inspection_line_of_enquiry": "quality",
        "inspection_reason": "quality",
        "communication": "communication",
        "supervision_session": "supervision",
        "training_record": "training",
        "rota": "team",
        "staff": "team",
        "therapy_session_note": "therapy",
        "vacancy": "team",
        "visitor_log": "communication",
        "transport_journey": "transport",
        "vehicle_journey": "transport",
        "staff_wellbeing_checkin": "team",
        "staff_support_plan": "team",
    }
    return mapping.get(record_type, "workspace")


def _build_deep_link(
    *,
    scope_type: str,
    section: str,
    record_type: str,
    record_id: int | None,
    young_person_id: int | None = None,
    home_id: int | None = None,
) -> str | None:
    if record_id is None:
        return None

    params = [
        f"section={section}",
        f"record_type={record_type}",
        f"record_id={record_id}",
    ]

    if scope_type == "young_person" and young_person_id is not None:
        params.append(f"young_person_id={young_person_id}")
        return f"/young-people/workspace?{'&'.join(params)}"

    if scope_type == "home" and home_id is not None:
        params.append(f"home_id={home_id}")
        return f"/home/workspace?{'&'.join(params)}"

    if scope_type == "quality":
        if home_id is not None:
            params.append(f"home_id={home_id}")
        return f"/quality/workspace?{'&'.join(params)}"

    return None


def _make_evidence_item(
    *,
    scope_type: str,
    record_type: str,
    item: dict[str, Any],
    young_person_id: int | None = None,
    home_id: int | None = None,
    section: str | None = None,
) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None

    record_id = _safe_int(item.get("id"))
    if record_id is None:
        return None

    resolved_section = section or _source_section_for_record_type(record_type)
    citation_ref = f"{record_type}:{record_id}"

    return {
        "citation_ref": citation_ref,
        "record_type": record_type,
        "record_id": record_id,
        "label": _record_title(record_type, item),
        "excerpt": _record_excerpt(item),
        "date": _record_date(item),
        "section": resolved_section,
        "scope_type": scope_type,
        "young_person_id": young_person_id,
        "home_id": home_id,
        "deep_link": _build_deep_link(
            scope_type=scope_type,
            section=resolved_section,
            record_type=record_type,
            record_id=record_id,
            young_person_id=young_person_id,
            home_id=home_id,
        ),
    }


def _extend_evidence_index(
    evidence_index: list[dict[str, Any]],
    *,
    scope_type: str,
    record_type: str,
    items: list[dict[str, Any]] | None,
    young_person_id: int | None = None,
    home_id: int | None = None,
    section: str | None = None,
) -> None:
    if not isinstance(items, list):
        return

    for item in items:
        evidence_item = _make_evidence_item(
            scope_type=scope_type,
            record_type=record_type,
            item=item,
            young_person_id=young_person_id,
            home_id=home_id,
            section=section,
        )
        if evidence_item:
            evidence_index.append(evidence_item)


def _dedupe_evidence_index(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []

    for item in items:
        citation_ref = _safe_string(item.get("citation_ref")).lower()
        if not citation_ref or citation_ref in seen:
            continue
        seen.add(citation_ref)
        result.append(item)

    return result


def _sort_evidence_index(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def sort_key(item: dict[str, Any]) -> tuple[str, str]:
        return (_safe_string(item.get("date")) or "", _safe_string(item.get("citation_ref")))

    return sorted(items, key=sort_key, reverse=True)


def _get_user_row(conn, user_id: int) -> dict[str, Any] | None:
    return _safe_fetch_one(
        conn,
        """
        SELECT
            id,
            home_id,
            provider_id,
            role
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (user_id,),
    )


def _get_user_home(conn, user_id: int) -> int | None:
    row = _get_user_row(conn, user_id)
    if not row:
        return None
    return _safe_int(row.get("home_id"))


def _get_user_provider(conn, user_id: int) -> int | None:
    row = _get_user_row(conn, user_id)
    if not row:
        return None
    return _safe_int(row.get("provider_id"))


def _get_user_role(conn, user_id: int) -> str:
    row = _get_user_row(conn, user_id)
    if not row:
        return ""
    return _safe_string(row.get("role")).lower()


def _is_provider_level_role(role: str) -> bool:
    return role in {"admin", "provider_admin", "ri", "responsible_individual", "super_admin", "administrator"}


def _assert_home_access(conn, user_id: int, home_id: int | None) -> int:
    if home_id is None:
        raise ValueError("home_id is required")

    role = _get_user_role(conn, user_id)
    user_home_id = _get_user_home(conn, user_id)

    if _is_provider_level_role(role):
        return home_id

    if user_home_id is None:
        raise PermissionError("Home access could not be verified")

    if user_home_id != home_id:
        raise PermissionError("You do not have access to this home")

    return home_id


def _assert_quality_access(
    conn,
    user_id: int,
    *,
    home_id: int | None,
    access_level: str,
    allowed_home_ids: list[int] | None,
) -> dict[str, Any]:
    role = _get_user_role(conn, user_id)
    safe_allowed = allowed_home_ids or []

    if access_level == "provider":
        if not _is_provider_level_role(role):
            raise PermissionError("You do not have provider-level quality access")

        if safe_allowed:
            return {
                "access_level": "provider",
                "allowed_home_ids": safe_allowed,
                "selected_home_id": home_id,
            }

        if home_id is not None:
            return {
                "access_level": "provider",
                "allowed_home_ids": [home_id],
                "selected_home_id": home_id,
            }

        user_home_id = _get_user_home(conn, user_id)
        if user_home_id is not None:
            return {
                "access_level": "provider",
                "allowed_home_ids": [user_home_id],
                "selected_home_id": None,
            }

        return {
            "access_level": "provider",
            "allowed_home_ids": [],
            "selected_home_id": None,
        }

    verified_home_id = _assert_home_access(conn, user_id, home_id)
    return {
        "access_level": "home",
        "allowed_home_ids": [verified_home_id],
        "selected_home_id": verified_home_id,
    }


def _assert_young_person_access(conn, user_id: int, young_person_id: int) -> dict[str, Any]:
    role = _get_user_role(conn, user_id)
    user_home_id = _get_user_home(conn, user_id)

    young_person = _safe_fetch_one(
        conn,
        """
        SELECT
            yp.*,
            h.name AS home_name
        FROM young_people yp
        LEFT JOIN homes h ON h.id = yp.home_id
        WHERE yp.id = %s
        LIMIT 1
        """,
        (young_person_id,),
    )

    if not young_person:
        raise ValueError("Young person not found")

    record_home_id = _safe_int(young_person.get("home_id"))

    if not _is_provider_level_role(role):
        if user_home_id is None or record_home_id != user_home_id:
            raise PermissionError("You do not have access to this young person")

    return young_person


def _build_identity_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "communication_profile": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_communication_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "education_profile": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_education_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "health_profile": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_health_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "identity_profile": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_identity_profile
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "legal_status": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_legal_status
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "current_formulation": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_formulations
            WHERE young_person_id = %s
              AND COALESCE(is_current, FALSE) = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "contacts": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM young_person_contacts
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "active_alerts": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
              AND COALESCE(is_active, FALSE) = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "all_about_me": _safe_fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_all_about_me
            WHERE young_person_id = %s
              AND COALESCE(is_current, FALSE) = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
    }


def _build_active_work_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "support_plans": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM support_plans
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "support_plan_targets": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM support_plan_targets
            WHERE young_person_id = %s
            ORDER BY target_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "risk_assessments": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM risk_assessments
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "appointments": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM young_person_appointments
            WHERE young_person_id = %s
            ORDER BY appointment_date DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "statutory_documents": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM statutory_documents
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "tasks": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM tasks
            WHERE young_person_id = %s
            ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "transition_plans": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM transition_plans
            WHERE young_person_id = %s
            ORDER BY target_move_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "transition_actions": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM transition_actions
            WHERE young_person_id = %s
            ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "therapy_cases": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM therapy_cases
            WHERE young_person_id = %s
            ORDER BY start_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
    }


def _build_recent_records_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "daily_notes": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM daily_notes
            WHERE young_person_id = %s
            ORDER BY note_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 12
            """,
            (young_person_id,),
        ),
        "incidents": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM incidents
            WHERE young_person_id = %s
            ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 12
            """,
            (young_person_id,),
        ),
        "health_records": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM health_records
            WHERE young_person_id = %s
            ORDER BY event_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "education_records": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM education_records
            WHERE young_person_id = %s
            ORDER BY record_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "family_contact_records": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM family_contact_records
            WHERE young_person_id = %s
            ORDER BY contact_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "keywork_sessions": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM keywork_sessions
            WHERE young_person_id = %s
            ORDER BY session_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "missing_episodes": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM missing_episodes
            WHERE young_person_id = %s
            ORDER BY start_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "safeguarding_records": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM safeguarding_records
            WHERE young_person_id = %s
            ORDER BY concern_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "achievements": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM achievement_records
            WHERE young_person_id = %s
            ORDER BY achievement_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "chronology": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM chronology_events
            WHERE young_person_id = %s
              AND COALESCE(is_visible, TRUE) = TRUE
            ORDER BY event_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 24
            """,
            (young_person_id,),
        ),
        "wellbeing_checks": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM wellbeing_checks
            WHERE young_person_id = %s
            ORDER BY check_datetime DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "therapy_session_notes": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM therapy_session_notes
            WHERE young_person_id = %s
            ORDER BY session_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
    }


def _build_links_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "record_links": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM record_links
            WHERE young_person_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 50
            """,
            (young_person_id,),
        ),
        "record_standard_links": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM record_standard_links
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 50
            """,
            (young_person_id,),
        ),
        "workflow_events": _safe_fetch_all(
            conn,
            """
            SELECT *
            FROM record_workflow_events
            WHERE young_person_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 50
            """,
            (young_person_id,),
        ),
    }


def _build_scoped_record_context(
    conn,
    *,
    young_person_id: int,
    record_type: str | None,
    record_id: int | None,
) -> dict[str, Any]:
    record_type = _safe_string(record_type).lower()
    if not record_type or record_id is None:
        return {}

    record: dict[str, Any] | None = None

    table_map = {
        "daily_note": "daily_notes",
        "incident": "incidents",
        "risk": "risk_assessments",
        "support_plan": "support_plans",
        "plan": "support_plans",
        "appointment": "young_person_appointments",
        "keywork": "keywork_sessions",
        "family_contact": "family_contact_records",
        "health_record": "health_records",
        "education_record": "education_records",
        "missing_episode": "missing_episodes",
        "safeguarding_record": "safeguarding_records",
        "achievement_record": "achievement_records",
        "task": "tasks",
        "transition_plan": "transition_plans",
        "therapy_session_note": "therapy_session_notes",
        "wellbeing_check": "wellbeing_checks",
    }

    table_name = table_map.get(record_type)
    if table_name:
        record = _safe_fetch_one(
            conn,
            f"""
            SELECT *
            FROM {table_name}
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )

    related_workflow_events = _safe_fetch_all(
        conn,
        """
        SELECT *
        FROM record_workflow_events
        WHERE young_person_id = %s
          AND source_id = %s
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 20
        """,
        (young_person_id, record_id),
    )

    related_standards = _safe_fetch_all(
        conn,
        """
        SELECT *
        FROM record_standard_links
        WHERE young_person_id = %s
          AND source_id = %s
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 20
        """,
        (young_person_id, record_id),
    )

    related_chronology = _safe_fetch_all(
        conn,
        """
        SELECT *
        FROM chronology_events
        WHERE young_person_id = %s
          AND source_id = %s
        ORDER BY event_datetime DESC NULLS LAST, id DESC
        LIMIT 20
        """,
        (young_person_id, record_id),
    )

    return {
        "record_type": record_type,
        "record_id": record_id,
        "record": record,
        "workflow_events": related_workflow_events,
        "record_standard_links": related_standards,
        "chronology_events": related_chronology,
    }


def _build_young_person_evidence_index(
    *,
    young_person_id: int,
    home_id: int | None,
    identity: dict[str, Any],
    active_work: dict[str, Any],
    recent_records: dict[str, Any],
) -> list[dict[str, Any]]:
    evidence_index: list[dict[str, Any]] = []

    for profile_record_type, profile_item in [
        ("communication_profile", identity.get("communication_profile")),
        ("education_profile", identity.get("education_profile")),
        ("health_profile", identity.get("health_profile")),
        ("identity_profile", identity.get("identity_profile")),
        ("legal_status", identity.get("legal_status")),
        ("formulation", identity.get("current_formulation")),
        ("all_about_me", identity.get("all_about_me")),
    ]:
        if isinstance(profile_item, dict):
            evidence_item = _make_evidence_item(
                scope_type="young_person",
                record_type=profile_record_type,
                item=profile_item,
                young_person_id=young_person_id,
                home_id=home_id,
            )
            if evidence_item:
                evidence_index.append(evidence_item)

    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="alert", items=identity.get("active_alerts"), young_person_id=young_person_id, home_id=home_id, section="overview")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="support_plan", items=active_work.get("support_plans"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="support_plan_target", items=active_work.get("support_plan_targets"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="risk", items=active_work.get("risk_assessments"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="appointment", items=active_work.get("appointments"), young_person_id=young_person_id, home_id=home_id, section="calendar")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="statutory_document", items=active_work.get("statutory_documents"), young_person_id=young_person_id, home_id=home_id, section="documents")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="task", items=active_work.get("tasks"), young_person_id=young_person_id, home_id=home_id, section="readiness")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="transition_plan", items=active_work.get("transition_plans"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="transition_action", items=active_work.get("transition_actions"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="therapy_case", items=active_work.get("therapy_cases"), young_person_id=young_person_id, home_id=home_id, section="therapy")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="daily_note", items=recent_records.get("daily_notes"), young_person_id=young_person_id, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="incident", items=recent_records.get("incidents"), young_person_id=young_person_id, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="health_record", items=recent_records.get("health_records"), young_person_id=young_person_id, home_id=home_id, section="health")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="education_record", items=recent_records.get("education_records"), young_person_id=young_person_id, home_id=home_id, section="education")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="family_contact", items=recent_records.get("family_contact_records"), young_person_id=young_person_id, home_id=home_id, section="family")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="keywork", items=recent_records.get("keywork_sessions"), young_person_id=young_person_id, home_id=home_id, section="keywork")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="missing_episode", items=recent_records.get("missing_episodes"), young_person_id=young_person_id, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="safeguarding_record", items=recent_records.get("safeguarding_records"), young_person_id=young_person_id, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="achievement_record", items=recent_records.get("achievements"), young_person_id=young_person_id, home_id=home_id, section="education")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="chronology_event", items=recent_records.get("chronology"), young_person_id=young_person_id, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="wellbeing_check", items=recent_records.get("wellbeing_checks"), young_person_id=young_person_id, home_id=home_id, section="health")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="therapy_session_note", items=recent_records.get("therapy_session_notes"), young_person_id=young_person_id, home_id=home_id, section="therapy")

    return _sort_evidence_index(_dedupe_evidence_index(evidence_index))


def build_young_person_context(
    conn,
    *,
    user_id: int,
    young_person_id: int,
    scope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    scope = _normalise_scope(scope)
    young_person = _assert_young_person_access(conn, user_id, young_person_id)
    young_person_home_id = _safe_int(young_person.get("home_id"))

    identity = _build_identity_context(conn, young_person_id)
    active_work = _build_active_work_context(conn, young_person_id)
    recent_records = _build_recent_records_context(conn, young_person_id)

    return {
        "scope": {
            "scope_type": "young_person",
            "scope": "child",
            "home_id": young_person_home_id,
            "young_person_id": young_person_id,
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
            "access_level": "child",
            "provider_id": _safe_int(young_person.get("provider_id")),
            "allowed_home_ids": [young_person_home_id] if young_person_home_id else [],
        },
        "young_person": young_person,
        "identity": identity,
        "active_work": active_work,
        "recent_records": recent_records,
        "links": _build_links_context(conn, young_person_id),
        "scoped_record": _build_scoped_record_context(
            conn,
            young_person_id=young_person_id,
            record_type=scope.get("record_type"),
            record_id=scope.get("record_id"),
        ),
        "evidence_index": _build_young_person_evidence_index(
            young_person_id=young_person_id,
            home_id=young_person_home_id,
            identity=identity,
            active_work=active_work,
            recent_records=recent_records,
        ),
    }


def _build_home_header(conn, home_id: int) -> dict[str, Any] | None:
    return _safe_fetch_one(
        conn,
        """
        SELECT
            h.id,
            h.name,
            h.name AS home_name,
            h.provider_id,
            h.created_at,
            h.updated_at
        FROM homes h
        WHERE h.id = %s
        LIMIT 1
        """,
        (home_id,),
    )


def _build_home_evidence_index(
    *,
    home_id: int,
    team: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    communications: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    supervision_sessions: list[dict[str, Any]],
    therapy_session_notes: list[dict[str, Any]],
    inspection_actions: list[dict[str, Any]],
    inspection_lines: list[dict[str, Any]],
    reports: list[dict[str, Any]],
    training_records: list[dict[str, Any]],
    rota: list[dict[str, Any]],
    onboarding: list[dict[str, Any]],
    incidents: list[dict[str, Any]],
    vacancies: list[dict[str, Any]],
    visitors: list[dict[str, Any]],
    transport: list[dict[str, Any]],
    staff_support_plans: list[dict[str, Any]],
    wellbeing_checkins: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_index: list[dict[str, Any]] = []

    _extend_evidence_index(evidence_index, scope_type="home", record_type="staff", items=team, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="task", items=tasks, home_id=home_id, section="readiness")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="communication", items=communications, home_id=home_id, section="communication")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="document", items=documents, home_id=home_id, section="documents")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="supervision_session", items=supervision_sessions, home_id=home_id, section="supervision")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="therapy_session_note", items=therapy_session_notes, home_id=home_id, section="therapy")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="inspection_action", items=inspection_actions, home_id=home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="inspection_line_of_enquiry", items=inspection_lines, home_id=home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="report", items=reports, home_id=home_id, section="reports")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="training_record", items=training_records, home_id=home_id, section="training")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="rota", items=rota, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="onboarding", items=onboarding, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="incident", items=incidents, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="vacancy", items=vacancies, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="visitor_log", items=visitors, home_id=home_id, section="communication")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="transport_journey", items=transport, home_id=home_id, section="transport")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="staff_support_plan", items=staff_support_plans, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="staff_wellbeing_checkin", items=wellbeing_checkins, home_id=home_id, section="team")

    return _sort_evidence_index(_dedupe_evidence_index(evidence_index))


def build_home_os_context(
    conn,
    *,
    user_id: int,
    scope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    scope = _normalise_scope(scope)
    requested_home_id = scope.get("home_id") or _get_user_home(conn, user_id)
    home_id = _assert_home_access(conn, user_id, requested_home_id)

    home = _build_home_header(conn, home_id)

    young_people = _safe_fetch_all(
        conn,
        """
        SELECT
            yp.id,
            yp.preferred_name,
            CONCAT_WS(' ', yp.first_name, yp.last_name) AS full_name,
            yp.placement_status,
            yp.summary_risk_level,
            h.name AS home_name
        FROM young_people yp
        LEFT JOIN homes h ON h.id = yp.home_id
        WHERE yp.home_id = %s
          AND COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
        LIMIT 50
        """,
        (home_id,),
    )

    team = _safe_fetch_all(conn, "SELECT * FROM staff WHERE home_id = %s ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 50", (home_id,))
    tasks = _safe_fetch_all(conn, "SELECT * FROM tasks WHERE home_id = %s ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 50", (home_id,))
    communications = _safe_fetch_all(conn, "SELECT * FROM communications WHERE home_id = %s ORDER BY contact_datetime DESC NULLS LAST, created_at DESC NULLS LAST, id DESC LIMIT 40", (home_id,))
    documents = _safe_fetch_all(conn, "SELECT * FROM statutory_documents WHERE home_id = %s ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 40", (home_id,))
    supervision_sessions = _safe_fetch_all(conn, "SELECT * FROM supervision_sessions WHERE home_id = %s ORDER BY COALESCE(completed_date, scheduled_date) DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 40", (home_id,))
    therapy_session_notes = _safe_fetch_all(
        conn,
        """
        SELECT tsn.*
        FROM therapy_session_notes tsn
        JOIN young_people yp ON yp.id = tsn.young_person_id
        WHERE yp.home_id = %s
        ORDER BY tsn.session_date DESC NULLS LAST, tsn.updated_at DESC NULLS LAST, tsn.id DESC
        LIMIT 40
        """,
        (home_id,),
    )
    inspection_actions = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_action_board WHERE home_id = %s ORDER BY due_date ASC NULLS LAST, action_impact_priority_score DESC NULLS LAST LIMIT 40", (home_id,))
    inspection_lines = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_loe_board WHERE home_id = %s ORDER BY due_date ASC NULLS LAST, created_at DESC NULLS LAST LIMIT 40", (home_id,))
    reports = _safe_fetch_all(conn, "SELECT * FROM reports WHERE home_id = %s ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    training_records = _safe_fetch_all(conn, "SELECT * FROM staff_training_records WHERE home_id = %s ORDER BY COALESCE(expires_on, completed_on) ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 40", (home_id,))
    rota = _safe_fetch_all(conn, "SELECT * FROM rota WHERE home_id = %s ORDER BY shift_date DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    onboarding = _safe_fetch_all(conn, "SELECT * FROM onboarding WHERE home_id = %s ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    incidents = _safe_fetch_all(conn, "SELECT * FROM incidents WHERE home_id = %s ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 40", (home_id,))
    vacancies = _safe_fetch_all(conn, "SELECT * FROM vacancies WHERE home_id = %s ORDER BY COALESCE(closing_date, opening_date) DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 20", (home_id,))
    visitors = _safe_fetch_all(conn, "SELECT * FROM visitor_log WHERE home_id = %s ORDER BY COALESCE(arrived_at, arrival_time, created_at) DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    transport = _safe_fetch_all(conn, "SELECT * FROM transport_journeys WHERE home_id = %s ORDER BY journey_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    staff_support_plans = _safe_fetch_all(conn, "SELECT * FROM staff_support_plans WHERE home_id = %s ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 30", (home_id,))
    wellbeing_checkins = _safe_fetch_all(conn, "SELECT * FROM staff_wellbeing_checkins WHERE home_id = %s ORDER BY checkin_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 30", (home_id,))

    summary = {
        "children_count": len(young_people),
        "team_count": len(team),
        "open_tasks": len(tasks),
        "document_count": len(documents),
        "supervision_count": len(supervision_sessions),
        "report_count": len(reports),
        "training_count": len(training_records),
        "inspection_action_count": len(inspection_actions),
        "incident_count": len(incidents),
        "home_name": (home or {}).get("home_name") or (home or {}).get("name"),
    }

    return {
        "scope": {
            "scope_type": "home",
            "scope": "home",
            "home_id": home_id,
            "young_person_id": None,
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
            "access_level": "home",
            "provider_id": scope.get("provider_id") or _get_user_provider(conn, user_id),
            "allowed_home_ids": [home_id],
        },
        "home": home,
        "home_id": home_id,
        "summary": summary,
        "young_people": young_people,
        "team": team,
        "tasks": tasks,
        "communications": communications,
        "documents": documents,
        "supervisions": supervision_sessions,
        "therapy": therapy_session_notes,
        "inspection_actions": inspection_actions,
        "inspection_lines": inspection_lines,
        "reports": reports,
        "training": training_records,
        "rota": rota,
        "onboarding": onboarding,
        "incidents": incidents,
        "vacancies": vacancies,
        "visitors": visitors,
        "transport": transport,
        "staff_support_plans": staff_support_plans,
        "wellbeing_checkins": wellbeing_checkins,
        "evidence_index": _build_home_evidence_index(
            home_id=home_id,
            team=team,
            tasks=tasks,
            communications=communications,
            documents=documents,
            supervision_sessions=supervision_sessions,
            therapy_session_notes=therapy_session_notes,
            inspection_actions=inspection_actions,
            inspection_lines=inspection_lines,
            reports=reports,
            training_records=training_records,
            rota=rota,
            onboarding=onboarding,
            incidents=incidents,
            vacancies=vacancies,
            visitors=visitors,
            transport=transport,
            staff_support_plans=staff_support_plans,
            wellbeing_checkins=wellbeing_checkins,
        ),
    }


def _build_quality_evidence_index(
    *,
    selected_home_id: int | None,
    audits: list[dict[str, Any]],
    incidents: list[dict[str, Any]],
    compliance_items: list[dict[str, Any]],
    reports: list[dict[str, Any]],
    team: list[dict[str, Any]],
    supervisions: list[dict[str, Any]],
    documents: list[dict[str, Any]],
    inspection_cards: list[dict[str, Any]],
    inspection_actions: list[dict[str, Any]],
    inspection_reasons: list[dict[str, Any]],
    inspection_lines: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_index: list[dict[str, Any]] = []

    _extend_evidence_index(evidence_index, scope_type="quality", record_type="quality_audit", items=audits, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="incident", items=incidents, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="compliance_item", items=compliance_items, home_id=selected_home_id, section="compliance")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="report", items=reports, home_id=selected_home_id, section="reports")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="staff", items=team, home_id=selected_home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="supervision_session", items=supervisions, home_id=selected_home_id, section="supervision")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="document", items=documents, home_id=selected_home_id, section="documents")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_scorecard", items=inspection_cards, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_action", items=inspection_actions, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_reason", items=inspection_reasons, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_line_of_enquiry", items=inspection_lines, home_id=selected_home_id, section="quality")

    return _sort_evidence_index(_dedupe_evidence_index(evidence_index))


def build_quality_os_context(
    conn,
    *,
    user_id: int,
    scope: dict[str, Any] | None = None,
) -> dict[str, Any]:
    scope = _normalise_scope(scope)
    quality_access = _assert_quality_access(
        conn,
        user_id,
        home_id=scope.get("home_id"),
        access_level=scope.get("access_level") or "home",
        allowed_home_ids=scope.get("allowed_home_ids") or [],
    )

    allowed_home_ids = quality_access["allowed_home_ids"]
    selected_home_id = quality_access["selected_home_id"]
    access_level = quality_access["access_level"]

    if not allowed_home_ids:
        return {
            "scope": {
                "scope_type": "quality",
                "scope": "quality",
                "home_id": selected_home_id,
                "young_person_id": None,
                "record_type": scope.get("record_type"),
                "record_id": scope.get("record_id"),
                "access_level": access_level,
                "provider_id": scope.get("provider_id") or _get_user_provider(conn, user_id),
                "allowed_home_ids": [],
            },
            "homes": [],
            "summary": {},
            "audits": [],
            "incidents": [],
            "compliance_items": [],
            "reports": [],
            "team": [],
            "supervisions": [],
            "documents": [],
            "inspection_cards": [],
            "inspection_actions": [],
            "inspection_reasons": [],
            "inspection_lines": [],
            "evidence_index": [],
        }

    homes = _safe_fetch_all(
        conn,
        """
        SELECT
            h.id,
            h.name,
            h.name AS home_name,
            h.created_at,
            h.updated_at
        FROM homes h
        WHERE h.id = ANY(%s)
        ORDER BY h.name ASC, h.id ASC
        """,
        (allowed_home_ids,),
    )

    audits = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_home_cards WHERE home_id = ANY(%s) ORDER BY scored_at DESC NULLS LAST", (allowed_home_ids,))
    incidents = _safe_fetch_all(conn, "SELECT * FROM incidents WHERE home_id = ANY(%s) ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 100", (allowed_home_ids,))
    compliance_items = _safe_fetch_all(conn, "SELECT * FROM tasks WHERE home_id = ANY(%s) AND compliance_generated = TRUE ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 100", (allowed_home_ids,))
    reports = _safe_fetch_all(conn, "SELECT * FROM reports WHERE home_id = ANY(%s) ORDER BY created_at DESC NULLS LAST, id DESC LIMIT 80", (allowed_home_ids,))
    team = _safe_fetch_all(conn, "SELECT * FROM staff WHERE home_id = ANY(%s) ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 100", (allowed_home_ids,))
    supervisions = _safe_fetch_all(conn, "SELECT * FROM supervision_sessions WHERE home_id = ANY(%s) ORDER BY COALESCE(completed_date, scheduled_date) DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 100", (allowed_home_ids,))
    documents = _safe_fetch_all(conn, "SELECT * FROM statutory_documents WHERE home_id = ANY(%s) ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC LIMIT 100", (allowed_home_ids,))
    inspection_cards = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_home_cards WHERE home_id = ANY(%s) ORDER BY scored_at DESC NULLS LAST", (allowed_home_ids,))
    inspection_actions = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_action_board WHERE home_id = ANY(%s) ORDER BY due_date ASC NULLS LAST, action_impact_priority_score DESC NULLS LAST", (allowed_home_ids,))
    inspection_reasons = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_reasons_drilldown WHERE home_id = ANY(%s) ORDER BY priority ASC NULLS LAST, created_at DESC NULLS LAST", (allowed_home_ids,))
    inspection_lines = _safe_fetch_all(conn, "SELECT * FROM vw_ui_inspection_loe_board WHERE home_id = ANY(%s) ORDER BY due_date ASC NULLS LAST, created_at DESC NULLS LAST", (allowed_home_ids,))

    summary = {
        "homes_count": len(homes),
        "audits_count": len(audits),
        "incidents_count": len(incidents),
        "compliance_count": len(compliance_items),
        "reports_count": len(reports),
        "team_count": len(team),
        "supervisions_count": len(supervisions),
        "documents_count": len(documents),
        "inspection_cards_count": len(inspection_cards),
        "inspection_actions_count": len(inspection_actions),
    }

    return {
        "scope": {
            "scope_type": "quality",
            "scope": "quality",
            "home_id": selected_home_id,
            "young_person_id": None,
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
            "access_level": access_level,
            "provider_id": scope.get("provider_id") or _get_user_provider(conn, user_id),
            "allowed_home_ids": allowed_home_ids,
        },
        "homes": homes,
        "summary": summary,
        "audits": audits,
        "incidents": incidents,
        "compliance_items": compliance_items,
        "reports": reports,
        "team": team,
        "supervisions": supervisions,
        "documents": documents,
        "inspection_cards": inspection_cards,
        "inspection_actions": inspection_actions,
        "inspection_reasons": inspection_reasons,
        "inspection_lines": inspection_lines,
        "evidence_index": _build_quality_evidence_index(
            selected_home_id=selected_home_id,
            audits=audits,
            incidents=incidents,
            compliance_items=compliance_items,
            reports=reports,
            team=team,
            supervisions=supervisions,
            documents=documents,
            inspection_cards=inspection_cards,
            inspection_actions=inspection_actions,
            inspection_reasons=inspection_reasons,
            inspection_lines=inspection_lines,
        ),
    }


def build_public_context(*, scope: dict[str, Any] | None = None) -> dict[str, Any]:
    _ = _normalise_scope(scope)

    return {
        "scope": {
            "scope_type": "global",
            "scope": "global",
            "home_id": None,
            "young_person_id": None,
            "record_type": None,
            "record_id": None,
            "access_level": None,
            "provider_id": None,
            "allowed_home_ids": [],
        },
        "home_id": None,
        "tasks": [],
        "manager_updates": [],
        "handover": [],
        "chronology": [],
        "documents": [],
        "incidents": [],
        "compliance_items": [],
        "public_context": {
            "assistant_type": "public",
            "os_data_available": False,
            "young_person_data_available": False,
            "home_data_available": False,
        },
        "evidence_index": [],
    }


def build_assistant_context(
    conn,
    *,
    user_id: int,
    scope: dict[str, Any] | None,
    assistant_type: AssistantType = "young_people_os",
) -> dict[str, Any]:
    scope = _normalise_scope(scope)
    scope_type = scope.get("scope_type") or "global"

    if assistant_type == "public":
        if scope_type != "global":
            raise PermissionError("Public assistant does not support scoped OS access")
        if scope.get("home_id") is not None or scope.get("young_person_id") is not None:
            raise PermissionError("Public assistant cannot access home or young person records")
        if scope.get("record_type") or scope.get("record_id") is not None:
            raise PermissionError("Public assistant cannot access scoped record context")
        return build_public_context(scope=scope)

    if assistant_type == "young_people_os":
        if scope_type != "young_person":
            raise ValueError("Unsupported scope_type for young people assistant")
        young_person_id = scope.get("young_person_id")
        if not young_person_id:
            raise ValueError("young_person_id is required for young_person scope")
        return build_young_person_context(
            conn,
            user_id=user_id,
            young_person_id=int(young_person_id),
            scope=scope,
        )

    if assistant_type == "home_os":
        if scope_type != "home":
            raise ValueError("Unsupported scope_type for home assistant")
        return build_home_os_context(
            conn,
            user_id=user_id,
            scope=scope,
        )

    if assistant_type == "quality_os":
        if scope_type != "quality":
            raise ValueError("Unsupported scope_type for quality assistant")
        return build_quality_os_context(
            conn,
            user_id=user_id,
            scope=scope,
        )

    raise ValueError("Unsupported assistant_type")


# =========================
# REPORT CONTEXT BUILDERS
# =========================

def build_monthly_report_context(
    conn,
    *,
    home_id: int | None,
    start_date,
    end_date,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
    generated_by: int | None = None,
) -> dict[str, Any]:
    home_ids = allowed_home_ids or ([home_id] if home_id is not None else [])
    if not home_ids:
        return {
            "report_type": "monthly",
            "period": {"start_date": str(start_date), "end_date": str(end_date)},
            "home_ids": [],
            "allowed_home_ids": [],
            "access_level": access_level,
            "provider_id": provider_id,
            "homes": [],
            "children_outcomes": [],
            "incident_summary": [],
            "safeguarding_summary": [],
            "compliance_summary": [],
            "staffing_summary": {},
            "supervision_summary": {},
            "management_summary": {},
            "positive_indicators": {},
            "evidence_index": [],
        }

    homes = _safe_fetch_all(
        conn,
        """
        SELECT id, name, name AS home_name, provider_id
        FROM homes
        WHERE id = ANY(%s)
        ORDER BY name ASC, id ASC
        """,
        (home_ids,),
    )

    children_outcomes = _safe_fetch_all(
        conn,
        """
        SELECT
            yp.home_id,
            yp.id AS young_person_id,
            COALESCE(yp.preferred_name, CONCAT_WS(' ', yp.first_name, yp.last_name)) AS young_person_name,
            yp.placement_status,
            yp.summary_risk_level,
            (
                SELECT COUNT(*) FROM education_records er
                WHERE er.young_person_id = yp.id
                  AND er.record_date BETWEEN %s AND %s
            ) AS education_records_count,
            (
                SELECT COUNT(*) FROM health_records hr
                WHERE hr.young_person_id = yp.id
                  AND hr.event_datetime BETWEEN %s AND %s
            ) AS health_records_count,
            (
                SELECT COUNT(*) FROM family_contact_records fcr
                WHERE fcr.young_person_id = yp.id
                  AND fcr.contact_datetime BETWEEN %s AND %s
            ) AS family_contact_records_count,
            (
                SELECT COUNT(*) FROM achievement_records ar
                WHERE ar.young_person_id = yp.id
                  AND ar.achievement_date BETWEEN %s AND %s
            ) AS achievement_records_count,
            (
                SELECT COUNT(*) FROM incidents i
                WHERE i.young_person_id = yp.id
                  AND i.incident_datetime BETWEEN %s AND %s
            ) AS incidents_count,
            (
                SELECT COUNT(*) FROM missing_episodes me
                WHERE me.young_person_id = yp.id
                  AND me.start_datetime BETWEEN %s AND %s
            ) AS missing_episodes_count,
            (
                SELECT COUNT(*) FROM keywork_sessions ks
                WHERE ks.young_person_id = yp.id
                  AND ks.session_date BETWEEN %s AND %s
            ) AS keywork_sessions_count
        FROM young_people yp
        WHERE yp.home_id = ANY(%s)
          AND COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.home_id ASC, yp.first_name ASC, yp.last_name ASC, yp.id ASC
        """,
        (
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            start_date, end_date,
            home_ids,
        ),
    )

    incident_summary = _safe_fetch_all(
        conn,
        """
        SELECT home_id, incident_type, COUNT(*) AS count
        FROM incidents
        WHERE home_id = ANY(%s)
          AND incident_datetime BETWEEN %s AND %s
        GROUP BY home_id, incident_type
        ORDER BY home_id ASC, count DESC, incident_type ASC
        """,
        (home_ids, start_date, end_date),
    )

    safeguarding_summary = _safe_fetch_all(
        conn,
        """
        SELECT home_id, safeguarding_category, status, COUNT(*) AS count
        FROM safeguarding_records
        WHERE home_id = ANY(%s)
          AND concern_datetime BETWEEN %s AND %s
        GROUP BY home_id, safeguarding_category, status
        ORDER BY home_id ASC, count DESC
        """,
        (home_ids, start_date, end_date),
    )

    compliance_summary = _safe_fetch_all(
        conn,
        """
        SELECT home_id, status, priority AS severity, COUNT(*) AS count
        FROM tasks
        WHERE home_id = ANY(%s)
          AND COALESCE(compliance_generated, FALSE) = TRUE
          AND updated_at BETWEEN %s AND %s
        GROUP BY home_id, status, priority
        ORDER BY home_id ASC, count DESC
        """,
        (home_ids, start_date, end_date),
    )

    staffing_summary = {
        "staff_assignments": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM staff
            WHERE home_id = ANY(%s)
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids,),
        ),
        "staff_status": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM staff
            WHERE home_id = ANY(%s)
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids,),
        ),
        "roster_shifts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM rota
            WHERE home_id = ANY(%s)
              AND shift_date BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "staff_shifts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM shifts
            WHERE home_id = ANY(%s)
              AND shift_date BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "checkins": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM staff_wellbeing_checkins
            WHERE home_id = ANY(%s)
              AND created_at BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    supervision_summary = {
        "supervision_notes": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM supervision_notes
            WHERE home_id = ANY(%s)
              AND created_at BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_submissions": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM supervision_submissions
            WHERE home_id = ANY(%s)
              AND submitted_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_summaries": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM supervision_sessions
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    management_summary = {
        "manager_updates": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM tasks
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "manager_actions": _safe_fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM transition_actions
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "monthly_reviews": [],
        "review_meetings": [],
    }

    positive_indicators = {
        "achievement_counts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM achievement_records
            WHERE home_id = ANY(%s)
              AND achievement_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "keywork_counts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM keywork_sessions
            WHERE home_id = ANY(%s)
              AND session_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "family_contact_counts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM family_contact_records
            WHERE home_id = ANY(%s)
              AND contact_datetime BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
        "daily_notes_counts": _safe_fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM daily_notes
            WHERE home_id = ANY(%s)
              AND note_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    evidence_index: list[dict[str, Any]] = []
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="incident_summary", items=incident_summary, home_id=home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="safeguarding_summary", items=safeguarding_summary, home_id=home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="compliance_summary", items=compliance_summary, home_id=home_id, section="quality")

    return {
        "report_type": "monthly",
        "period": {"start_date": str(start_date), "end_date": str(end_date)},
        "home_id": home_id,
        "home_ids": home_ids,
        "allowed_home_ids": home_ids,
        "access_level": access_level,
        "provider_id": provider_id,
        "generated_by": generated_by,
        "homes": homes,
        "children_outcomes": children_outcomes,
        "incident_summary": incident_summary,
        "safeguarding_summary": safeguarding_summary,
        "compliance_summary": compliance_summary,
        "staffing_summary": staffing_summary,
        "supervision_summary": supervision_summary,
        "management_summary": management_summary,
        "positive_indicators": positive_indicators,
        "evidence_index": _sort_evidence_index(_dedupe_evidence_index(evidence_index)),
    }


def build_reg45_context(
    conn,
    *,
    home_id: int | None,
    start_date,
    end_date,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
    generated_by: int | None = None,
) -> dict[str, Any]:
    result = build_monthly_report_context(
        conn,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
    )
    result["report_type"] = "reg45"
    return result


def build_yearly_report_context(
    conn,
    *,
    home_id: int | None,
    start_date,
    end_date,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
    generated_by: int | None = None,
) -> dict[str, Any]:
    result = build_monthly_report_context(
        conn,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
        generated_by=generated_by,
    )
    result["report_type"] = "yearly"
    return result


def preview_report_snapshot(
    conn,
    *,
    report_type: str,
    home_id: int | None,
    start_date,
    end_date,
    access_level: str | None = None,
    allowed_home_ids: list[int] | None = None,
    provider_id: int | None = None,
) -> dict[str, Any]:
    if report_type == "reg45":
        return build_reg45_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        )
    if report_type == "yearly":
        return build_yearly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
        )
    return build_monthly_report_context(
        conn,
        home_id=home_id,
        start_date=start_date,
        end_date=end_date,
        access_level=access_level,
        allowed_home_ids=allowed_home_ids,
        provider_id=provider_id,
    )
