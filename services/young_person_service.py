from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.young_people_service import (
    add_alert,
    add_contact,
    create_young_person as legacy_create_young_person,
    get_young_person_by_id as legacy_get_young_person_by_id,
    update_young_person as legacy_update_young_person,
    upsert_communication_profile,
    upsert_education_profile,
    upsert_health_profile,
    upsert_identity_profile,
    upsert_legal_status,
)


class YoungPersonService:
    @staticmethod
    def list_young_people(
        *,
        home_id: int | None = None,
        include_archived: bool = False,
        search: str | None = "",
        sort_by: str = "last_name",
        sort_dir: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            allowed_sort_fields = {
                "first_name": "yp.first_name",
                "last_name": "yp.last_name",
                "preferred_name": "yp.preferred_name",
                "placement_status": "yp.placement_status",
                "summary_risk_level": "yp.summary_risk_level",
                "created_at": "yp.created_at",
                "updated_at": "yp.updated_at",
                "admission_date": "yp.admission_date",
            }

            sort_column = allowed_sort_fields.get(sort_by, "yp.last_name")
            sort_direction = "DESC" if str(sort_dir).lower() == "desc" else "ASC"

            where_parts = ["1=1"]
            values: list[Any] = []

            if home_id is not None:
                where_parts.append("yp.home_id = %s")
                values.append(home_id)

            if not include_archived:
                where_parts.append("COALESCE(yp.archived, FALSE) = FALSE")

            if search and str(search).strip():
                term = f"%{str(search).strip()}%"
                where_parts.append(
                    """
                    (
                        COALESCE(yp.first_name, '') ILIKE %s
                        OR COALESCE(yp.last_name, '') ILIKE %s
                        OR COALESCE(yp.preferred_name, '') ILIKE %s
                        OR COALESCE(yp.placement_status, '') ILIKE %s
                        OR COALESCE(yp.summary_risk_level, '') ILIKE %s
                    )
                    """
                )
                values.extend([term, term, term, term, term])

            values.extend([limit, offset])

            with conn.cursor() as cur:
                cur.execute(
                    f"""
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
                        h.name AS home_name,
                        CONCAT(
                            COALESCE(u.first_name, ''),
                            CASE WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN ' ' ELSE '' END,
                            COALESCE(u.last_name, '')
                        ) AS primary_keyworker_name
                    FROM young_people yp
                    LEFT JOIN homes h ON h.id = yp.home_id
                    LEFT JOIN users u ON u.id = yp.primary_keyworker_id
                    WHERE {' AND '.join(where_parts)}
                    ORDER BY {sort_column} {sort_direction}, yp.id DESC
                    LIMIT %s OFFSET %s
                    """,
                    values,
                )
                rows = cur.fetchall() or []

            return [dict(row) for row in rows]
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_young_person_by_id(young_person_id: int) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            row = legacy_get_young_person_by_id(conn, young_person_id)
            return dict(row) if row else None
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_young_person(payload: dict[str, Any]) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            row = legacy_create_young_person(
                conn,
                home_id=payload["home_id"],
                first_name=payload["first_name"],
                last_name=payload.get("last_name", ""),
                preferred_name=payload.get("preferred_name", ""),
                date_of_birth=payload.get("date_of_birth"),
                gender=payload.get("gender", ""),
                ethnicity=payload.get("ethnicity", ""),
                nhs_number=payload.get("nhs_number", ""),
                local_id_number=payload.get("local_id_number", ""),
                admission_date=payload.get("admission_date"),
                discharge_date=payload.get("discharge_date"),
                placement_status=payload.get("placement_status", ""),
                primary_keyworker_id=payload.get("primary_keyworker_id"),
                summary_risk_level=payload.get("summary_risk_level", ""),
                photo_url=payload.get("photo_url", ""),
                archived=payload.get("archived", False),
            )
            conn.commit()
            return dict(row) if row else {}
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_young_person(young_person_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            row = legacy_update_young_person(conn, young_person_id, payload)
            conn.commit()
            return dict(row) if row else None
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_full_profile_bundle(young_person_id: int) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            person = legacy_get_young_person_by_id(conn, young_person_id)
            if not person:
                return {}

            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM young_person_communication_profile
                    WHERE young_person_id = %s
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                communication_profile = cur.fetchone()

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_education_profile
                    WHERE young_person_id = %s
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                education_profile = cur.fetchone()

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_health_profile
                    WHERE young_person_id = %s
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                health_profile = cur.fetchone()

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_identity_profile
                    WHERE young_person_id = %s
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                identity_profile = cur.fetchone()

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_legal_status
                    WHERE young_person_id = %s
                    ORDER BY
                        COALESCE(is_current, FALSE) DESC,
                        effective_from DESC NULLS LAST,
                        updated_at DESC NULLS LAST,
                        id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                legal_status = cur.fetchone()

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_contacts
                    WHERE young_person_id = %s
                    ORDER BY
                        COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                        COALESCE(is_approved_contact, FALSE) DESC,
                        full_name ASC,
                        id DESC
                    """,
                    (young_person_id,),
                )
                contacts = cur.fetchall() or []

                cur.execute(
                    """
                    SELECT *
                    FROM young_person_alerts
                    WHERE young_person_id = %s
                    ORDER BY
                        COALESCE(is_active, TRUE) DESC,
                        COALESCE(review_date, CURRENT_DATE) ASC,
                        created_at DESC,
                        id DESC
                    """,
                    (young_person_id,),
                )
                alerts = cur.fetchall() or []

            return {
                "young_person": dict(person),
                "communication_profile": dict(communication_profile) if communication_profile else None,
                "education_profile": dict(education_profile) if education_profile else None,
                "health_profile": dict(health_profile) if health_profile else None,
                "identity_profile": dict(identity_profile) if identity_profile else None,
                "legal_status": dict(legal_status) if legal_status else None,
                "contacts": [dict(x) for x in contacts],
                "alerts": [dict(x) for x in alerts],
            }
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_dashboard_counts(young_person_id: int) -> dict[str, int]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                counts: dict[str, int] = {}

                queries = {
                    "daily_notes": """
                        SELECT COUNT(*) AS c
                        FROM daily_notes
                        WHERE young_person_id = %s
                          AND COALESCE(archived, FALSE) = FALSE
                    """,
                    "incidents": """
                        SELECT COUNT(*) AS c
                        FROM incidents
                        WHERE young_person_id = %s
                          AND COALESCE(archived, FALSE) = FALSE
                    """,
                    "risk_assessments": """
                        SELECT COUNT(*) AS c
                        FROM risk_assessments
                        WHERE young_person_id = %s
                          AND COALESCE(archived, FALSE) = FALSE
                    """,
                    "support_plans": """
                        SELECT COUNT(*) AS c
                        FROM support_plans
                        WHERE young_person_id = %s
                          AND COALESCE(archived, FALSE) = FALSE
                    """,
                    "health_records": """
                        SELECT COUNT(*) AS c
                        FROM health_records
                        WHERE young_person_id = %s
                    """,
                    "education_records": """
                        SELECT COUNT(*) AS c
                        FROM education_records
                        WHERE young_person_id = %s
                    """,
                    "family_contact_records": """
                        SELECT COUNT(*) AS c
                        FROM family_contact_records
                        WHERE young_person_id = %s
                    """,
                    "keywork_sessions": """
                        SELECT COUNT(*) AS c
                        FROM keywork_sessions
                        WHERE young_person_id = %s
                          AND COALESCE(archived, FALSE) = FALSE
                    """,
                    "handover_records": """
                        SELECT COUNT(*) AS c
                        FROM handover_records
                        WHERE young_person_id = %s
                    """,
                    "active_alerts": """
                        SELECT COUNT(*) AS c
                        FROM young_person_alerts
                        WHERE young_person_id = %s
                          AND COALESCE(is_active, TRUE) = TRUE
                    """,
                    "contacts": """
                        SELECT COUNT(*) AS c
                        FROM young_person_contacts
                        WHERE young_person_id = %s
                    """,
                }

                for key, sql in queries.items():
                    cur.execute(sql, (young_person_id,))
                    row = cur.fetchone()
                    counts[key] = int(row["c"] if row else 0)

                return counts
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_recent_activity(young_person_id: int, limit: int = 20) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        id,
                        event_datetime AS occurred_at,
                        title,
                        summary,
                        category,
                        subcategory,
                        significance,
                        source_table,
                        source_id,
                        event_status,
                        metadata_json,
                        created_at
                    FROM chronology_events
                    WHERE young_person_id = %s
                      AND COALESCE(is_visible, TRUE) = TRUE
                    ORDER BY event_datetime DESC, created_at DESC, id DESC
                    LIMIT %s
                    """,
                    (young_person_id, limit),
                )
                rows = cur.fetchall() or []

            items: list[dict[str, Any]] = []
            for row in rows:
                metadata = row.get("metadata_json") or {}
                items.append(
                    {
                        "id": row["id"],
                        "record_id": row.get("source_id") or row["id"],
                        "title": row.get("title") or row.get("category") or "Activity",
                        "summary": row.get("summary") or "Recent activity",
                        "narrative": row.get("summary") or "Recent activity",
                        "event_type": row.get("category"),
                        "category": row.get("category"),
                        "subcategory": row.get("subcategory"),
                        "record_type": row.get("category"),
                        "occurred_at": row.get("occurred_at") or row.get("created_at"),
                        "workflow_status": row.get("event_status") or metadata.get("workflow_status") or "recorded",
                        "severity": row.get("significance") or metadata.get("severity") or "medium",
                        "source_table": row.get("source_table"),
                        "source_id": row.get("source_id"),
                    }
                )

            return items
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_active_alerts(young_person_id: int) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM young_person_alerts
                    WHERE young_person_id = %s
                      AND COALESCE(is_active, TRUE) = TRUE
                    ORDER BY
                        COALESCE(review_date, CURRENT_DATE) ASC,
                        created_at DESC,
                        id DESC
                    """,
                    (young_person_id,),
                )
                rows = cur.fetchall() or []

            return [dict(row) for row in rows]
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_section(young_person_id: int, section: str) -> dict[str, Any] | None:
        table_map = {
            "communication_profile": "young_person_communication_profile",
            "education_profile": "young_person_education_profile",
            "health_profile": "young_person_health_profile",
            "identity_profile": "young_person_identity_profile",
            "legal_status": "young_person_legal_status",
        }

        order_map = {
            "communication_profile": "ORDER BY updated_at DESC NULLS LAST, id DESC",
            "education_profile": "ORDER BY updated_at DESC NULLS LAST, id DESC",
            "health_profile": "ORDER BY updated_at DESC NULLS LAST, id DESC",
            "identity_profile": "ORDER BY updated_at DESC NULLS LAST, id DESC",
            "legal_status": """
                ORDER BY
                    COALESCE(is_current, FALSE) DESC,
                    effective_from DESC NULLS LAST,
                    updated_at DESC NULLS LAST,
                    id DESC
            """,
        }

        table = table_map.get(section)
        order_sql = order_map.get(section)
        if not table or not order_sql:
            return None

        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT *
                    FROM {table}
                    WHERE young_person_id = %s
                    {order_sql}
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                row = cur.fetchone()

            return dict(row) if row else None
        finally:
            release_db_connection(conn)

    @staticmethod
    def upsert_section(
        *,
        young_person_id: int,
        section: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            if section == "communication_profile":
                row = upsert_communication_profile(conn, young_person_id=young_person_id, payload=data)
            elif section == "education_profile":
                row = upsert_education_profile(conn, young_person_id=young_person_id, payload=data)
            elif section == "health_profile":
                row = upsert_health_profile(conn, young_person_id=young_person_id, payload=data)
            elif section == "identity_profile":
                row = upsert_identity_profile(conn, young_person_id=young_person_id, payload=data)
            elif section == "legal_status":
                row = upsert_legal_status(
                    conn,
                    young_person_id=young_person_id,
                    created_by=data.get("created_by"),
                    payload=data,
                )
            else:
                raise ValueError(f"Unsupported section: {section}")

            conn.commit()
            return dict(row) if row else {}
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def list_contacts(young_person_id: int) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM young_person_contacts
                    WHERE young_person_id = %s
                    ORDER BY
                        COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                        COALESCE(is_approved_contact, FALSE) DESC,
                        full_name ASC,
                        id DESC
                    """,
                    (young_person_id,),
                )
                rows = cur.fetchall() or []

            return [dict(row) for row in rows]
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_contact(young_person_id: int, data: dict[str, Any]) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            row = add_contact(conn, young_person_id=young_person_id, payload=data)
            conn.commit()
            return dict(row) if row else {}
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_contact(contact_id: int, data: dict[str, Any]) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            data = dict(data)
            if not data:
                return None

            allowed_fields = {
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

            set_parts = []
            values = []

            for field, value in data.items():
                if field not in allowed_fields:
                    continue
                set_parts.append(f"{field} = %s")
                values.append(value)

            if not set_parts:
                return None

            values.append(contact_id)

            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE young_person_contacts
                    SET {", ".join(set_parts)}, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    values,
                )
                row = cur.fetchone()

            conn.commit()
            return dict(row) if row else None
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_alert(young_person_id: int, data: dict[str, Any]) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            row = add_alert(
                conn,
                young_person_id=young_person_id,
                created_by=data.get("created_by"),
                payload=data,
            )
            conn.commit()
            return dict(row) if row else {}
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)
