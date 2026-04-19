from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from psycopg2.extras import RealDictCursor


AssistantType = Literal["public", "young_people_os", "home_os", "quality_os"]


# ============================================================================
# DB helpers
# ============================================================================

def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchone()


def _fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return list(cur.fetchall())


def _fetch_one_safe(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    try:
        return _fetch_one(conn, query, params)
    except Exception:
        return None


def _fetch_all_safe(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    try:
        return _fetch_all(conn, query, params)
    except Exception:
        return []


# ============================================================================
# Safe primitives
# ============================================================================

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


def _isoish(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    text = _safe_string(value)
    return text or None


# ============================================================================
# Scope / access
# ============================================================================

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


def _get_user_row(conn, user_id: int) -> dict[str, Any] | None:
    return _fetch_one_safe(
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
    return _safe_int(row.get("home_id")) if row else None


def _get_user_provider(conn, user_id: int) -> int | None:
    row = _get_user_row(conn, user_id)
    return _safe_int(row.get("provider_id")) if row else None


def _get_user_role(conn, user_id: int) -> str:
    row = _get_user_row(conn, user_id)
    return _safe_string(row.get("role")).lower() if row else ""


def _is_provider_level_role(role: str) -> bool:
    return role in {"admin", "provider_admin", "ri", "responsible_individual", "super_admin", "superadmin"}


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

    young_person = _fetch_one_safe(
        conn,
        """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.preferred_name,
            yp.date_of_birth,
            yp.gender,
            yp.ethnicity,
            yp.nhs_number,
            yp.local_id_number,
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.photo_url,
            yp.archived,
            yp.created_at,
            yp.updated_at,
            yp.provider_id,
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


# ============================================================================
# Evidence helpers
# ============================================================================

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
            "home_name",
            "full_name",
            "staff_name",
            "staff_member",
            "action_title",
            "line_of_enquiry",
            "reason_title",
            "section_name",
            "vacancy_title",
            "course_name",
            "session_title",
            "document_title",
            "summary",
            "incident_type",
            "visitor_name",
            "booking_type",
            "purpose",
            "status",
        ],
    )
    if value not in (None, ""):
        return _safe_string(value)
    return record_type.replace("_", " ").title()


def _record_excerpt(item: dict[str, Any], max_chars: int = 260) -> str:
    value = _first_non_empty(
        item,
        [
            "summary",
            "description",
            "details",
            "action_description",
            "finding_text",
            "rationale",
            "concern_summary",
            "session_summary",
            "report_summary",
            "notes",
            "top_concerns",
            "urgent_actions",
            "narrative_summary",
            "concerns_summary",
            "headline_summary",
            "overall_position_statement",
            "section_summary",
            "likely_inspector_focus",
            "immediate_priority_actions",
            "improvement_potential_statement",
            "overall_summary",
            "recommendations_summary",
        ],
    )
    text = _safe_string(value)
    return text[:max_chars] if text else ""


def _record_date(item: dict[str, Any]) -> str | None:
    value = _first_non_empty(
        item,
        [
            "event_datetime",
            "incident_datetime",
            "contact_datetime",
            "appointment_date",
            "session_date",
            "scheduled_date",
            "completed_date",
            "review_date",
            "next_due_date",
            "checkin_date",
            "audit_date",
            "visit_date",
            "report_date",
            "journey_date",
            "booking_date",
            "shift_date",
            "arrival_time",
            "arrived_at",
            "departed_at",
            "departure_time",
            "start_datetime",
            "end_datetime",
            "due_date",
            "expiry_date",
            "created_at",
            "updated_at",
            "scored_at",
            "last_reg44_visit_date",
            "last_reg45_review_end",
            "next_action_due_date",
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
        "support_plan": "plans",
        "risk": "plans",
        "task": "readiness",
        "appointment": "calendar",
        "statutory_document": "documents",
        "therapy_case": "therapy",
        "therapy_session": "therapy",
        "staff_user": "team",
        "training_record": "team",
        "support_plan_staff": "team",
        "supervision_session": "supervision",
        "supervision_cycle": "supervision",
        "wellbeing_checkin_staff": "team",
        "vacancy": "team",
        "inspection_home_card": "quality",
        "inspection_action": "quality",
        "inspection_reason": "quality",
        "inspection_section": "quality",
        "inspection_briefing": "quality",
        "inspection_reg44": "quality",
        "inspection_reg45": "quality",
        "inspection_tasks_overdue": "quality",
        "inspection_staff_training": "quality",
        "inspection_staffing_profile": "quality",
        "inspection_compliance_status": "quality",
        "transition_plan": "plans",
        "transition_action": "plans",
        "visitor_log": "workspace",
        "vehicle_booking": "workspace",
        "transport_journey": "workspace",
        "transport_booking": "workspace",
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

    return {
        "citation_ref": f"{record_type}:{record_id}",
        "record_type": record_type,
        "record_id": record_id,
        "label": _record_title(record_type, item),
        "excerpt": _record_excerpt(item),
        "date": _record_date(item),
        "section": resolved_section,
        "scope_type": scope_type,
        "young_person_id": young_person_id,
        "home_id": home_id,
        "url": _build_deep_link(
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


# ============================================================================
# Young person context
# ============================================================================

def _build_identity_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "communication_profile": _fetch_one_safe(
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
        "education_profile": _fetch_one_safe(
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
        "health_profile": _fetch_one_safe(
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
        "identity_profile": _fetch_one_safe(
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
        "legal_status": _fetch_one_safe(
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
        "current_formulation": _fetch_one_safe(
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
        "contacts": _fetch_all_safe(
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
        "active_alerts": _fetch_all_safe(
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
        "all_about_me": _fetch_one_safe(
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
        "support_plans": _fetch_all_safe(
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
        "support_plan_targets": _fetch_all_safe(
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
        "appointments": _fetch_all_safe(
            conn,
            """
            SELECT *
            FROM young_person_appointments
            WHERE young_person_id = %s
            ORDER BY appointment_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "statutory_documents": _fetch_all_safe(
            conn,
            """
            SELECT *
            FROM statutory_documents
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 15
            """,
            (young_person_id,),
        ),
        "compliance_items": _fetch_all_safe(
            conn,
            """
            SELECT *
            FROM compliance_items
            WHERE young_person_id = %s
            ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "tasks": _fetch_all_safe(
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
        "therapy_cases": _fetch_all_safe(
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
        "transition_plans": _fetch_all_safe(
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
        "transition_actions": _fetch_all_safe(
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
    }


def _build_recent_records_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "daily_notes": _fetch_all_safe(
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
        "incidents": _fetch_all_safe(
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
        "health_records": _fetch_all_safe(
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
        "education_records": _fetch_all_safe(
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
        "family_contact_records": _fetch_all_safe(
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
        "keywork_sessions": _fetch_all_safe(
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
        "missing_episodes": _fetch_all_safe(
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
        "safeguarding_records": _fetch_all_safe(
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
        "achievements": _fetch_all_safe(
            conn,
            """
            SELECT *
            FROM achievement_records
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY achievement_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "chronology": _fetch_all_safe(
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
        "therapy_session_notes": _fetch_all_safe(
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
        "wellbeing_checks": _fetch_all_safe(
            conn,
            """
            SELECT *
            FROM wellbeing_checks
            WHERE young_person_id = %s
            ORDER BY check_datetime DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 12
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

    table_map = {
        "daily_note": "daily_notes",
        "incident": "incidents",
        "support_plan": "support_plans",
        "appointment": "young_person_appointments",
        "health_record": "health_records",
        "education_record": "education_records",
        "family_contact": "family_contact_records",
        "keywork": "keywork_sessions",
        "missing_episode": "missing_episodes",
        "safeguarding_record": "safeguarding_records",
        "achievement_record": "achievement_records",
        "task": "tasks",
        "statutory_document": "statutory_documents",
        "therapy_session": "therapy_session_notes",
        "therapy_case": "therapy_cases",
        "transition_plan": "transition_plans",
        "transition_action": "transition_actions",
    }

    table_name = table_map.get(record_type)
    record: dict[str, Any] | None = None

    if table_name:
        record = _fetch_one_safe(
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

    related_workflow_events = _fetch_all_safe(
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

    related_standards = _fetch_all_safe(
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

    related_chronology = _fetch_all_safe(
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
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="appointment", items=active_work.get("appointments"), young_person_id=young_person_id, home_id=home_id, section="calendar")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="statutory_document", items=active_work.get("statutory_documents"), young_person_id=young_person_id, home_id=home_id, section="documents")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="compliance_item", items=active_work.get("compliance_items"), young_person_id=young_person_id, home_id=home_id, section="readiness")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="task", items=active_work.get("tasks"), young_person_id=young_person_id, home_id=home_id, section="readiness")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="therapy_case", items=active_work.get("therapy_cases"), young_person_id=young_person_id, home_id=home_id, section="therapy")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="transition_plan", items=active_work.get("transition_plans"), young_person_id=young_person_id, home_id=home_id, section="plans")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="transition_action", items=active_work.get("transition_actions"), young_person_id=young_person_id, home_id=home_id, section="plans")

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
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="therapy_session", items=recent_records.get("therapy_session_notes"), young_person_id=young_person_id, home_id=home_id, section="therapy")
    _extend_evidence_index(evidence_index, scope_type="young_person", record_type="wellbeing_check", items=recent_records.get("wellbeing_checks"), young_person_id=young_person_id, home_id=home_id, section="health")

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


# ============================================================================
# Home context
# ============================================================================

def _build_home_header(conn, home_id: int) -> dict[str, Any] | None:
    return _fetch_one_safe(
        conn,
        """
        SELECT
            h.id,
            h.name,
            h.name AS home_name,
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
    documents: list[dict[str, Any]],
    supervision_sessions: list[dict[str, Any]],
    supervision_cycles: list[dict[str, Any]],
    training_records: list[dict[str, Any]],
    staff_support_plans: list[dict[str, Any]],
    staff_wellbeing_checkins: list[dict[str, Any]],
    vacancies: list[dict[str, Any]],
    incidents: list[dict[str, Any]],
    visitors: list[dict[str, Any]],
    transport_bookings: list[dict[str, Any]],
    transport_journeys: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_index: list[dict[str, Any]] = []

    _extend_evidence_index(evidence_index, scope_type="home", record_type="staff_user", items=team, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="task", items=tasks, home_id=home_id, section="readiness")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="statutory_document", items=documents, home_id=home_id, section="documents")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="supervision_session", items=supervision_sessions, home_id=home_id, section="supervision")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="supervision_cycle", items=supervision_cycles, home_id=home_id, section="supervision")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="training_record", items=training_records, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="support_plan_staff", items=staff_support_plans, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="wellbeing_checkin_staff", items=staff_wellbeing_checkins, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="vacancy", items=vacancies, home_id=home_id, section="team")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="incident", items=incidents, home_id=home_id, section="timeline")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="visitor_log", items=visitors, home_id=home_id, section="workspace")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="transport_booking", items=transport_bookings, home_id=home_id, section="workspace")
    _extend_evidence_index(evidence_index, scope_type="home", record_type="transport_journey", items=transport_journeys, home_id=home_id, section="workspace")

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

    young_people = _fetch_all_safe(
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

    # Use users as the safest workforce source because it exists in your schema.
    team = _fetch_all_safe(
        conn,
        """
        SELECT
            u.id,
            u.home_id,
            u.provider_id,
            u.first_name,
            u.last_name,
            CONCAT_WS(' ', u.first_name, u.last_name) AS full_name,
            u.email,
            u.role,
            u.account_status AS status,
            u.is_active,
            u.last_login_at,
            u.updated_at
        FROM users u
        WHERE u.home_id = %s
          AND COALESCE(u.archived, FALSE) = FALSE
        ORDER BY u.updated_at DESC NULLS LAST, u.id DESC
        LIMIT 100
        """,
        (home_id,),
    )

    tasks = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM tasks
        WHERE home_id = %s
        ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 60
        """,
        (home_id,),
    )

    documents = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM statutory_documents
        WHERE home_id = %s
          AND COALESCE(archived, FALSE) = FALSE
        ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    supervision_sessions = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM supervision_sessions
        WHERE home_id = %s
        ORDER BY next_session_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    supervision_cycles = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM supervision_cycles
        WHERE home_id = %s
        ORDER BY next_due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    training_records = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM staff_training_records
        WHERE home_id = %s
        ORDER BY expires_on ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 60
        """,
        (home_id,),
    )

    staff_support_plans = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM staff_support_plans
        WHERE home_id = %s
        ORDER BY review_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    staff_wellbeing_checkins = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM staff_wellbeing_checkins
        WHERE home_id = %s
        ORDER BY follow_up_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    vacancies = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vacancies
        WHERE home_id = %s
        ORDER BY closing_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    incidents = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM incidents
        WHERE home_id = %s
        ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    visitors = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM visitor_log
        WHERE home_id = %s
        ORDER BY COALESCE(arrived_at, arrival_time, created_at) DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    transport_bookings = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM transport_bookings
        WHERE home_id = %s
        ORDER BY booking_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    transport_journeys = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM transport_journeys
        WHERE home_id = %s
        ORDER BY journey_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    summary = {
        "children_count": len(young_people),
        "team_count": len(team),
        "tasks_count": len(tasks),
        "documents_count": len(documents),
        "supervision_sessions_count": len(supervision_sessions),
        "supervision_cycles_count": len(supervision_cycles),
        "training_count": len(training_records),
        "staff_support_plan_count": len(staff_support_plans),
        "wellbeing_checkins_count": len(staff_wellbeing_checkins),
        "vacancy_count": len(vacancies),
        "incident_count": len(incidents),
        "visitor_count": len(visitors),
        "transport_booking_count": len(transport_bookings),
        "transport_journey_count": len(transport_journeys),
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
        "documents": documents,
        "supervision_sessions": supervision_sessions,
        "supervision_cycles": supervision_cycles,
        "training_records": training_records,
        "staff_support_plans": staff_support_plans,
        "staff_wellbeing_checkins": staff_wellbeing_checkins,
        "vacancies": vacancies,
        "incidents": incidents,
        "visitors": visitors,
        "transport_bookings": transport_bookings,
        "transport_journeys": transport_journeys,
        "evidence_index": _build_home_evidence_index(
            home_id=home_id,
            team=team,
            tasks=tasks,
            documents=documents,
            supervision_sessions=supervision_sessions,
            supervision_cycles=supervision_cycles,
            training_records=training_records,
            staff_support_plans=staff_support_plans,
            staff_wellbeing_checkins=staff_wellbeing_checkins,
            vacancies=vacancies,
            incidents=incidents,
            visitors=visitors,
            transport_bookings=transport_bookings,
            transport_journeys=transport_journeys,
        ),
    }


# ============================================================================
# Quality context
# ============================================================================

def _build_quality_evidence_index(
    *,
    selected_home_id: int | None,
    home_cards: list[dict[str, Any]],
    action_board: list[dict[str, Any]],
    reasons: list[dict[str, Any]],
    sections: list[dict[str, Any]],
    briefing: list[dict[str, Any]],
    reg44_status: list[dict[str, Any]],
    reg45_status: list[dict[str, Any]],
    tasks_overdue: list[dict[str, Any]],
    staff_training_status: list[dict[str, Any]],
    staffing_profile: list[dict[str, Any]],
    compliance_status: list[dict[str, Any]],
    open_quality_actions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_index: list[dict[str, Any]] = []

    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_home_card", items=home_cards, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_action", items=action_board, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_reason", items=reasons, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_section", items=sections, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_briefing", items=briefing, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_reg44", items=reg44_status, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_reg45", items=reg45_status, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_tasks_overdue", items=tasks_overdue, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_staff_training", items=staff_training_status, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_staffing_profile", items=staffing_profile, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="inspection_compliance_status", items=compliance_status, home_id=selected_home_id, section="quality")
    _extend_evidence_index(evidence_index, scope_type="quality", record_type="quality_open_actions", items=open_quality_actions, home_id=selected_home_id, section="quality")

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
            "home_cards": [],
            "action_board": [],
            "reasons": [],
            "sections": [],
            "briefing": [],
            "reg44_status": [],
            "reg45_status": [],
            "tasks_overdue": [],
            "staff_training_status": [],
            "staffing_profile": [],
            "compliance_status": [],
            "open_quality_actions": [],
            "evidence_index": [],
        }

    homes = _fetch_all_safe(
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

    # These are all real views/tables from your schema.
    home_cards = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_ui_inspection_home_cards
        WHERE home_id = ANY(%s)
        ORDER BY scored_at DESC NULLS LAST, home_name ASC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    action_board = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_ui_inspection_action_board
        WHERE home_id = ANY(%s)
        ORDER BY action_impact_priority_score DESC NULLS LAST, due_date ASC NULLS LAST
        LIMIT 150
        """,
        (allowed_home_ids,),
    )

    reasons = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_ui_inspection_reasons_drilldown
        WHERE home_id = ANY(%s)
        ORDER BY priority ASC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 150
        """,
        (allowed_home_ids,),
    )

    sections = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_ui_inspection_section_panels
        WHERE home_id = ANY(%s)
        ORDER BY scored_at DESC NULLS LAST, section_name ASC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    briefing = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_ui_inspection_briefing_panel
        WHERE home_id = ANY(%s)
        LIMIT 50
        """,
        (allowed_home_ids,),
    )

    reg44_status = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_reg44_status
        WHERE home_id = ANY(%s)
        ORDER BY last_reg44_visit_date DESC NULLS LAST
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    reg45_status = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_reg45_status
        WHERE home_id = ANY(%s)
        ORDER BY last_reg45_review_end DESC NULLS LAST
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    tasks_overdue = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_tasks_overdue
        WHERE home_id = ANY(%s)
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    staff_training_status = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_staff_training_status
        WHERE home_id = ANY(%s)
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    staffing_profile = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_staffing_profile
        WHERE home_id = ANY(%s)
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    compliance_status = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_inspection_compliance_items_status
        WHERE home_id = ANY(%s)
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    open_quality_actions = _fetch_all_safe(
        conn,
        """
        SELECT *
        FROM vw_home_open_quality_actions
        WHERE home_id = ANY(%s)
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    summary = {
        "homes_count": len(homes),
        "inspection_home_cards_count": len(home_cards),
        "inspection_action_count": len(action_board),
        "inspection_reason_count": len(reasons),
        "inspection_section_count": len(sections),
        "inspection_briefing_count": len(briefing),
        "reg44_status_count": len(reg44_status),
        "reg45_status_count": len(reg45_status),
        "tasks_overdue_count": len(tasks_overdue),
        "staff_training_status_count": len(staff_training_status),
        "staffing_profile_count": len(staffing_profile),
        "compliance_status_count": len(compliance_status),
        "open_quality_actions_count": len(open_quality_actions),
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
        "home_cards": home_cards,
        "action_board": action_board,
        "reasons": reasons,
        "sections": sections,
        "briefing": briefing,
        "reg44_status": reg44_status,
        "reg45_status": reg45_status,
        "tasks_overdue": tasks_overdue,
        "staff_training_status": staff_training_status,
        "staffing_profile": staffing_profile,
        "compliance_status": compliance_status,
        "open_quality_actions": open_quality_actions,
        "evidence_index": _build_quality_evidence_index(
            selected_home_id=selected_home_id,
            home_cards=home_cards,
            action_board=action_board,
            reasons=reasons,
            sections=sections,
            briefing=briefing,
            reg44_status=reg44_status,
            reg45_status=reg45_status,
            tasks_overdue=tasks_overdue,
            staff_training_status=staff_training_status,
            staffing_profile=staffing_profile,
            compliance_status=compliance_status,
            open_quality_actions=open_quality_actions,
        ),
    }


# ============================================================================
# Public context
# ============================================================================

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
        "public_context": {
            "assistant_type": "public",
            "os_data_available": False,
            "young_person_data_available": False,
            "home_data_available": False,
        },
        "evidence_index": [],
    }


# ============================================================================
# Main assistant context dispatcher
# ============================================================================

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


# ============================================================================
# Report builders
# Keep these tolerant so report requests do not crash if one source is missing.
# ============================================================================

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

    homes = _fetch_all_safe(
        conn,
        """
        SELECT id, name, name AS home_name, provider_id
        FROM homes
        WHERE id = ANY(%s)
        ORDER BY name ASC, id ASC
        """,
        (home_ids,),
    )

    children_outcomes = _fetch_all_safe(
        conn,
        """
        SELECT
            yp.home_id,
            yp.id AS young_person_id,
            COALESCE(yp.preferred_name, CONCAT_WS(' ', yp.first_name, yp.last_name)) AS young_person_name,
            yp.placement_status,
            yp.summary_risk_level
        FROM young_people yp
        WHERE yp.home_id = ANY(%s)
          AND COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.home_id ASC, yp.first_name ASC, yp.last_name ASC, yp.id ASC
        """,
        (home_ids,),
    )

    incident_summary = _fetch_all_safe(
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

    safeguarding_summary = _fetch_all_safe(
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

    compliance_summary = _fetch_all_safe(
        conn,
        """
        SELECT home_id, status, severity, COUNT(*) AS count
        FROM compliance_items
        WHERE home_id = ANY(%s)
          AND updated_at BETWEEN %s AND %s
        GROUP BY home_id, status, severity
        ORDER BY home_id ASC, count DESC
        """,
        (home_ids, start_date, end_date),
    )

    staffing_summary = {
        "staff_users": _fetch_all_safe(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM users
            WHERE home_id = ANY(%s)
              AND COALESCE(archived, FALSE) = FALSE
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids,),
        ),
        "training_records": _fetch_all_safe(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM staff_training_records
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    supervision_summary = {
        "supervision_sessions": _fetch_all_safe(
            conn,
            """
            SELECT home_id, session_status, COUNT(*) AS count
            FROM supervision_sessions
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id, session_status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_submissions": _fetch_all_safe(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM supervision_submissions
            WHERE home_id = ANY(%s)
              AND COALESCE(submitted_at, reviewed_at, NOW()) BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    management_summary = {
        "tasks": _fetch_all_safe(
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
        "quality_actions": _fetch_all_safe(
            conn,
            """
            SELECT home_id, open_quality_action_count AS count
            FROM vw_home_open_quality_actions
            WHERE home_id = ANY(%s)
            ORDER BY home_id ASC
            """,
            (home_ids,),
        ),
    }

    positive_indicators = {
        "achievement_counts": _fetch_all_safe(
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
        "keywork_counts": _fetch_all_safe(
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
        "family_contact_counts": _fetch_all_safe(
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
        "daily_notes_counts": _fetch_all_safe(
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