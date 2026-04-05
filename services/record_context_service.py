from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.record_link_service import RecordLinkService
from services.standards_link_service import StandardsLinkService


SAFE_SOURCE_TABLES = {
    "daily_notes",
    "incidents",
    "risk_assessments",
    "support_plans",
    "young_person_appointments",
    "appointments",
    "health_records",
    "education_records",
    "family_contact_records",
    "keywork_sessions",
    "safeguarding_records",
    "missing_episodes",
    "achievement_records",
    "monthly_reviews",
    "ai_generated_reports",
    "review_meetings",
    "handover_records",
    "statutory_documents",
}


class RecordContextService:
    def __init__(self) -> None:
        self.record_link_service = RecordLinkService()
        self.standards_link_service = StandardsLinkService()

    def get_record_context(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        related_limit: int = 10,
    ) -> dict[str, Any]:
        if source_table not in SAFE_SOURCE_TABLES:
            raise ValueError(f"Unsupported source_table: {source_table}")

        record = self._get_record(source_table=source_table, source_id=source_id)
        chronology_event = self._get_chronology_event(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
        )
        links = self.record_link_service.get_links_for_source(
            young_person_id=young_person_id,
            from_table=source_table,
            from_id=source_id,
        )
        standards = self.standards_link_service.get_links_for_record(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
        )
        compliance_items = self._get_compliance_items(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
        )
        related_events = self._get_related_events(
            young_person_id=young_person_id,
            source_table=source_table,
            source_id=source_id,
            limit=related_limit,
        )
        linked_records = self._hydrate_linked_records(links)

        return {
            "record": record,
            "chronology_event": chronology_event,
            "links": links,
            "linked_records": linked_records,
            "standards": standards,
            "compliance_items": compliance_items,
            "recent_related_events": related_events,
        }

    def _get_record(self, *, source_table: str, source_id: int) -> dict[str, Any] | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(f"SELECT * FROM {source_table} WHERE id = %s LIMIT 1", (source_id,))
                row = cur.fetchone()
                if row is None:
                    return None

                columns = [desc[0] for desc in cur.description]
                return {columns[idx]: row[idx] for idx in range(len(columns))}
        finally:
            release_db_connection(conn)

    def _get_chronology_event(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> dict[str, Any] | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM chronology_events
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                    LIMIT 1
                    """,
                    (young_person_id, source_table, source_id),
                )
                row = cur.fetchone()
                if row is None:
                    return None

                columns = [desc[0] for desc in cur.description]
                return {columns[idx]: row[idx] for idx in range(len(columns))}
        finally:
            release_db_connection(conn)

    def _get_compliance_items(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM compliance_items
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                    ORDER BY due_date ASC NULLS LAST, id DESC
                    """,
                    (young_person_id, source_table, source_id),
                )
                rows = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                return [
                    {columns[idx]: row[idx] for idx in range(len(columns))}
                    for row in rows
                ]
        finally:
            release_db_connection(conn)

    def _get_related_events(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        limit: int,
    ) -> list[dict[str, Any]]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM chronology_events
                    WHERE young_person_id = %s
                      AND NOT (source_table = %s AND source_id = %s)
                    ORDER BY event_datetime DESC NULLS LAST, id DESC
                    LIMIT %s
                    """,
                    (young_person_id, source_table, source_id, limit),
                )
                rows = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                return [
                    {columns[idx]: row[idx] for idx in range(len(columns))}
                    for row in rows
                ]
        finally:
            release_db_connection(conn)

    def _hydrate_linked_records(self, links: list[dict[str, Any]]) -> list[dict[str, Any]]:
        hydrated: list[dict[str, Any]] = []
        for link in links:
            to_table = link.get("to_table")
            to_id = link.get("to_id")
            if not to_table or not to_id or to_table not in SAFE_SOURCE_TABLES:
                hydrated.append(
                    {
                        "link": link,
                        "record": None,
                    }
                )
                continue

            record = self._get_record(source_table=to_table, source_id=int(to_id))
            hydrated.append(
                {
                    "link": link,
                    "record": record,
                }
            )
        return hydrated
