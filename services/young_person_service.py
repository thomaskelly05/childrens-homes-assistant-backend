from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection
from services import young_people_service as yp


class YoungPersonService:
    @staticmethod
    def _commit_or_rollback(conn, fn):
        try:
            result = fn()
            conn.commit()
            return result
        except Exception:
            conn.rollback()
            raise

    @staticmethod
    def list_young_people(
        *,
        home_id: int | None = None,
        provider_id: int | None = None,
        include_archived: bool = False,
        search: str | None = "",
        sort_by: str = "last_name",
        sort_dir: str = "asc",
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            return yp.list_young_people(
                conn,
                home_id=home_id,
                provider_id=provider_id,
                include_archived=include_archived,
                search=search or "",
                sort_by=sort_by,
                sort_dir=sort_dir,
                limit=limit,
                offset=offset,
            )
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_young_person_by_id(young_person_id: int) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            return yp.get_young_person_by_id(conn, young_person_id)
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_young_person(payload: dict[str, Any]) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            return YoungPersonService._commit_or_rollback(
                conn,
                lambda: yp.create_young_person(conn, **payload),
            )
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_young_person(
        young_person_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            return YoungPersonService._commit_or_rollback(
                conn,
                lambda: yp.update_young_person(conn, young_person_id, payload),
            )
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_full_profile_bundle(young_person_id: int) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            overview = yp.get_young_person_overview(conn, young_person_id)
            if not overview:
                return {}

            return {
                "young_person": overview.get("young_person"),
                "communication_profile": overview.get("communication_profile"),
                "education_profile": overview.get("education_profile"),
                "health_profile": overview.get("health_profile"),
                "identity_profile": overview.get("identity_profile"),
                "legal_status": overview.get("legal_status"),
                "formulation": overview.get("formulation"),
                "contacts": overview.get("contacts") or [],
                "alerts": overview.get("alerts") or [],
            }
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_dashboard_counts(young_person_id: int) -> dict[str, int]:
        conn = get_db_connection()
        try:
            overview = yp.get_young_person_overview(conn, young_person_id)
            return {
                "daily_notes": int(overview.get("daily_note_count") or 0),
                "incidents": int(overview.get("incident_count") or 0),
                "risk_assessments": int(overview.get("active_risk_count") or 0),
                "support_plans": int(overview.get("active_support_plan_count") or 0),
                "health_records": 0,
                "education_records": 0,
                "family_contact_records": 0,
                "keywork_sessions": 0,
            }
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_recent_activity(
        young_person_id: int,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT to_regclass('public.chronology_events') AS table_name
                    """
                )
                table_row = cur.fetchone()
                if not table_row or not table_row.get("table_name"):
                    return []

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
                        created_at
                    FROM chronology_events
                    WHERE young_person_id = %s
                      AND COALESCE(is_visible, TRUE) = TRUE
                    ORDER BY event_datetime DESC, created_at DESC, id DESC
                    LIMIT %s
                    """,
                    (young_person_id, max(1, min(int(limit or 20), 100))),
                )
                rows = cur.fetchall() or []

            return [
                {
                    "id": row.get("id"),
                    "title": row.get("title") or row.get("category") or "Activity",
                    "summary": row.get("summary") or "Recent activity",
                    "narrative": row.get("summary") or "Recent activity",
                    "event_type": row.get("category"),
                    "occurred_at": row.get("occurred_at") or row.get("created_at"),
                    "workflow_status": "recorded",
                    "severity": row.get("significance"),
                }
                for row in rows
            ]
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_active_alerts(young_person_id: int) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            return yp.list_alerts(conn, young_person_id)
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_young_person_overview(young_person_id: int) -> dict[str, Any]:
        person = YoungPersonService.get_young_person_by_id(young_person_id)
        if not person:
            return {}

        return {
            "young_person": person,
            "dashboard_counts": YoungPersonService.get_dashboard_counts(young_person_id),
            "recent_activity": YoungPersonService.get_recent_activity(
                young_person_id,
                limit=20,
            ),
            "alerts": YoungPersonService.get_active_alerts(young_person_id),
        }

    @staticmethod
    def get_section(young_person_id: int, section: str) -> dict[str, Any] | None:
        table_map = {
            "communication_profile": "young_person_communication_profile",
            "education_profile": "young_person_education_profile",
            "health_profile": "young_person_health_profile",
            "identity_profile": "young_person_identity_profile",
            "legal_status": "young_person_legal_status",
            "formulation": "young_person_formulations",
        }

        table_name = table_map.get(section)
        if not table_name:
            return None

        conn = get_db_connection()
        try:
            return yp.get_section(conn, young_person_id, table_name)
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
            def run():
                if section == "communication_profile":
                    return yp.upsert_communication_profile(
                        conn,
                        young_person_id=young_person_id,
                        payload=data,
                    )

                if section == "education_profile":
                    return yp.upsert_education_profile(
                        conn,
                        young_person_id=young_person_id,
                        payload=data,
                    )

                if section == "health_profile":
                    return yp.upsert_health_profile(
                        conn,
                        young_person_id=young_person_id,
                        payload=data,
                    )

                if section == "identity_profile":
                    return yp.upsert_identity_profile(
                        conn,
                        young_person_id=young_person_id,
                        payload=data,
                    )

                if section == "legal_status":
                    return yp.upsert_legal_status(
                        conn,
                        young_person_id=young_person_id,
                        created_by=data.get("created_by"),
                        payload=data,
                    )

                if section == "formulation":
                    return yp.upsert_formulation(
                        conn,
                        young_person_id=young_person_id,
                        created_by=data.get("created_by"),
                        payload=data,
                    )

                raise ValueError(f"Unsupported section: {section}")

            return YoungPersonService._commit_or_rollback(conn, run)
        finally:
            release_db_connection(conn)

    @staticmethod
    def list_contacts(young_person_id: int) -> list[dict[str, Any]]:
        conn = get_db_connection()
        try:
            return yp.list_contacts(conn, young_person_id)
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_contact(
        young_person_id: int,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            return YoungPersonService._commit_or_rollback(
                conn,
                lambda: yp.add_contact(
                    conn,
                    young_person_id=young_person_id,
                    payload=data,
                ),
            )
        finally:
            release_db_connection(conn)

    @staticmethod
    def update_contact(
        contact_id: int,
        data: dict[str, Any],
    ) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            return YoungPersonService._commit_or_rollback(
                conn,
                lambda: yp.update_contact(conn, contact_id, data),
            )
        finally:
            release_db_connection(conn)

    @staticmethod
    def create_alert(
        young_person_id: int,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            return YoungPersonService._commit_or_rollback(
                conn,
                lambda: yp.add_alert(
                    conn,
                    young_person_id=young_person_id,
                    created_by=data.get("created_by"),
                    payload=data,
                ),
            )
        finally:
            release_db_connection(conn)