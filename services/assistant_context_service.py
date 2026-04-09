from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor


def _fetch_one(conn, query: str, params: tuple[Any, ...]) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return cur.fetchone()


def _fetch_all(conn, query: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, params)
        return list(cur.fetchall())


def _get_user_home(conn, user_id: int) -> int | None:
    row = _fetch_one(
        conn,
        """
        SELECT home_id
        FROM users
        WHERE id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    if not row:
        return None
    return row.get("home_id")


def _assert_young_person_access(conn, user_id: int, young_person_id: int) -> dict[str, Any]:
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
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.archived,
            yp.created_at,
            yp.updated_at
        FROM young_people yp
        WHERE yp.id = %s
        LIMIT 1
        """,
        (young_person_id,),
    )

    if not young_person:
        raise ValueError("Young person not found")

    if user_home_id is not None and young_person.get("home_id") != user_home_id:
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
        "active_alerts": _fetch_all(
            conn,
            """
            SELECT *
            FROM young_person_alerts
            WHERE young_person_id = %s
              AND is_active = TRUE
            ORDER BY severity DESC, updated_at DESC NULLS LAST, id DESC
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
            LIMIT 10
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
            LIMIT 10
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
            LIMIT 20
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
    }


def build_young_person_context(conn, *, user_id: int, young_person_id: int) -> dict[str, Any]:
    young_person = _assert_young_person_access(conn, user_id, young_person_id)

    return {
        "scope": {
            "scope_type": "young_person",
            "young_person_id": young_person_id,
            "home_id": young_person.get("home_id"),
        },
        "young_person": young_person,
        "identity": _build_identity_context(conn, young_person_id),
        "active_work": _build_active_work_context(conn, young_person_id),
        "recent_records": _build_recent_records_context(conn, young_person_id),
        "links": _build_links_context(conn, young_person_id),
    }


def build_global_context(conn, *, user_id: int) -> dict[str, Any]:
    home_id = _get_user_home(conn, user_id)

    recent_tasks = []
    recent_updates = []
    recent_handovers = []
    recent_events = []

    if home_id is not None:
        recent_tasks = _fetch_all(
            conn,
            """
            SELECT *
            FROM tasks
            WHERE home_id = %s
            ORDER BY due_date ASC NULLS LAST, created_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (home_id,),
        )
        recent_updates = _fetch_all(
            conn,
            """
            SELECT *
            FROM manager_updates
            WHERE home_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (home_id,),
        )
        recent_handovers = _fetch_all(
            conn,
            """
            SELECT *
            FROM handover
            WHERE home_id = %s
            ORDER BY created_at DESC NULLS LAST, id DESC
            LIMIT 10
            """,
            (home_id,),
        )
        recent_events = _fetch_all(
            conn,
            """
            SELECT *
            FROM chronology_events
            WHERE home_id = %s
            ORDER BY event_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (home_id,),
        )

    return {
        "scope": {
            "scope_type": "global",
            "home_id": home_id,
        },
        "home_id": home_id,
        "tasks": recent_tasks,
        "manager_updates": recent_updates,
        "handover": recent_handovers,
        "chronology": recent_events,
    }


def build_assistant_context(
    conn,
    *,
    user_id: int,
    scope: dict[str, Any] | None,
) -> dict[str, Any]:
    scope = scope or {"scope_type": "global"}
    scope_type = (scope.get("scope_type") or "global").strip().lower()

    if scope_type == "young_person":
        young_person_id = scope.get("young_person_id")
        if not young_person_id:
            raise ValueError("young_person_id is required for young_person scope")
        return build_young_person_context(
            conn,
            user_id=user_id,
            young_person_id=int(young_person_id),
        )

    return build_global_context(conn, user_id=user_id)
