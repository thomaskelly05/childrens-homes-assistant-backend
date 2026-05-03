from __future__ import annotations

from datetime import date, datetime
from typing import Any

from db.connection import get_db_connection, release_db_connection


TIMELINE_SOURCES: tuple[dict[str, str], ...] = (
    {
        "table": "daily_notes",
        "record_type": "daily_note",
        "category": "daily_note",
        "date": "note_date",
        "title": "shift_type",
        "summary": "presentation",
        "severity": "significance",
        "status": "workflow_status",
    },
    {
        "table": "incidents",
        "record_type": "incident",
        "category": "incident",
        "date": "incident_datetime",
        "title": "incident_type",
        "summary": "description",
        "severity": "severity",
        "status": "manager_review_status",
    },
    {
        "table": "safeguarding_records",
        "record_type": "safeguarding_record",
        "category": "safeguarding",
        "date": "concern_datetime",
        "title": "safeguarding_category",
        "summary": "concern_details",
        "severity": "severity",
        "status": "workflow_status",
    },
    {
        "table": "risk_assessments",
        "record_type": "risk",
        "category": "risk",
        "date": "review_date",
        "title": "title",
        "summary": "concern_summary",
        "severity": "severity",
        "status": "status",
    },
    {
        "table": "keywork_sessions",
        "record_type": "keywork",
        "category": "keywork",
        "date": "session_date",
        "title": "topic",
        "summary": "summary",
        "severity": "significance",
        "status": "status",
    },
    {
        "table": "health_records",
        "record_type": "health_record",
        "category": "health",
        "date": "event_datetime",
        "title": "title",
        "summary": "summary",
        "severity": "severity",
        "status": "status",
    },
    {
        "table": "education_records",
        "record_type": "education_record",
        "category": "education",
        "date": "record_date",
        "title": "provision_name",
        "summary": "education_summary",
        "severity": "significance",
        "status": "status",
    },
    {
        "table": "family_contact_records",
        "record_type": "family_contact",
        "category": "family",
        "date": "contact_datetime",
        "title": "contact_type",
        "summary": "post_contact_presentation",
        "severity": "significance",
        "status": "status",
    },
    {
        "table": "young_person_appointments",
        "record_type": "appointment",
        "category": "appointment",
        "date": "appointment_date",
        "title": "title",
        "summary": "summary",
        "severity": "priority",
        "status": "status",
    },
    {
        "table": "support_plans",
        "record_type": "support_plan",
        "category": "support_plan",
        "date": "review_date",
        "title": "title",
        "summary": "summary",
        "severity": "significance",
        "status": "status",
    },
    {
        "table": "missing_episodes",
        "record_type": "missing_episode",
        "category": "missing_episode",
        "date": "start_datetime",
        "title": "police_reference",
        "summary": "outcome",
        "severity": "severity",
        "status": "status",
    },
    {
        "table": "medication_records",
        "record_type": "medication_record",
        "category": "medication",
        "date": "administered_time",
        "title": "medication_name",
        "summary": "status",
        "severity": "severity",
        "status": "status",
    },
    {
        "table": "handover_records",
        "record_type": "handover_record",
        "category": "handover",
        "date": "handover_date",
        "title": "title",
        "summary": "summary_text",
        "severity": "significance",
        "status": "status",
    },
    {
        "table": "statutory_documents",
        "record_type": "statutory_document",
        "category": "document",
        "date": "review_date",
        "title": "document_type",
        "summary": "summary",
        "severity": "significance",
        "status": "status",
    },
)


def _serialise(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialise(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialise(item) for item in value]
    return value


def _rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description or []]
    output: list[dict[str, Any]] = []

    for row in rows or []:
        if isinstance(row, dict):
            output.append({key: _serialise(value) for key, value in row.items()})
            continue

        output.append(
            {
                columns[index]: _serialise(value)
                for index, value in enumerate(row)
                if index < len(columns)
            }
        )

    return output


def _table_exists(cursor: Any, table_name: str) -> bool:
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = %s
        )
        """,
        (table_name,),
    )
    row = cursor.fetchone()
    if isinstance(row, dict):
        return bool(row.get("exists"))
    return bool(row and row[0])


def _columns(cursor: Any, table_name: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = %s
        """,
        (table_name,),
    )

    results: set[str] = set()
    for row in cursor.fetchall() or []:
        value = row.get("column_name") if isinstance(row, dict) else row[0]
        if value:
            results.add(str(value))
    return results


def _coalesce_sql(columns: set[str], preferred: str, fallbacks: tuple[str, ...], default: str = "") -> str:
    candidates = [preferred, *fallbacks]
    available = [f'"{column}"::text' for column in candidates if column in columns]
    if not available:
        return "%s"
    available.append("%s")
    return "COALESCE(" + ", ".join(available) + ")"


def _normalise_event(row: dict[str, Any]) -> dict[str, Any]:
    metadata = row.get("metadata_json") or row.get("metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}

    occurred_at = row.get("occurred_at") or row.get("event_datetime") or row.get("created_at")
    title = row.get("title") or row.get("event_type") or row.get("category") or "Record"
    summary = row.get("summary") or row.get("narrative") or row.get("description") or "No summary available."
    record_type = row.get("record_type") or metadata.get("record_type") or row.get("category") or "record"

    return {
        "id": row.get("id") or row.get("source_id"),
        "young_person_id": row.get("young_person_id"),
        "occurred_at": occurred_at,
        "event_datetime": occurred_at,
        "event_type": row.get("event_type") or row.get("category") or record_type,
        "category": row.get("category") or record_type,
        "subcategory": row.get("subcategory") or row.get("source_table"),
        "record_type": record_type,
        "title": title,
        "summary": summary,
        "narrative": summary,
        "severity": row.get("severity") or metadata.get("severity") or "medium",
        "workflow_status": row.get("workflow_status") or row.get("event_status") or metadata.get("workflow_status") or "recorded",
        "source_table": row.get("source_table"),
        "source_id": row.get("source_id") or row.get("id"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "metadata": metadata,
    }


def _fetch_chronology_events(
    cursor: Any,
    *,
    young_person_id: int,
    date_from: date | None,
    date_to: date | None,
    record_type: str,
    search: str,
    limit: int,
) -> list[dict[str, Any]]:
    if not _table_exists(cursor, "chronology_events"):
        return []

    columns = _columns(cursor, "chronology_events")
    if "young_person_id" not in columns:
        return []

    date_column = "event_datetime" if "event_datetime" in columns else "created_at"
    where_parts = ['"young_person_id" = %s']
    values: list[Any] = [young_person_id]

    if date_from and date_column in columns:
        where_parts.append(f'DATE("{date_column}") >= %s')
        values.append(date_from)

    if date_to and date_column in columns:
        where_parts.append(f'DATE("{date_column}") <= %s')
        values.append(date_to)

    if record_type:
        filters = []
        for column in ("category", "subcategory", "record_type"):
            if column in columns:
                filters.append(f'COALESCE("{column}", \'\') = %s')
                values.append(record_type)
        if filters:
            where_parts.append("(" + " OR ".join(filters) + ")")

    if search:
        filters = []
        term = f"%{search.strip()}%"
        for column in ("title", "summary", "category", "subcategory"):
            if column in columns:
                filters.append(f'COALESCE("{column}", \'\') ILIKE %s')
                values.append(term)
        if filters:
            where_parts.append("(" + " OR ".join(filters) + ")")

    if "is_visible" in columns:
        where_parts.append('COALESCE("is_visible", TRUE) = TRUE')
    if "archived" in columns:
        where_parts.append('COALESCE("archived", FALSE) = FALSE')
    if "is_deleted" in columns:
        where_parts.append('COALESCE("is_deleted", FALSE) = FALSE')

    title_sql = '"title"::text' if "title" in columns else "%s"
    summary_sql = '"summary"::text' if "summary" in columns else "%s"
    category_sql = '"category"::text' if "category" in columns else "%s"
    subcategory_sql = '"subcategory"::text' if "subcategory" in columns else "%s"
    severity_sql = '"significance"::text' if "significance" in columns else "%s"
    status_sql = '"event_status"::text' if "event_status" in columns else "%s"
    source_table_sql = '"source_table"::text' if "source_table" in columns else "%s"
    source_id_sql = '"source_id"' if "source_id" in columns else "id"
    metadata_sql = "metadata_json" if "metadata_json" in columns else "%s::jsonb"
    created_sql = "created_at" if "created_at" in columns else date_column
    updated_sql = "updated_at" if "updated_at" in columns else created_sql

    values.extend([
        "Record",
        "No summary available.",
        "record",
        "",
        "medium",
        "recorded",
        "chronology_events",
        "{}",
        limit,
    ])

    cursor.execute(
        f"""
        SELECT
            id,
            young_person_id,
            "{date_column}" AS occurred_at,
            {category_sql} AS event_type,
            {category_sql} AS category,
            {subcategory_sql} AS subcategory,
            {category_sql} AS record_type,
            {title_sql} AS title,
            {summary_sql} AS summary,
            {severity_sql} AS severity,
            {status_sql} AS workflow_status,
            {source_table_sql} AS source_table,
            {source_id_sql} AS source_id,
            {created_sql} AS created_at,
            {updated_sql} AS updated_at,
            {metadata_sql} AS metadata_json
        FROM chronology_events
        WHERE {' AND '.join(where_parts)}
        ORDER BY "{date_column}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        tuple(values),
    )
    return [_normalise_event(row) for row in _rows_to_dicts(cursor, cursor.fetchall())]


def _fetch_source_records(
    cursor: Any,
    *,
    young_person_id: int,
    date_from: date | None,
    date_to: date | None,
    record_type: str,
    search: str,
    limit: int,
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    for source in TIMELINE_SOURCES:
        if record_type and record_type not in {
            source["record_type"],
            source["category"],
            source["table"],
        }:
            continue

        table_name = source["table"]
        if not _table_exists(cursor, table_name):
            continue

        columns = _columns(cursor, table_name)
        if "young_person_id" not in columns or "id" not in columns:
            continue

        date_column = source["date"] if source["date"] in columns else "created_at"
        if date_column not in columns:
            continue

        where_parts = ['"young_person_id" = %s']
        values: list[Any] = [young_person_id]

        if date_from:
            where_parts.append(f'DATE("{date_column}") >= %s')
            values.append(date_from)

        if date_to:
            where_parts.append(f'DATE("{date_column}") <= %s')
            values.append(date_to)

        if "archived" in columns:
            where_parts.append('COALESCE("archived", FALSE) = FALSE')
        if "is_deleted" in columns:
            where_parts.append('COALESCE("is_deleted", FALSE) = FALSE')

        search_values: list[Any] = []
        if search:
            term = f"%{search.strip()}%"
            filters = []
            for column in (source["title"], source["summary"], "summary", "description", "notes"):
                if column in columns:
                    filters.append(f'COALESCE("{column}"::text, \'\') ILIKE %s')
                    search_values.append(term)
            if filters:
                where_parts.append("(" + " OR ".join(filters) + ")")

        values.extend(search_values)

        title_sql = _coalesce_sql(columns, source["title"], ("title", "name", "topic", "category"), source["category"])
        summary_sql = _coalesce_sql(columns, source["summary"], ("summary", "description", "notes", "narrative", "outcome"), "No summary available.")
        severity_sql = _coalesce_sql(columns, source["severity"], ("severity", "risk_level", "significance", "priority"), "medium")
        status_sql = _coalesce_sql(columns, source["status"], ("workflow_status", "status", "manager_review_status"), "recorded")
        created_sql = "created_at" if "created_at" in columns else date_column
        updated_sql = "updated_at" if "updated_at" in columns else created_sql

        values.extend([
            source["category"],
            "No summary available.",
            "medium",
            "recorded",
            limit,
        ])

        cursor.execute(
            f"""
            SELECT
                id,
                young_person_id,
                "{date_column}" AS occurred_at,
                %s AS event_type,
                %s AS category,
                %s AS subcategory,
                %s AS record_type,
                {title_sql} AS title,
                {summary_sql} AS summary,
                {severity_sql} AS severity,
                {status_sql} AS workflow_status,
                %s AS source_table,
                id AS source_id,
                {created_sql} AS created_at,
                {updated_sql} AS updated_at,
                %s::jsonb AS metadata_json
            FROM public."{table_name}"
            WHERE {' AND '.join(where_parts)}
            ORDER BY "{date_column}" DESC NULLS LAST, id DESC
            LIMIT %s
            """,
            (
                *values[:-5],
                source["category"],
                source["category"],
                table_name,
                source["record_type"],
                table_name,
                "{}",
                values[-1],
            ),
        )

        rows = _rows_to_dicts(cursor, cursor.fetchall())
        events.extend(_normalise_event(row) for row in rows)

    return events


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
        safe_limit = max(1, min(int(limit or 250), 1000))
        normalised_record_type = str(record_type or "").strip()
        normalised_search = str(search or "").strip()

        with conn.cursor() as cur:
            chronology_events = _fetch_chronology_events(
                cur,
                young_person_id=young_person_id,
                date_from=date_from,
                date_to=date_to,
                record_type=normalised_record_type,
                search=normalised_search,
                limit=safe_limit,
            )
            source_events = _fetch_source_records(
                cur,
                young_person_id=young_person_id,
                date_from=date_from,
                date_to=date_to,
                record_type=normalised_record_type,
                search=normalised_search,
                limit=safe_limit,
            )

        merged: dict[tuple[str, Any], dict[str, Any]] = {}
        for event in [*chronology_events, *source_events]:
            key = (str(event.get("source_table") or event.get("category") or "record"), event.get("source_id") or event.get("id"))
            if key not in merged:
                merged[key] = event

        results = sorted(
            merged.values(),
            key=lambda item: str(item.get("occurred_at") or item.get("created_at") or ""),
            reverse=True,
        )

        return results[:safe_limit]
    finally:
        release_db_connection(conn)
