from __future__ import annotations

from datetime import date, datetime
from typing import Any

from db.connection import get_db_connection, release_db_connection


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
    return {
        str(row.get("column_name") if isinstance(row, dict) else row[0])
        for row in cursor.fetchall() or []
        if row
    }


def _has_columns(columns: set[str], required: set[str]) -> bool:
    return required.issubset(columns)


def _fetch_daily_notes(cursor: Any, young_person_id: int, limit: int) -> list[dict[str, Any]]:
    if not _table_exists(cursor, "daily_notes"):
        return []

    columns = _columns(cursor, "daily_notes")
    if not _has_columns(columns, {"young_person_id", "id"}):
        return []

    date_column = "note_date" if "note_date" in columns else "created_at"
    summary_column = "presentation" if "presentation" in columns else "notes" if "notes" in columns else "summary" if "summary" in columns else None
    status_column = "workflow_status" if "workflow_status" in columns else "status" if "status" in columns else None

    summary_sql = f'"{summary_column}"::text' if summary_column else "'Daily note'"
    status_sql = f'"{status_column}"::text' if status_column else "'recorded'"

    cursor.execute(
        f"""
        SELECT
            id,
            young_person_id,
            '{'daily_note'}' AS record_type,
            'Daily note' AS title,
            {summary_sql} AS summary,
            "{date_column}" AS date,
            {status_sql} AS status,
            'daily_notes' AS source_table
        FROM public.daily_notes
        WHERE young_person_id = %s
        ORDER BY "{date_column}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        (young_person_id, limit),
    )
    return _rows_to_dicts(cursor, cursor.fetchall())


def _fetch_incidents(cursor: Any, young_person_id: int, limit: int) -> list[dict[str, Any]]:
    if not _table_exists(cursor, "incidents"):
        return []

    columns = _columns(cursor, "incidents")
    if not _has_columns(columns, {"young_person_id", "id"}):
        return []

    date_column = "incident_datetime" if "incident_datetime" in columns else "created_at"
    type_column = "incident_type" if "incident_type" in columns else None
    summary_column = "description" if "description" in columns else "summary" if "summary" in columns else "outcome" if "outcome" in columns else None
    severity_column = "severity" if "severity" in columns else "risk_level" if "risk_level" in columns else None
    status_column = "manager_review_status" if "manager_review_status" in columns else "workflow_status" if "workflow_status" in columns else "status" if "status" in columns else None

    title_sql = f'COALESCE("{type_column}"::text, \'Incident\')' if type_column else "'Incident'"
    summary_sql = f'"{summary_column}"::text' if summary_column else "'Incident recorded'"
    severity_sql = f'"{severity_column}"::text' if severity_column else "'medium'"
    status_sql = f'"{status_column}"::text' if status_column else "'recorded'"

    cursor.execute(
        f"""
        SELECT
            id,
            young_person_id,
            'incident' AS record_type,
            {title_sql} AS title,
            {summary_sql} AS summary,
            "{date_column}" AS date,
            {severity_sql} AS severity,
            {status_sql} AS status,
            'incidents' AS source_table
        FROM public.incidents
        WHERE young_person_id = %s
        ORDER BY "{date_column}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        (young_person_id, limit),
    )
    return _rows_to_dicts(cursor, cursor.fetchall())


def _fetch_risks(cursor: Any, young_person_id: int, limit: int) -> list[dict[str, Any]]:
    if not _table_exists(cursor, "risk_assessments"):
        return []

    columns = _columns(cursor, "risk_assessments")
    if not _has_columns(columns, {"young_person_id", "id"}):
        return []

    date_column = "review_date" if "review_date" in columns else "created_at"
    concern_column = "concern" if "concern" in columns else "title" if "title" in columns else "risk_area" if "risk_area" in columns else "summary" if "summary" in columns else None
    severity_column = "severity" if "severity" in columns else "risk_level" if "risk_level" in columns else "significance" if "significance" in columns else None
    summary_column = "summary" if "summary" in columns else "concern_summary" if "concern_summary" in columns else concern_column

    concern_sql = f'"{concern_column}"::text' if concern_column else "'Risk assessment'"
    severity_sql = f'"{severity_column}"::text' if severity_column else "'review'"
    summary_sql = f'"{summary_column}"::text' if summary_column else "'Review risk assessment'"

    cursor.execute(
        f"""
        SELECT
            id,
            young_person_id,
            'risk' AS record_type,
            {concern_sql} AS title,
            {summary_sql} AS summary,
            {severity_sql} AS severity,
            "{date_column}" AS date,
            'risk_assessments' AS source_table
        FROM public.risk_assessments
        WHERE young_person_id = %s
        ORDER BY "{date_column}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        (young_person_id, limit),
    )
    return _rows_to_dicts(cursor, cursor.fetchall())


def _build_patterns(timeline: list[dict[str, Any]], risk_signals: list[dict[str, Any]]) -> list[str]:
    patterns: list[str] = []

    if len(timeline) >= 5:
        patterns.append(f"There are {len(timeline)} recent timeline entries in the current view.")

    incident_count = sum(1 for item in timeline if item.get("record_type") == "incident")
    if incident_count:
        patterns.append(f"There are {incident_count} incident record(s) in the current context window.")

    if risk_signals:
        patterns.append(f"There are {len(risk_signals)} risk signal(s) to review.")

    return patterns[:5]


def build_young_person_assistant_context(
    *,
    young_person_id: int,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    conn = None
    safe_limit = max(1, min(int(limit or 100), 250))

    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            daily_notes = _fetch_daily_notes(cursor, young_person_id, safe_limit)
            incidents = _fetch_incidents(cursor, young_person_id, safe_limit)
            risk_signals = _fetch_risks(cursor, young_person_id, 50)

        timeline = sorted(
            [*daily_notes, *incidents, *risk_signals],
            key=lambda item: str(item.get("date") or ""),
            reverse=True,
        )[:safe_limit]
        patterns = _build_patterns(timeline, risk_signals)
        sources = [
            {
                "citation_ref": f"{item.get('source_table')}:{item.get('id')}",
                "title": item.get("title"),
                "summary": item.get("summary"),
                "date": item.get("date"),
                "record_type": item.get("record_type"),
            }
            for item in timeline[:30]
        ]

        return {
            "ok": True,
            "status": "ok",
            "young_person_id": young_person_id,
            "home_id": home_id,
            "provider_id": provider_id,
            "timeline": timeline,
            "recent_events": timeline[:30],
            "risk_signals": risk_signals,
            "risk_flags": risk_signals,
            "patterns": patterns,
            "sources": sources,
            "items": sources,
            "source_count": len(sources),
            "assistant_context": {
                "summary": "Young person OS context built from daily notes, incidents and risk records.",
                "timeline_count": len(timeline),
                "risk_signal_count": len(risk_signals),
                "pattern_count": len(patterns),
            },
        }
    finally:
        if conn is not None:
            release_db_connection(conn)
