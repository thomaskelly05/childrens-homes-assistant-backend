from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Any

from db.connection import get_db_connection, release_db_connection


VALID_SIGNIFICANCE = {"low", "medium", "high"}
VALID_SEVERITY = {"low", "medium", "high", "critical"}
VALID_WORKFLOW_STATUS = {"draft", "submitted", "approved", "returned", "archived"}


def _normalise_significance(value: str | None) -> str:
    cleaned = (value or "medium").strip().lower()
    return cleaned if cleaned in VALID_SIGNIFICANCE else "medium"


def _normalise_severity(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    return cleaned if cleaned in VALID_SEVERITY else None


def _normalise_workflow_status(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    return cleaned if cleaned in VALID_WORKFLOW_STATUS else None


def _coerce_datetime(value: datetime | date | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            try:
                return datetime.combine(date.fromisoformat(raw), time.min)
            except ValueError:
                return None
    return None


@dataclass(slots=True)
class ChronologyEventInput:
    young_person_id: int
    source_table: str
    source_id: int
    event_datetime: datetime | date | str | None
    category: str
    title: str
    summary: str

    home_id: int | None = None
    subcategory: str | None = None
    significance: str = "medium"
    created_by: int | None = None
    auto_generated: bool = True
    is_visible: bool = True
    metadata_json: dict[str, Any] = field(default_factory=dict)
    event_status: str | None = None
    linked_standard: str | None = None
    linked_judgement_area: str | None = None
    linked_document_id: int | None = None
    linked_review_id: int | None = None
    linked_action_id: int | None = None
    tags_json: list[str] = field(default_factory=list)
    recorded_by_name: str | None = None
    workflow_status: str | None = None
    safeguarding_flag: bool = False
    child_voice_present: bool = False
    severity: str | None = None
    primary_record_type: str | None = None


class ChronologyWriter:
    def upsert_event(self, payload: ChronologyEventInput) -> int:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM chronology_events
                    WHERE source_table = %s
                      AND source_id = %s
                      AND young_person_id = %s
                    LIMIT 1
                    """,
                    (
                        payload.source_table,
                        payload.source_id,
                        payload.young_person_id,
                    ),
                )
                existing = cur.fetchone()

                if existing:
                    chronology_event_id = int(existing[0])
                    self._update_event(cur, chronology_event_id, payload)
                else:
                    chronology_event_id = self._insert_event(cur, payload)

            conn.commit()
            return chronology_event_id
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def archive_event(
        self,
        *,
        source_table: str,
        source_id: int,
        young_person_id: int,
        workflow_status: str = "archived",
    ) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE chronology_events
                    SET
                        workflow_status = %s,
                        is_visible = FALSE,
                        updated_at = NOW()
                    WHERE source_table = %s
                      AND source_id = %s
                      AND young_person_id = %s
                    """,
                    (
                        _normalise_workflow_status(workflow_status) or "archived",
                        source_table,
                        source_id,
                        young_person_id,
                    ),
                )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def delete_event(
        self,
        *,
        source_table: str,
        source_id: int,
        young_person_id: int,
    ) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM chronology_events
                    WHERE source_table = %s
                      AND source_id = %s
                      AND young_person_id = %s
                    """,
                    (source_table, source_id, young_person_id),
                )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def _insert_event(self, cur, payload: ChronologyEventInput) -> int:
        cur.execute(
            """
            INSERT INTO chronology_events (
                young_person_id,
                home_id,
                event_datetime,
                category,
                subcategory,
                title,
                summary,
                significance,
                source_table,
                source_id,
                created_by,
                auto_generated,
                is_visible,
                metadata_json,
                created_at,
                event_status,
                linked_standard,
                linked_judgement_area,
                linked_document_id,
                linked_review_id,
                linked_action_id,
                tags_json,
                updated_at,
                recorded_by_name,
                workflow_status,
                safeguarding_flag,
                child_voice_present,
                severity,
                primary_record_type
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                NOW(), %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                payload.young_person_id,
                payload.home_id,
                _coerce_datetime(payload.event_datetime),
                payload.category,
                payload.subcategory,
                payload.title.strip(),
                payload.summary.strip(),
                _normalise_significance(payload.significance),
                payload.source_table,
                payload.source_id,
                payload.created_by,
                payload.auto_generated,
                payload.is_visible,
                payload.metadata_json or {},
                payload.event_status,
                payload.linked_standard,
                payload.linked_judgement_area,
                payload.linked_document_id,
                payload.linked_review_id,
                payload.linked_action_id,
                payload.tags_json or [],
                payload.recorded_by_name,
                _normalise_workflow_status(payload.workflow_status),
                bool(payload.safeguarding_flag),
                bool(payload.child_voice_present),
                _normalise_severity(payload.severity),
                payload.primary_record_type or payload.category,
            ),
        )
        row = cur.fetchone()
        return int(row[0])

    def _update_event(self, cur, chronology_event_id: int, payload: ChronologyEventInput) -> None:
        cur.execute(
            """
            UPDATE chronology_events
            SET
                home_id = %s,
                event_datetime = %s,
                category = %s,
                subcategory = %s,
                title = %s,
                summary = %s,
                significance = %s,
                created_by = %s,
                auto_generated = %s,
                is_visible = %s,
                metadata_json = %s,
                event_status = %s,
                linked_standard = %s,
                linked_judgement_area = %s,
                linked_document_id = %s,
                linked_review_id = %s,
                linked_action_id = %s,
                tags_json = %s,
                updated_at = NOW(),
                recorded_by_name = %s,
                workflow_status = %s,
                safeguarding_flag = %s,
                child_voice_present = %s,
                severity = %s,
                primary_record_type = %s
            WHERE id = %s
            """,
            (
                payload.home_id,
                _coerce_datetime(payload.event_datetime),
                payload.category,
                payload.subcategory,
                payload.title.strip(),
                payload.summary.strip(),
                _normalise_significance(payload.significance),
                payload.created_by,
                payload.auto_generated,
                payload.is_visible,
                payload.metadata_json or {},
                payload.event_status,
                payload.linked_standard,
                payload.linked_judgement_area,
                payload.linked_document_id,
                payload.linked_review_id,
                payload.linked_action_id,
                payload.tags_json or [],
                payload.recorded_by_name,
                _normalise_workflow_status(payload.workflow_status),
                bool(payload.safeguarding_flag),
                bool(payload.child_voice_present),
                _normalise_severity(payload.severity),
                payload.primary_record_type or payload.category,
                chronology_event_id,
            ),
        )
