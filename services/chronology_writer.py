from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Any


@dataclass(slots=True)
class ChronologyEventInput:
    young_person_id: int
    source_table: str
    source_id: int
    event_datetime: date | datetime | str | None = None
    category: str = "record"
    subcategory: str | None = None
    title: str = "Record"
    summary: str = "Record updated"
    significance: str = "medium"
    created_by: int | None = None
    auto_generated: bool = True
    is_visible: bool = True
    metadata_json: dict[str, Any] | list[Any] | None = None
    event_status: str | None = None
    linked_standard: str | None = None
    linked_judgement_area: str | None = None
    linked_document_id: int | None = None
    linked_review_id: int | None = None
    linked_action_id: int | None = None
    tags_json: list[str] | None = None
    home_id: int | None = None
    recorded_by_name: str | None = None
    workflow_status: str | None = None
    safeguarding_flag: bool = False
    child_voice_present: bool = False
    severity: str | None = None
    primary_record_type: str | None = None


class ChronologyWriter:
    """
    Shared chronology writer for young person records.

    This writer is intentionally simple and tolerant:
    - upserts chronology rows by (young_person_id, source_table, source_id)
    - keeps chronology_events aligned with latest record state
    - does not hard fail on optional fields being missing
    """

    def upsert_event(self, conn, payload: dict[str, Any] | ChronologyEventInput) -> dict[str, Any]:
        raw_payload = asdict(payload) if isinstance(payload, ChronologyEventInput) else payload
        prepared = self._prepare_payload(raw_payload)
        event_id = self._upsert(conn, prepared)
        return {
            "ok": True,
            "chronology_event_id": event_id,
        }

    def archive_event(
        self,
        conn,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int | str,
    ) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chronology_events
                SET
                    is_visible = FALSE,
                    event_status = %s,
                    workflow_status = %s,
                    updated_at = NOW()
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                RETURNING id
                """,
                ("archived", "archived", young_person_id, source_table, source_id),
            )
            rows = cur.fetchall() or []

        return {
            "ok": True,
            "updated_count": len(rows),
            "ids": [row["id"] for row in rows],
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _prepare_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        prepared = dict(payload)

        prepared["young_person_id"] = prepared.get("young_person_id")
        prepared["source_table"] = prepared.get("source_table")
        prepared["source_id"] = prepared.get("source_id")

        prepared["event_datetime"] = self._normalise_datetime(
            prepared.get("event_datetime")
            or prepared.get("occurred_at")
            or prepared.get("recorded_at")
            or prepared.get("created_at")
        )

        prepared["category"] = prepared.get("category") or "record"
        prepared["subcategory"] = prepared.get("subcategory") or prepared["category"]
        prepared["title"] = prepared.get("title") or "Record"
        prepared["summary"] = prepared.get("summary") or prepared.get("narrative") or "Record updated"
        prepared["significance"] = prepared.get("significance") or prepared.get("severity") or "medium"

        prepared["created_by"] = prepared.get("created_by")
        prepared["auto_generated"] = bool(prepared.get("auto_generated", False))
        prepared["is_visible"] = bool(prepared.get("is_visible", True))

        prepared["metadata_json"] = self._normalise_json(prepared.get("metadata_json"))
        prepared["event_status"] = prepared.get("event_status") or prepared.get("workflow_status") or "recorded"
        prepared["linked_standard"] = prepared.get("linked_standard")
        prepared["linked_judgement_area"] = prepared.get("linked_judgement_area")
        prepared["linked_document_id"] = prepared.get("linked_document_id")
        prepared["linked_review_id"] = prepared.get("linked_review_id")
        prepared["linked_action_id"] = prepared.get("linked_action_id")
        prepared["tags_json"] = self._normalise_json(prepared.get("tags_json") or [])

        prepared["home_id"] = prepared.get("home_id")
        prepared["recorded_by_name"] = prepared.get("recorded_by_name")
        prepared["workflow_status"] = prepared.get("workflow_status") or prepared.get("event_status") or "recorded"
        prepared["safeguarding_flag"] = bool(prepared.get("safeguarding_flag", False))
        prepared["child_voice_present"] = bool(prepared.get("child_voice_present", False))
        prepared["severity"] = prepared.get("severity") or prepared.get("significance") or "medium"
        prepared["primary_record_type"] = prepared.get("primary_record_type") or prepared.get("category") or "record"

        return prepared

    def _upsert(self, conn, payload: dict[str, Any]) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM chronology_events
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                LIMIT 1
                """,
                (
                    payload["young_person_id"],
                    payload["source_table"],
                    payload["source_id"],
                ),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE chronology_events
                    SET
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
                        home_id = %s,
                        recorded_by_name = %s,
                        workflow_status = %s,
                        safeguarding_flag = %s,
                        child_voice_present = %s,
                        severity = %s,
                        primary_record_type = %s
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        payload["event_datetime"],
                        payload["category"],
                        payload["subcategory"],
                        payload["title"],
                        payload["summary"],
                        payload["significance"],
                        payload["created_by"],
                        payload["auto_generated"],
                        payload["is_visible"],
                        payload["metadata_json"],
                        payload["event_status"],
                        payload["linked_standard"],
                        payload["linked_judgement_area"],
                        payload["linked_document_id"],
                        payload["linked_review_id"],
                        payload["linked_action_id"],
                        payload["tags_json"],
                        payload["home_id"],
                        payload["recorded_by_name"],
                        payload["workflow_status"],
                        payload["safeguarding_flag"],
                        payload["child_voice_present"],
                        payload["severity"],
                        payload["primary_record_type"],
                        existing["id"],
                    ),
                )
                row = cur.fetchone()
                return int(row["id"])

            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id,
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
                    home_id,
                    recorded_by_name,
                    workflow_status,
                    safeguarding_flag,
                    child_voice_present,
                    severity,
                    primary_record_type
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s,
                    %s, NOW(), %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    payload["young_person_id"],
                    payload["event_datetime"],
                    payload["category"],
                    payload["subcategory"],
                    payload["title"],
                    payload["summary"],
                    payload["significance"],
                    payload["source_table"],
                    payload["source_id"],
                    payload["created_by"],
                    payload["auto_generated"],
                    payload["is_visible"],
                    payload["metadata_json"],
                    payload["event_status"],
                    payload["linked_standard"],
                    payload["linked_judgement_area"],
                    payload["linked_document_id"],
                    payload["linked_review_id"],
                    payload["linked_action_id"],
                    payload["tags_json"],
                    payload["home_id"],
                    payload["recorded_by_name"],
                    payload["workflow_status"],
                    payload["safeguarding_flag"],
                    payload["child_voice_present"],
                    payload["severity"],
                    payload["primary_record_type"],
                ),
            )
            row = cur.fetchone()
            return int(row["id"])

    def _normalise_datetime(self, value: Any) -> Any:
        if value is None:
            return None

        if isinstance(value, datetime):
            return value

        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())

        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None

            try:
                return datetime.fromisoformat(text.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                pass

            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    return datetime.strptime(text, fmt)
                except Exception:
                    continue

        return value

    def _normalise_json(self, value: Any) -> Any:
        if value is None:
            return {}
        return value
