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
        elif raw_scope in {"home"}:
            raw_scope_type = "home"
        elif raw_scope in {"quality"}:
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
    return _fetch_one(
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
    return role in {"admin", "provider_admin", "ri", "responsible_individual"}


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

    young_person = _fetch_one(
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
        "communication_profile": _fetch_one(
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
        "education_profile": _fetch_one(
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
        "health_profile": _fetch_one(
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
        "identity_profile": _fetch_one(
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
        "legal_status": _fetch_one(
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
        "current_formulation": _fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_formulations
            WHERE young_person_id = %s
              AND is_current = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (young_person_id,),
        ),
        "contacts": _fetch_all(
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
        "active_alerts": _fetch_all(
            conn,
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
              AND is_active = TRUE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
    }


def _build_active_work_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "support_plans": _fetch_all(
            conn,
            """
            SELECT *
            FROM support_plans
            WHERE young_person_id = %s
              AND archived = FALSE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "support_plan_targets": _fetch_all(
            conn,
            """
            SELECT *
            FROM support_plan_targets
            WHERE young_person_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "risk_assessments": _fetch_all(
            conn,
            """
            SELECT *
            FROM risk_assessments
            WHERE young_person_id = %s
              AND archived = FALSE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "appointments": _fetch_all(
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
        "statutory_documents": _fetch_all(
            conn,
            """
            SELECT *
            FROM statutory_documents
            WHERE young_person_id = %s
              AND archived = FALSE
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "compliance_items": _fetch_all(
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
        "tasks": _fetch_all(
            conn,
            """
            SELECT *
            FROM tasks
            WHERE young_person_id = %s
            ORDER BY due_date ASC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
        "monthly_reviews": _fetch_all(
            conn,
            """
            SELECT *
            FROM monthly_reviews
            WHERE young_person_id = %s
            ORDER BY review_month DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 6
            """,
            (young_person_id,),
        ),
        "review_meetings": _fetch_all(
            conn,
            """
            SELECT *
            FROM review_meetings
            WHERE young_person_id = %s
            ORDER BY meeting_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "manager_actions": _fetch_all(
            conn,
            """
            SELECT *
            FROM manager_actions
            WHERE young_person_id = %s
            ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        ),
    }


def _build_recent_records_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "daily_notes": _fetch_all(
            conn,
            """
            SELECT *
            FROM daily_notes
            WHERE young_person_id = %s
            ORDER BY note_date DESC, updated_at DESC NULLS LAST, id DESC
            LIMIT 12
            """,
            (young_person_id,),
        ),
        "incidents": _fetch_all(
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
        "health_records": _fetch_all(
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
        "education_records": _fetch_all(
            conn,
            """
            SELECT *
            FROM education_records
            WHERE young_person_id = %s
            ORDER BY record_date DESC, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "family_contact_records": _fetch_all(
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
        "keywork_sessions": _fetch_all(
            conn,
            """
            SELECT *
            FROM keywork_sessions
            WHERE young_person_id = %s
            ORDER BY session_date DESC, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "missing_episodes": _fetch_all(
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
        "safeguarding_records": _fetch_all(
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
        "achievements": _fetch_all(
            conn,
            """
            SELECT *
            FROM achievement_records
            WHERE young_person_id = %s
              AND archived = FALSE
            ORDER BY achievement_date DESC, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "chronology": _fetch_all(
            conn,
            """
            SELECT *
            FROM chronology_events
            WHERE young_person_id = %s
              AND is_visible = TRUE
            ORDER BY event_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 24
            """,
            (young_person_id,),
        ),
        "handover_records": _fetch_all(
            conn,
            """
            SELECT *
            FROM handover_records
            WHERE young_person_id = %s
            ORDER BY handover_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
        "ai_generated_reports": _fetch_all(
            conn,
            """
            SELECT *
            FROM ai_generated_reports
            WHERE young_person_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        ),
    }


def _build_links_context(conn, young_person_id: int) -> dict[str, Any]:
    return {
        "record_links": _fetch_all(
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
        "record_standard_links": _fetch_all(
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
        "monthly_plan_links": _fetch_all(
            conn,
            """
            SELECT *
            FROM monthly_plan_links
            WHERE young_person_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 50
            """,
            (young_person_id,),
        ),
        "workflow_events": _fetch_all(
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
        "monthly_review_record_links": _fetch_all(
            conn,
            """
            SELECT *
            FROM monthly_review_record_links mrrl
            JOIN monthly_reviews mr ON mr.id = mrrl.monthly_review_id
            WHERE mr.young_person_id = %s
            ORDER BY mrrl.created_at DESC NULLS LAST, mrrl.id DESC
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
        "monthly_review": "monthly_reviews",
    }

    table_name = table_map.get(record_type)
    if table_name:
        record = _fetch_one(
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

    related_workflow_events = _fetch_all(
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

    related_standards = _fetch_all(
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

    related_chronology = _fetch_all(
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

    return {
        "scope": {
            "scope_type": "young_person",
            "scope": "child",
            "home_id": young_person_home_id,
            "young_person_id": young_person_id,
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
            "access_level": "child",
            "provider_id": None,
            "allowed_home_ids": [young_person_home_id] if young_person_home_id else [],
        },
        "young_person": young_person,
        "identity": _build_identity_context(conn, young_person_id),
        "active_work": _build_active_work_context(conn, young_person_id),
        "recent_records": _build_recent_records_context(conn, young_person_id),
        "links": _build_links_context(conn, young_person_id),
        "scoped_record": _build_scoped_record_context(
            conn,
            young_person_id=young_person_id,
            record_type=scope.get("record_type"),
            record_id=scope.get("record_id"),
        ),
    }


def _build_home_header(conn, home_id: int) -> dict[str, Any] | None:
    return _fetch_one(
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

    young_people = _fetch_all(
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

    team = _fetch_all(
        conn,
        """
        SELECT *
        FROM staff
        WHERE home_id = %s
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    tasks = _fetch_all(
        conn,
        """
        SELECT *
        FROM tasks
        WHERE home_id = %s
        ORDER BY due_date ASC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    communications = _fetch_all(
        conn,
        """
        SELECT *
        FROM communications
        WHERE home_id = %s
        ORDER BY contact_datetime DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    documents = _fetch_all(
        conn,
        """
        SELECT *
        FROM documents
        WHERE home_id = %s
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    supervisions = _fetch_all(
        conn,
        """
        SELECT *
        FROM supervisions
        WHERE home_id = %s
        ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    therapy = _fetch_all(
        conn,
        """
        SELECT *
        FROM therapy_records
        WHERE home_id = %s
        ORDER BY session_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    reports = _fetch_all(
        conn,
        """
        SELECT *
        FROM reports
        WHERE home_id = %s
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    compliance_items = _fetch_all(
        conn,
        """
        SELECT *
        FROM compliance_items
        WHERE home_id = %s
        ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 50
        """,
        (home_id,),
    )

    rota = _fetch_all(
        conn,
        """
        SELECT *
        FROM rota
        WHERE home_id = %s
        ORDER BY shift_date DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    onboarding = _fetch_all(
        conn,
        """
        SELECT *
        FROM onboarding
        WHERE home_id = %s
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    training = _fetch_all(
        conn,
        """
        SELECT *
        FROM training
        WHERE home_id = %s
        ORDER BY expiry_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    audits = _fetch_all(
        conn,
        """
        SELECT *
        FROM audits
        WHERE home_id = %s
        ORDER BY audit_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 30
        """,
        (home_id,),
    )

    incidents = _fetch_all(
        conn,
        """
        SELECT *
        FROM incidents
        WHERE home_id = %s
        ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 40
        """,
        (home_id,),
    )

    summary = {
        "children_count": len(young_people),
        "team_count": len(team),
        "open_tasks": len(tasks),
        "document_count": len(documents),
        "supervision_count": len(supervisions),
        "report_count": len(reports),
        "compliance_count": len(compliance_items),
        "audit_count": len(audits),
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
        "supervisions": supervisions,
        "therapy": therapy,
        "reports": reports,
        "compliance_items": compliance_items,
        "rota": rota,
        "onboarding": onboarding,
        "training": training,
        "audits": audits,
        "incidents": incidents,
    }


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
        }

    homes = _fetch_all(
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

    audits = _fetch_all(
        conn,
        """
        SELECT *
        FROM audits
        WHERE home_id = ANY(%s)
        ORDER BY audit_date DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    incidents = _fetch_all(
        conn,
        """
        SELECT *
        FROM incidents
        WHERE home_id = ANY(%s)
        ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    compliance_items = _fetch_all(
        conn,
        """
        SELECT *
        FROM compliance_items
        WHERE home_id = ANY(%s)
        ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    reports = _fetch_all(
        conn,
        """
        SELECT *
        FROM reports
        WHERE home_id = ANY(%s)
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 80
        """,
        (allowed_home_ids,),
    )

    team = _fetch_all(
        conn,
        """
        SELECT *
        FROM staff
        WHERE home_id = ANY(%s)
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    supervisions = _fetch_all(
        conn,
        """
        SELECT *
        FROM supervisions
        WHERE home_id = ANY(%s)
        ORDER BY due_date ASC NULLS LAST, updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    documents = _fetch_all(
        conn,
        """
        SELECT *
        FROM documents
        WHERE home_id = ANY(%s)
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 100
        """,
        (allowed_home_ids,),
    )

    summary = {
        "homes_count": len(homes),
        "audits_count": len(audits),
        "incidents_count": len(incidents),
        "compliance_count": len(compliance_items),
        "reports_count": len(reports),
        "team_count": len(team),
        "supervisions_count": len(supervisions),
        "documents_count": len(documents),
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
        }

    homes = _fetch_all(
        conn,
        """
        SELECT id, name, name AS home_name, manager_email, provider_id
        FROM homes
        WHERE id = ANY(%s)
        ORDER BY name ASC, id ASC
        """,
        (home_ids,),
    )

    children_outcomes = _fetch_all(
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

    incident_summary = _fetch_all(
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

    safeguarding_summary = _fetch_all(
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

    compliance_summary = _fetch_all(
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
        "staff_assignments": _fetch_all(
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
        "staff_status": _fetch_all(
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
        "roster_shifts": _fetch_all(
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
        "staff_shifts": _fetch_all(
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
        "checkins": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM staff_checkins
            WHERE home_id = ANY(%s)
              AND created_at BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    supervision_summary = {
        "supervision_notes": _fetch_all(
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
        "supervision_submissions": _fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM supervision_submissions
            WHERE home_id = ANY(%s)
              AND created_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "supervision_summaries": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM supervisions
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    management_summary = {
        "manager_updates": _fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM manager_updates
            WHERE home_id = ANY(%s)
              AND created_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "manager_actions": _fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM manager_actions
            WHERE home_id = ANY(%s)
              AND updated_at BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "monthly_reviews": _fetch_all(
            conn,
            """
            SELECT home_id, status, COUNT(*) AS count
            FROM monthly_reviews
            WHERE home_id = ANY(%s)
              AND review_month BETWEEN %s AND %s
            GROUP BY home_id, status
            ORDER BY home_id ASC, count DESC
            """,
            (home_ids, start_date, end_date),
        ),
        "review_meetings": _fetch_all(
            conn,
            """
            SELECT home_id, COUNT(*) AS count
            FROM review_meetings
            WHERE home_id = ANY(%s)
              AND meeting_date BETWEEN %s AND %s
            GROUP BY home_id
            ORDER BY home_id ASC
            """,
            (home_ids, start_date, end_date),
        ),
    }

    positive_indicators = {
        "achievement_counts": _fetch_all(
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
        "keywork_counts": _fetch_all(
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
        "family_contact_counts": _fetch_all(
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
        "daily_notes_counts": _fetch_all(
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
    return {
        **build_monthly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
            generated_by=generated_by,
        ),
        "report_type": "reg45",
    }


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
    return {
        **build_monthly_report_context(
            conn,
            home_id=home_id,
            start_date=start_date,
            end_date=end_date,
            access_level=access_level,
            allowed_home_ids=allowed_home_ids,
            provider_id=provider_id,
            generated_by=generated_by,
        ),
        "report_type": "yearly",
    }


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