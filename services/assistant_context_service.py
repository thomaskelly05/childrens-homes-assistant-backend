from __future__ import annotations

from typing import Any, Literal

from psycopg2.extras import RealDictCursor


AssistantType = Literal["public", "young_people_os"]


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


def _normalise_scope(scope: dict[str, Any] | None) -> dict[str, Any]:
    scope = scope or {}
    return {
        "scope_type": _safe_string(scope.get("scope_type") or "global").lower() or "global",
        "home_id": _safe_int(scope.get("home_id")),
        "young_person_id": _safe_int(scope.get("young_person_id")),
        "record_type": _safe_string(scope.get("record_type")).lower(),
        "record_id": _safe_int(scope.get("record_id")),
    }


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
    return _safe_int(row.get("home_id"))


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
            yp.updated_at
        FROM young_people yp
        WHERE yp.id = %s
        LIMIT 1
        """,
        (young_person_id,),
    )

    if not young_person:
        raise ValueError("Young person not found")

    record_home_id = _safe_int(young_person.get("home_id"))
    if user_home_id is not None and record_home_id != user_home_id:
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

    if record_type == "daily_note":
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM daily_notes
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )

    elif record_type == "incident":
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM incidents
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )

    elif record_type == "risk":
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM risk_assessments
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )

    elif record_type in {"support_plan", "plan"}:
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM support_plans
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )
        record_type = "support_plan"

    elif record_type == "appointment":
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM young_person_appointments
            WHERE id = %s
              AND young_person_id = %s
            LIMIT 1
            """,
            (record_id, young_person_id),
        )

    elif record_type == "keywork":
        record = _fetch_one(
            conn,
            """
            SELECT *
            FROM keywork_sessions
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

    return {
        "scope": {
            "scope_type": "young_person",
            "young_person_id": young_person_id,
            "home_id": young_person.get("home_id"),
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
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


def build_home_os_context(conn, *, user_id: int, scope: dict[str, Any] | None = None) -> dict[str, Any]:
    scope = _normalise_scope(scope)
    home_id = _get_user_home(conn, user_id)

    recent_tasks: list[dict[str, Any]] = []
    recent_updates: list[dict[str, Any]] = []
    recent_handovers: list[dict[str, Any]] = []
    recent_events: list[dict[str, Any]] = []
    recent_documents: list[dict[str, Any]] = []
    recent_incidents: list[dict[str, Any]] = []
    recent_compliance: list[dict[str, Any]] = []

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
        recent_documents = _fetch_all(
            conn,
            """
            SELECT *
            FROM documents
            WHERE home_id = %s
            ORDER BY updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (home_id,),
        )
        recent_incidents = _fetch_all(
            conn,
            """
            SELECT *
            FROM incidents
            WHERE home_id = %s
            ORDER BY incident_datetime DESC NULLS LAST, updated_at DESC NULLS LAST, id DESC
            LIMIT 20
            """,
            (home_id,),
        )
        recent_compliance = _fetch_all(
            conn,
            """
            SELECT *
            FROM compliance_items ci
            WHERE ci.young_person_id IN (
                SELECT yp.id
                FROM young_people yp
                WHERE yp.home_id = %s
            )
            ORDER BY ci.due_date ASC NULLS LAST, ci.updated_at DESC NULLS LAST, ci.id DESC
            LIMIT 30
            """,
            (home_id,),
        )

    return {
        "scope": {
            "scope_type": "global",
            "home_id": home_id,
            "record_type": scope.get("record_type"),
            "record_id": scope.get("record_id"),
        },
        "home_id": home_id,
        "tasks": recent_tasks,
        "manager_updates": recent_updates,
        "handover": recent_handovers,
        "chronology": recent_events,
        "documents": recent_documents,
        "incidents": recent_incidents,
        "compliance_items": recent_compliance,
    }


def build_public_context(*, scope: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Strictly public assistant context.
    Never expose OS records, home data, young person data, or scoped record data.
    """
    scope = _normalise_scope(scope)

    return {
        "scope": {
            "scope_type": "global",
            "home_id": None,
            "record_type": None,
            "record_id": None,
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
        return build_public_context(scope=scope)

    if assistant_type != "young_people_os":
        raise ValueError("Unsupported assistant_type")

    if scope_type == "young_person":
        young_person_id = scope.get("young_person_id")
        if not young_person_id:
            raise ValueError("young_person_id is required for young_person scope")
        return build_young_person_context(
            conn,
            user_id=user_id,
            young_person_id=int(young_person_id),
            scope=scope,
        )

    return build_home_os_context(
        conn,
        user_id=user_id,
        scope=scope,
    )