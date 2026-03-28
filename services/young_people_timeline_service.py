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
        where_parts = ["young_person_id = %s"]
        values: list[Any] = [young_person_id]

        if date_from:
            where_parts.append("DATE(event_datetime) >= %s")
            values.append(date_from)

        if date_to:
            where_parts.append("DATE(event_datetime) <= %s")
            values.append(date_to)

        if record_type:
            where_parts.append(
                "(COALESCE(category, '') = %s OR COALESCE(subcategory, '') = %s)"
            )
            values.extend([record_type, record_type])

        if search:
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
            term = f"%{search.strip()}%"
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
                    event_status,
                    metadata_json
                FROM chronology_events
                WHERE {' AND '.join(where_parts)}
                  AND COALESCE(is_visible, TRUE) = TRUE
                ORDER BY event_datetime DESC, created_at DESC, id DESC
                LIMIT %s
                """,
                values,
            )
            rows = cur.fetchall() or []

        results = []
        for row in rows:
            metadata = row.get("metadata_json") or {}
            results.append(
                {
                    "id": row.get("id"),
                    "young_person_id": row.get("young_person_id"),
                    "occurred_at": row.get("occurred_at"),
                    "event_type": row.get("event_type") or "record",
                    "category": row.get("category"),
                    "subcategory": row.get("subcategory"),
                    "title": row.get("title") or "Record",
                    "summary": row.get("summary") or "No summary available.",
                    "narrative": row.get("summary") or "No summary available.",
                    "severity": row.get("severity") or metadata.get("severity") or "medium",
                    "workflow_status": row.get("event_status") or metadata.get("workflow_status") or "recorded",
                    "source_table": row.get("source_table"),
                    "source_id": row.get("source_id"),
                    "created_at": row.get("created_at"),
                    "metadata": metadata,
                }
            )

        return results
    finally:
        release_db_connection(conn)
