from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.young_person_service")


CORE_TABLE = "young_people"

SECTION_TABLES = {
    "communication_profile": "young_person_communication_profile",
    "education_profile": "young_person_education_profile",
    "health_profile": "young_person_health_profile",
    "identity_profile": "young_person_identity_profile",
    "legal_status": "young_person_legal_status",
}

SECTION_ALLOWED_FIELDS = {
    "communication_profile": {
        "neurodiversity_summary",
        "communication_style",
        "sensory_profile",
        "processing_needs",
        "signs_of_distress",
        "what_helps",
        "what_to_avoid",
        "routines_and_predictability",
        "visual_support_needs",
    },
    "education_profile": {
        "school_name",
        "year_group",
        "education_status",
        "sen_status",
        "ehcp_details",
        "designated_teacher",
        "attendance_baseline",
        "pep_status",
        "support_summary",
    },
    "health_profile": {
        "gp_name",
        "gp_contact",
        "dentist_name",
        "dentist_contact",
        "optician_name",
        "optician_contact",
        "allergies",
        "diagnoses",
        "mental_health_summary",
        "medication_summary",
        "consent_notes",
    },
    "identity_profile": {
        "religion_or_faith",
        "cultural_identity",
        "first_language",
        "dietary_needs",
        "interests",
        "strengths_summary",
        "what_matters_to_me",
        "important_dates",
    },
    "legal_status": {
        "legal_status",
        "order_type",
        "order_details",
        "delegated_authority_details",
        "restrictions_text",
        "consent_arrangements",
        "effective_from",
        "effective_to",
        "is_current",
        "created_by",
    },
}

CORE_ALLOWED_FIELDS = {
    "home_id",
    "first_name",
    "last_name",
    "preferred_name",
    "date_of_birth",
    "gender",
    "ethnicity",
    "nhs_number",
    "local_id_number",
    "admission_date",
    "discharge_date",
    "placement_status",
    "primary_keyworker_id",
    "summary_risk_level",
    "photo_url",
    "archived",
}

LIST_SORT_FIELDS = {
    "first_name": "yp.first_name",
    "last_name": "yp.last_name",
    "preferred_name": "yp.preferred_name",
    "admission_date": "yp.admission_date",
    "updated_at": "yp.updated_at",
    "created_at": "yp.created_at",
}


def _clean_dict(data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(data, dict):
        return {}
    return {k: v for k, v in data.items() if v is not None}


def _filter_allowed(data: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {k: v for k, v in data.items() if k in allowed}


def _build_update_sql(data: dict[str, Any], *, include_updated_at: bool = True) -> tuple[str, list[Any]]:
    assignments: list[str] = []
    values: list[Any] = []

    for key, value in data.items():
        assignments.append(f"{key} = %s")
        values.append(value)

    if include_updated_at:
        assignments.append("updated_at = NOW()")

    return ", ".join(assignments), values


def _fetch_one(
    cur,
    query: str,
    params: tuple[Any, ...] | list[Any],
) -> dict[str, Any] | None:
    cur.execute(query, params)
    return cur.fetchone()


def _fetch_all(
    cur,
    query: str,
    params: tuple[Any, ...] | list[Any],
) -> list[dict[str, Any]]:
    cur.execute(query, params)
    rows = cur.fetchall()
    return rows or []


class YoungPersonService:
    @staticmethod
    def list_young_people(
        *,
        home_id: int | None = None,
        search: str | None = None,
        include_archived: bool = False,
        sort_by: str = "last_name",
        sort_dir: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            order_field = LIST_SORT_FIELDS.get(sort_by, "yp.last_name")
            order_dir = "DESC" if str(sort_dir).lower() == "desc" else "ASC"
            safe_limit = max(1, min(int(limit), 500))
            safe_offset = max(0, int(offset))

            where = ["1=1"]
            params: list[Any] = []

            if home_id is not None:
                where.append("yp.home_id = %s")
                params.append(home_id)

            if not include_archived:
                where.append("COALESCE(yp.archived, FALSE) = FALSE")

            if search:
                where.append(
                    """
                    (
                        yp.first_name ILIKE %s
                        OR yp.last_name ILIKE %s
                        OR yp.preferred_name ILIKE %s
                    )
                    """
                )
                like = f"%{search.strip()}%"
                params.extend([like, like, like])

            params.extend([safe_limit, safe_offset])

            query = f"""
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
                    yp.photo_url,
                    yp.archived,
                    yp.created_at,
                    yp.updated_at,
                    h.name AS home_name
                FROM young_people yp
                LEFT JOIN homes h ON h.id = yp.home_id
                WHERE {" AND ".join(where)}
                ORDER BY {order_field} {order_dir}, yp.id ASC
                LIMIT %s OFFSET %s
            """

            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                return _fetch_all(cur, query, params)

        finally:
            release_db_connection(conn)

    @staticmethod
    def get_young_person_by_id(young_person_id: int) -> dict[str, Any] | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                return _fetch_one(
                    cur,
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
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_young_person(data: dict[str, Any]) -> dict[str, Any]:
        payload = _filter_allowed(_clean_dict(data), CORE_ALLOWED_FIELDS)

        required = {"home_id", "first_name", "last_name"}
        missing = [field for field in required if not payload.get(field)]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                columns = list(payload.keys())
                values = list(payload.values())
                placeholders = ", ".join(["%s"] * len(columns))
                column_sql = ", ".join(columns)

                cur.execute(
                    f"""
                    INSERT INTO young_people ({column_sql})
                    VALUES ({placeholders})
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception("Failed to create young person")
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_young_person(young_person_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
        payload = _filter_allowed(_clean_dict(data), CORE_ALLOWED_FIELDS)
        if not payload:
            return YoungPersonService.get_young_person_by_id(young_person_id)

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                set_sql, values = _build_update_sql(payload)
                values.append(young_person_id)

                cur.execute(
                    f"""
                    UPDATE young_people
                    SET {set_sql}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception("Failed to update young person id=%s", young_person_id)
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_section(young_person_id: int, section: str) -> dict[str, Any] | None:
        table = SECTION_TABLES.get(section)
        if not table:
            raise ValueError(f"Unknown section: {section}")

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if section == "legal_status":
                    return _fetch_one(
                        cur,
                        f"""
                        SELECT *
                        FROM {table}
                        WHERE young_person_id = %s
                        ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
                        LIMIT 1
                        """,
                        (young_person_id,),
                    )

                return _fetch_one(
                    cur,
                    f"""
                    SELECT *
                    FROM {table}
                    WHERE young_person_id = %s
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
        finally:
            release_db_connection(conn)

    @staticmethod
    def upsert_section(
        *,
        young_person_id: int,
        section: str,
        data: dict[str, Any],
    ) -> dict[str, Any] | None:
        table = SECTION_TABLES.get(section)
        allowed = SECTION_ALLOWED_FIELDS.get(section)

        if not table or not allowed:
            raise ValueError(f"Unknown section: {section}")

        payload = _filter_allowed(_clean_dict(data), allowed)
        if not payload:
            return YoungPersonService.get_section(young_person_id, section)

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if section == "legal_status":
                    existing = _fetch_one(
                        cur,
                        f"""
                        SELECT id
                        FROM {table}
                        WHERE young_person_id = %s AND is_current = TRUE
                        ORDER BY id DESC
                        LIMIT 1
                        """,
                        (young_person_id,),
                    )
                else:
                    existing = _fetch_one(
                        cur,
                        f"""
                        SELECT id
                        FROM {table}
                        WHERE young_person_id = %s
                        LIMIT 1
                        """,
                        (young_person_id,),
                    )

                if existing:
                    set_sql, values = _build_update_sql(payload)
                    values.extend([young_person_id, existing["id"]])

                    cur.execute(
                        f"""
                        UPDATE {table}
                        SET {set_sql}
                        WHERE young_person_id = %s
                          AND id = %s
                        RETURNING *
                        """,
                        values,
                    )
                    row = cur.fetchone()
                else:
                    insert_payload = {"young_person_id": young_person_id, **payload}
                    columns = list(insert_payload.keys())
                    values = list(insert_payload.values())

                    cur.execute(
                        f"""
                        INSERT INTO {table} ({", ".join(columns)})
                        VALUES ({", ".join(["%s"] * len(columns))})
                        RETURNING *
                        """,
                        values,
                    )
                    row = cur.fetchone()

                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception(
                "Failed to upsert section=%s for young_person_id=%s",
                section,
                young_person_id,
            )
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def list_contacts(young_person_id: int) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                return _fetch_all(
                    cur,
                    """
                    SELECT *
                    FROM young_person_contacts
                    WHERE young_person_id = %s
                    ORDER BY
                        is_parental_responsibility_holder DESC,
                        is_approved_contact DESC,
                        full_name ASC,
                        id ASC
                    """,
                    (young_person_id,),
                )
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_contact(young_person_id: int, data: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "contact_type",
            "full_name",
            "relationship_to_young_person",
            "phone",
            "email",
            "address",
            "is_parental_responsibility_holder",
            "is_approved_contact",
            "is_restricted_contact",
            "supervision_level",
            "notes",
        }
        payload = _filter_allowed(_clean_dict(data), allowed)

        if not payload.get("full_name"):
            raise ValueError("full_name is required")

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                insert_payload = {"young_person_id": young_person_id, **payload}
                columns = list(insert_payload.keys())
                values = list(insert_payload.values())

                cur.execute(
                    f"""
                    INSERT INTO young_person_contacts ({", ".join(columns)})
                    VALUES ({", ".join(["%s"] * len(columns))})
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception("Failed to create contact for young_person_id=%s", young_person_id)
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_contact(contact_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
        allowed = {
            "contact_type",
            "full_name",
            "relationship_to_young_person",
            "phone",
            "email",
            "address",
            "is_parental_responsibility_holder",
            "is_approved_contact",
            "is_restricted_contact",
            "supervision_level",
            "notes",
        }
        payload = _filter_allowed(_clean_dict(data), allowed)
        if not payload:
            return None

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                set_sql, values = _build_update_sql(payload)
                values.append(contact_id)

                cur.execute(
                    f"""
                    UPDATE young_person_contacts
                    SET {set_sql}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception("Failed to update contact id=%s", contact_id)
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_dashboard_counts(young_person_id: int) -> dict[str, int]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                counts = {}

                for label, query in {
                    "daily_notes": "SELECT COUNT(*) AS n FROM daily_notes WHERE young_person_id = %s",
                    "incidents": "SELECT COUNT(*) AS n FROM incidents WHERE young_person_id = %s",
                    "risk_assessments": "SELECT COUNT(*) AS n FROM risk_assessments WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE",
                    "support_plans": "SELECT COUNT(*) AS n FROM support_plans WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE",
                    "keywork_sessions": "SELECT COUNT(*) AS n FROM keywork_sessions WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE",
                    "chronology_events": "SELECT COUNT(*) AS n FROM chronology_events WHERE young_person_id = %s",
                    "family_contacts": "SELECT COUNT(*) AS n FROM family_contact_records WHERE young_person_id = %s",
                    "health_records": "SELECT COUNT(*) AS n FROM health_records WHERE young_person_id = %s",
                    "education_records": "SELECT COUNT(*) AS n FROM education_records WHERE young_person_id = %s",
                    "statutory_documents": "SELECT COUNT(*) AS n FROM statutory_documents WHERE young_person_id = %s AND COALESCE(archived, FALSE) = FALSE",
                    "alerts": "SELECT COUNT(*) AS n FROM young_person_alerts WHERE young_person_id = %s AND is_active = TRUE",
                }.items():
                    cur.execute(query, (young_person_id,))
                    row = cur.fetchone()
                    counts[label] = int((row or {}).get("n") or 0)

                return counts

        finally:
            release_db_connection(conn)

    @staticmethod
    def get_recent_activity(
        young_person_id: int,
        *,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        conn = None
        safe_limit = max(1, min(int(limit), 100))

        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT *
                    FROM (
                        SELECT
                            'daily_note' AS record_type,
                            id,
                            note_date::timestamp AS event_at,
                            COALESCE(shift_type, 'daily note') AS title,
                            LEFT(COALESCE(positives, actions_required, presentation, ''), 300) AS summary
                        FROM daily_notes
                        WHERE young_person_id = %s

                        UNION ALL

                        SELECT
                            'incident' AS record_type,
                            id,
                            incident_datetime AS event_at,
                            COALESCE(incident_type, 'incident') AS title,
                            LEFT(COALESCE(description, outcome, ''), 300) AS summary
                        FROM incidents
                        WHERE young_person_id = %s

                        UNION ALL

                        SELECT
                            'chronology' AS record_type,
                            id,
                            event_datetime AS event_at,
                            COALESCE(title, category, 'chronology event') AS title,
                            LEFT(COALESCE(summary, ''), 300) AS summary
                        FROM chronology_events
                        WHERE young_person_id = %s

                        UNION ALL

                        SELECT
                            'keywork' AS record_type,
                            id,
                            session_date::timestamp AS event_at,
                            COALESCE(topic, 'keywork session') AS title,
                            LEFT(COALESCE(summary, child_voice, ''), 300) AS summary
                        FROM keywork_sessions
                        WHERE young_person_id = %s
                    ) feed
                    ORDER BY event_at DESC NULLS LAST, id DESC
                    LIMIT %s
                """
                return _fetch_all(
                    cur,
                    query,
                    (young_person_id, young_person_id, young_person_id, young_person_id, safe_limit),
                )
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_full_profile_bundle(young_person_id: int) -> dict[str, Any] | None:
        core = YoungPersonService.get_young_person_by_id(young_person_id)
        if not core:
            return None

        return {
            "young_person": core,
            "communication_profile": YoungPersonService.get_section(young_person_id, "communication_profile"),
            "education_profile": YoungPersonService.get_section(young_person_id, "education_profile"),
            "health_profile": YoungPersonService.get_section(young_person_id, "health_profile"),
            "identity_profile": YoungPersonService.get_section(young_person_id, "identity_profile"),
            "legal_status": YoungPersonService.get_section(young_person_id, "legal_status"),
            "contacts": YoungPersonService.list_contacts(young_person_id),
            "alerts": YoungPersonService.get_active_alerts(young_person_id),
            "dashboard_counts": YoungPersonService.get_dashboard_counts(young_person_id),
            "recent_activity": YoungPersonService.get_recent_activity(young_person_id, limit=15),
        }

    @staticmethod
    def get_active_alerts(young_person_id: int) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                return _fetch_all(
                    cur,
                    """
                    SELECT *
                    FROM young_person_alerts
                    WHERE young_person_id = %s
                      AND is_active = TRUE
                    ORDER BY
                        CASE severity
                            WHEN 'critical' THEN 1
                            WHEN 'high' THEN 2
                            WHEN 'medium' THEN 3
                            WHEN 'low' THEN 4
                            ELSE 5
                        END,
                        created_at DESC
                    """,
                    (young_person_id,),
                )
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_alert(young_person_id: int, data: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "alert_type",
            "title",
            "description",
            "severity",
            "is_active",
            "show_globally",
            "review_date",
            "created_by",
        }
        payload = _filter_allowed(_clean_dict(data), allowed)

        if not payload.get("title"):
            raise ValueError("title is required")

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                insert_payload = {
                    "young_person_id": young_person_id,
                    "is_active": True,
                    **payload,
                }
                columns = list(insert_payload.keys())
                values = list(insert_payload.values())

                cur.execute(
                    f"""
                    INSERT INTO young_person_alerts ({", ".join(columns)})
                    VALUES ({", ".join(["%s"] * len(columns))})
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()
                conn.commit()
                return row

        except Exception:
            if conn and not conn.closed:
                conn.rollback()
            logger.exception("Failed to create alert for young_person_id=%s", young_person_id)
            raise
        finally:
            release_db_connection(conn)
