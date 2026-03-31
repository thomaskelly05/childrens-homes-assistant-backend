from __future__ import annotations

from datetime import date
from typing import Any

from db.connection import get_db_connection, release_db_connection


def get_young_person_timeline(
    *,
    young_person_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
    record_type: str = "",
    search: str = "",
    limit: int = 250,
) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        where_parts = ["young_person_id = %s", "COALESCE(is_visible, TRUE) = TRUE"]
        values: list[Any] = [young_person_id]

        if date_from:
            where_parts.append("DATE(event_datetime) >= %s")
            values.append(date_from)

        if date_to:
            where_parts.append("DATE(event_datetime) <= %s")
            values.append(date_to)

        clean_record_type = (record_type or "").strip().lower()
        if clean_record_type:
            mapped_types = {clean_record_type}

            if clean_record_type == "plans":
                mapped_types.update({"plan", "support_plan"})
            elif clean_record_type == "plan":
                mapped_types.update({"support_plan"})
            elif clean_record_type == "support_plan":
                mapped_types.update({"plan"})
            elif clean_record_type == "daily-notes":
                mapped_types.update({"daily_note"})
            elif clean_record_type == "daily_note":
                mapped_types.update({"daily-notes"})
            elif clean_record_type == "incidents":
                mapped_types.update({"incident"})
            elif clean_record_type == "incident":
                mapped_types.update({"incidents"})

            placeholders = ", ".join(["%s"] * len(mapped_types))
            where_parts.append(
                f"""
                (
                    LOWER(COALESCE(category, '')) IN ({placeholders})
                    OR LOWER(COALESCE(subcategory, '')) IN ({placeholders})
                )
                """
            )
            values.extend(mapped_types)
            values.extend(mapped_types)

        clean_search = (search or "").strip()
        if clean_search:
            where_parts.append(
                """
                (
                    COALESCE(title, '') ILIKE %s
                    OR COALESCE(summary, '') ILIKE %s
                    OR COALESCE(category, '') ILIKE %s
                    OR COALESCE(subcategory, '') ILIKE %s
                )
                """
            )
            term = f"%{clean_search}%"
            values.extend([term, term, term, term])

        values.append(limit)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    id,
                    young_person_id,
                    event_datetime AS occurred_at,
                    category AS event_type,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance AS severity,
                    source_table,
                    source_id,
                    created_at,
                    updated_at,
                    event_status,
                    metadata_json,
                    linked_standard,
                    linked_judgement_area,
                    linked_document_id,
                    linked_review_id,
                    linked_action_id,
                    tags_json
                FROM chronology_events
                WHERE {' AND '.join(where_parts)}
                ORDER BY event_datetime DESC, created_at DESC, id DESC
                LIMIT %s
                """,
                values,
            )
            rows = cur.fetchall() or []

        results = []
        for row in rows:
            metadata = row.get("metadata_json") or {}
            tags = row.get("tags_json") or {}

            event_type = row.get("event_type") or row.get("category") or "record"
            source_id = row.get("source_id")
            chronology_id = row.get("id")

            results.append(
                {
                    "id": chronology_id,
                    "timeline_id": chronology_id,
                    "young_person_id": row.get("young_person_id"),
                    "occurred_at": row.get("occurred_at"),
                    "event_datetime": row.get("occurred_at"),
                    "event_type": event_type,
                    "record_type": event_type,
                    "category": row.get("category"),
                    "subcategory": row.get("subcategory"),
                    "title": row.get("title") or "Record",
                    "summary": row.get("summary") or "No summary available.",
                    "narrative": row.get("summary") or "No summary available.",
                    "severity": row.get("severity") or metadata.get("severity") or "medium",
                    "workflow_status": row.get("event_status") or metadata.get("workflow_status") or "recorded",
                    "event_status": row.get("event_status") or "recorded",
                    "source_table": row.get("source_table"),
                    "source_id": source_id,
                    "record_id": source_id or chronology_id,
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at"),
                    "linked_standard": row.get("linked_standard"),
                    "linked_judgement_area": row.get("linked_judgement_area"),
                    "linked_document_id": row.get("linked_document_id"),
                    "linked_review_id": row.get("linked_review_id"),
                    "linked_action_id": row.get("linked_action_id"),
                    "metadata": metadata,
                    "metadata_json": metadata,
                    "tags": tags,
                    "tags_json": tags,
                }
            )

        return results
    finally:
        release_db_connection(conn)
