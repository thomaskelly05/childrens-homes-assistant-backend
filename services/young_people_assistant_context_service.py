from __future__ import annotations

from collections import Counter
from datetime import date, datetime
from typing import Any

from db.connection import get_db_connection, release_db_connection


CARE_SOURCES: tuple[dict[str, str], ...] = (
    {"table": "daily_notes", "type": "daily_note", "label": "Daily note", "date": "note_date", "title": "shift_type", "summary": "presentation", "status": "workflow_status", "severity": "significance"},
    {"table": "incidents", "type": "incident", "label": "Incident", "date": "incident_datetime", "title": "incident_type", "summary": "description", "status": "manager_review_status", "severity": "severity"},
    {"table": "safeguarding_records", "type": "safeguarding", "label": "Safeguarding", "date": "concern_datetime", "title": "safeguarding_category", "summary": "concern_details", "status": "workflow_status", "severity": "severity"},
    {"table": "risk_assessments", "type": "risk", "label": "Risk", "date": "review_date", "title": "title", "summary": "summary", "status": "status", "severity": "severity"},
    {"table": "health_records", "type": "health", "label": "Health", "date": "event_datetime", "title": "title", "summary": "summary", "status": "status", "severity": "severity"},
    {"table": "education_records", "type": "education", "label": "Education", "date": "record_date", "title": "provision_name", "summary": "education_summary", "status": "status", "severity": "significance"},
    {"table": "family_contact_records", "type": "family", "label": "Family time", "date": "contact_datetime", "title": "contact_type", "summary": "post_contact_presentation", "status": "status", "severity": "significance"},
    {"table": "keywork_sessions", "type": "keywork", "label": "Keywork", "date": "session_date", "title": "topic", "summary": "summary", "status": "status", "severity": "significance"},
    {"table": "support_plans", "type": "support_plan", "label": "Support plan", "date": "review_date", "title": "title", "summary": "summary", "status": "status", "severity": "significance"},
    {"table": "missing_episodes", "type": "missing_episode", "label": "Missing episode", "date": "start_datetime", "title": "police_reference", "summary": "outcome", "status": "status", "severity": "severity"},
    {"table": "medication_records", "type": "medication", "label": "Medication", "date": "administered_time", "title": "medication_name", "summary": "status", "status": "status", "severity": "severity"},
)

HIGH_SIGNAL_TYPES = {"incident", "safeguarding", "risk", "missing_episode"}
HIGH_SIGNAL_SEVERITIES = {"high", "critical", "urgent", "significant", "red"}


def _serialise(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialise(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialise(item) for item in value]
    return value


def _as_text(value: Any) -> str:
    return str(value or "").strip()


def _rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description or []]
    output: list[dict[str, Any]] = []

    for row in rows or []:
        if isinstance(row, dict):
            output.append({key: _serialise(value) for key, value in row.items()})
            continue

        output.append({columns[index]: _serialise(value) for index, value in enumerate(row) if index < len(columns)})

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
    return {str(row.get("column_name") if isinstance(row, dict) else row[0]) for row in cursor.fetchall() or [] if row}


def _sql_text(columns: set[str], preferred: str, fallback: str) -> str:
    if preferred and preferred in columns:
        return f'COALESCE("{preferred}"::text, \'{fallback}\')'
    return f"'{fallback}'"


def _sql_date(columns: set[str], preferred: str) -> str | None:
    if preferred and preferred in columns:
        return preferred
    if "created_at" in columns:
        return "created_at"
    return None


def _fetch_source(cursor: Any, source: dict[str, str], young_person_id: int, limit: int) -> list[dict[str, Any]]:
    table = source["table"]
    if not _table_exists(cursor, table):
        return []

    columns = _columns(cursor, table)
    if "id" not in columns or "young_person_id" not in columns:
        return []

    date_column = _sql_date(columns, source.get("date", ""))
    if not date_column:
        return []

    title_sql = _sql_text(columns, source.get("title", ""), source["label"])
    summary_sql = _sql_text(columns, source.get("summary", ""), "No summary recorded")
    status_sql = _sql_text(columns, source.get("status", ""), "recorded")
    severity_sql = _sql_text(columns, source.get("severity", ""), "review")

    where = ["young_person_id = %s"]
    if "archived" in columns:
        where.append("COALESCE(archived, FALSE) = FALSE")
    if "is_deleted" in columns:
        where.append("COALESCE(is_deleted, FALSE) = FALSE")

    cursor.execute(
        f"""
        SELECT
            id,
            young_person_id,
            '{source['type']}' AS record_type,
            '{source['label']}' AS label,
            {title_sql} AS title,
            {summary_sql} AS summary,
            "{date_column}" AS date,
            {status_sql} AS status,
            {severity_sql} AS severity,
            '{table}' AS source_table
        FROM public."{table}"
        WHERE {' AND '.join(where)}
        ORDER BY "{date_column}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        (young_person_id, limit),
    )
    return _rows_to_dicts(cursor, cursor.fetchall())


def _record_ref(item: dict[str, Any]) -> str:
    return f"{item.get('source_table') or item.get('record_type')}:{item.get('id')}"


def _build_risk_signals(timeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    for item in timeline:
        record_type = _as_text(item.get("record_type")).lower()
        severity = _as_text(item.get("severity")).lower()
        if record_type in HIGH_SIGNAL_TYPES or severity in HIGH_SIGNAL_SEVERITIES:
            signals.append({**item, "citation_ref": _record_ref(item)})
    return signals[:30]


def _build_alerts(timeline: list[dict[str, Any]], risk_signals: list[dict[str, Any]], counts: Counter[str]) -> list[dict[str, str]]:
    alerts: list[dict[str, str]] = []

    incident_count = counts.get("incident", 0)
    safeguarding_count = counts.get("safeguarding", 0)
    missing_count = counts.get("missing_episode", 0)
    risk_count = counts.get("risk", 0)

    if safeguarding_count >= 2:
        alerts.append({
            "level": "high",
            "title": "Multiple safeguarding records",
            "summary": f"{safeguarding_count} safeguarding record(s) are visible. Check management oversight, actions taken and follow-up evidence.",
        })

    if incident_count >= 3:
        alerts.append({
            "level": "warning",
            "title": "Repeated incidents",
            "summary": f"{incident_count} incident record(s) are visible. Review for escalation, triggers, patterns and plan updates.",
        })

    if missing_count:
        alerts.append({
            "level": "high",
            "title": "Missing episode evidence",
            "summary": f"{missing_count} missing episode record(s) are visible. Check return home interviews, risk review and multi-agency follow-up.",
        })

    if risk_count or risk_signals:
        alerts.append({
            "level": "medium",
            "title": "Risk review required",
            "summary": f"{max(risk_count, len(risk_signals))} risk/safeguarding signal(s) should be checked for current controls and review dates.",
        })

    has_keywork = any(item.get("record_type") == "keywork" for item in timeline)
    if not has_keywork and timeline:
        alerts.append({
            "level": "medium",
            "title": "Child voice may be under-evidenced",
            "summary": "No keywork evidence is visible in the current context window. Check whether the child’s wishes, feelings and voice are clearly recorded.",
        })

    has_plan = any(item.get("record_type") == "support_plan" for item in timeline)
    if not has_plan and (incident_count or safeguarding_count or risk_count):
        alerts.append({
            "level": "medium",
            "title": "Plan linkage gap",
            "summary": "Risk, safeguarding or incident evidence is visible without support plan review evidence in the current window. Check whether plans reflect recent events.",
        })

    return alerts[:6]


def _build_patterns(timeline: list[dict[str, Any]], risk_signals: list[dict[str, Any]]) -> list[str]:
    patterns: list[str] = []
    counts = Counter(_as_text(item.get("record_type") or "record") for item in timeline)

    if timeline:
        top = ", ".join(f"{key.replace('_', ' ')}: {value}" for key, value in counts.most_common(4))
        patterns.append(f"Current evidence mix: {top}.")

    incident_count = counts.get("incident", 0)
    if incident_count:
        patterns.append(f"There are {incident_count} incident record(s) in the current context window.")

    safeguarding_count = counts.get("safeguarding", 0)
    if safeguarding_count:
        patterns.append(f"There are {safeguarding_count} safeguarding record(s) requiring clear action and oversight.")

    if risk_signals:
        patterns.append(f"There are {len(risk_signals)} risk or safeguarding signal(s) to review.")

    if not any(item.get("record_type") == "keywork" for item in timeline):
        patterns.append("No keywork evidence is visible in the current context window; consider whether the child’s voice is sufficiently evidenced.")

    if not any(item.get("record_type") == "support_plan" for item in timeline):
        patterns.append("No support plan review evidence is visible in the current context window; check whether plans reflect recent events.")

    return patterns[:8]


def _build_inspection_prompts(timeline: list[dict[str, Any]], risk_signals: list[dict[str, Any]]) -> list[dict[str, str]]:
    prompts = [
        {"title": "Evidence trail", "summary": "Can staff show what happened, what adults did, and what changed for the child?"},
        {"title": "Child voice", "summary": "Is the young person’s voice, presentation and wishes visible in recent records?"},
        {"title": "Manager oversight", "summary": "Are high-risk entries reviewed, signed off and linked to plans?"},
    ]
    if risk_signals:
        prompts.insert(0, {"title": "Risk review", "summary": f"Review {len(risk_signals)} risk/safeguarding signal(s) and ensure action is recorded."})
    if timeline and not any(item.get("record_type") == "support_plan" for item in timeline):
        prompts.append({"title": "Plan linkage", "summary": "Check whether recent events should update the care or support plan."})
    return prompts[:6]


def _build_sources(timeline: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "citation_ref": _record_ref(item),
            "title": item.get("title"),
            "summary": item.get("summary"),
            "date": item.get("date"),
            "record_type": item.get("record_type"),
            "source_table": item.get("source_table"),
            "record_id": item.get("id"),
        }
        for item in timeline[:50]
    ]


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
            rows: list[dict[str, Any]] = []
            for source in CARE_SOURCES:
                rows.extend(_fetch_source(cursor, source, young_person_id, safe_limit))

        timeline = sorted(rows, key=lambda item: str(item.get("date") or ""), reverse=True)[:safe_limit]
        risk_signals = _build_risk_signals(timeline)
        counts = Counter(_as_text(item.get("record_type") or "record") for item in timeline)
        alerts = _build_alerts(timeline, risk_signals, counts)
        patterns = _build_patterns(timeline, risk_signals)
        inspection_prompts = _build_inspection_prompts(timeline, risk_signals)
        sources = _build_sources(timeline)

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
            "alerts": alerts,
            "safeguarding_alerts": alerts,
            "patterns": patterns,
            "inspection_prompts": inspection_prompts,
            "manager_oversight": inspection_prompts,
            "counts_by_category": dict(counts),
            "sources": sources,
            "items": sources,
            "source_count": len(sources),
            "assistant_context": {
                "summary": "Young person OS context built across core care records for inspection-ready review.",
                "timeline_count": len(timeline),
                "risk_signal_count": len(risk_signals),
                "alert_count": len(alerts),
                "pattern_count": len(patterns),
                "inspection_prompt_count": len(inspection_prompts),
            },
        }
    finally:
        if conn is not None:
            release_db_connection(conn)
