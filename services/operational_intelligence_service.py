from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection, release_db_connection


CARE_EVENT_SOURCES: tuple[dict[str, str], ...] = (
    {"table": "daily_notes", "type": "daily_note", "label": "Daily notes", "date": "note_date", "summary": "presentation"},
    {"table": "incidents", "type": "incident", "label": "Incidents", "date": "incident_datetime", "summary": "description"},
    {"table": "safeguarding_records", "type": "safeguarding", "label": "Safeguarding", "date": "concern_datetime", "summary": "concern_details"},
    {"table": "risk_assessments", "type": "risk", "label": "Risk", "date": "review_date", "summary": "summary"},
    {"table": "missing_episodes", "type": "missing_episode", "label": "Missing episodes", "date": "start_datetime", "summary": "outcome"},
    {"table": "keywork_sessions", "type": "keywork", "label": "Keywork", "date": "session_date", "summary": "summary"},
    {"table": "support_plans", "type": "support_plan", "label": "Support plans", "date": "review_date", "summary": "summary"},
    {"table": "health_records", "type": "health", "label": "Health", "date": "event_datetime", "summary": "summary"},
    {"table": "education_records", "type": "education", "label": "Education", "date": "record_date", "summary": "education_summary"},
    {"table": "family_contact_records", "type": "family", "label": "Family time", "date": "contact_datetime", "summary": "post_contact_presentation"},
)

HIGH_SIGNAL_TYPES = {"incident", "safeguarding", "risk", "missing_episode"}
PROVIDER_ROLES = {"provider", "provider_admin", "responsible_individual", "ri", "director", "admin", "super_admin", "superadmin", "administrator"}
RI_ROLES = {"responsible_individual", "ri", "provider", "provider_admin", "admin", "super_admin", "superadmin", "administrator"}
MANAGER_ROLES = {"manager", "registered_manager", "deputy_manager", "staff", "senior", "admin", "provider_admin", "super_admin", "superadmin", "administrator"}


def _serialise(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or current_user.get("user_role") or current_user.get("account_role") or "").strip().lower()


def _home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id"))


def _provider_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("provider_id") or current_user.get("organisation_id") or current_user.get("org_id"))


def _rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description or []]
    output: list[dict[str, Any]] = []
    for row in rows or []:
        if isinstance(row, dict):
            output.append({key: _serialise(value) for key, value in row.items()})
        else:
            output.append({columns[index]: _serialise(value) for index, value in enumerate(row) if index < len(columns)})
    return output


def _table_exists(cursor: Any, table_name: str) -> bool:
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = %s
        )
        """,
        (table_name,),
    )
    row = cursor.fetchone()
    return bool(row.get("exists") if isinstance(row, dict) else row and row[0])


def _columns(cursor: Any, table_name: str) -> set[str]:
    cursor.execute(
        """
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table_name,),
    )
    return {str(row.get("column_name") if isinstance(row, dict) else row[0]) for row in cursor.fetchall() or [] if row}


def _fetch_home_names(cursor: Any) -> dict[int, str]:
    for table in ("homes", "children_homes", "care_homes"):
        if not _table_exists(cursor, table):
            continue
        columns = _columns(cursor, table)
        if "id" not in columns:
            continue
        name_col = "name" if "name" in columns else "home_name" if "home_name" in columns else None
        if not name_col:
            continue
        cursor.execute(f'SELECT id, "{name_col}" AS name FROM public."{table}"')
        return {int(row["id"]): str(row["name"]) for row in _rows_to_dicts(cursor, cursor.fetchall()) if row.get("id")}
    return {}


def _source_rows(cursor: Any, source: dict[str, str], filters: dict[str, int | None], start_date: date, limit: int = 500) -> list[dict[str, Any]]:
    table = source["table"]
    if not _table_exists(cursor, table):
        return []
    columns = _columns(cursor, table)
    if "id" not in columns:
        return []
    date_col = source["date"] if source["date"] in columns else "created_at" if "created_at" in columns else None
    if not date_col:
        return []

    select_parts = [
        "id",
        f"'{source['type']}' AS record_type",
        f"'{source['label']}' AS label",
        f'"{date_col}" AS event_date',
        f"'{table}' AS source_table",
    ]

    for col in ("home_id", "provider_id", "young_person_id"):
        select_parts.append(f'"{col}"' if col in columns else f"NULL AS {col}")

    summary_col = source.get("summary") if source.get("summary") in columns else None
    select_parts.append(f'COALESCE("{summary_col}"::text, \'\') AS summary' if summary_col else "'' AS summary")

    where = [f'"{date_col}" >= %s']
    params: list[Any] = [start_date]

    if filters.get("home_id") and "home_id" in columns:
        where.append("home_id = %s")
        params.append(filters["home_id"])

    if filters.get("provider_id") and "provider_id" in columns:
        where.append("provider_id = %s")
        params.append(filters["provider_id"])

    if "archived" in columns:
        where.append("COALESCE(archived, FALSE) = FALSE")
    if "is_deleted" in columns:
        where.append("COALESCE(is_deleted, FALSE) = FALSE")

    params.append(limit)
    cursor.execute(
        f"""
        SELECT {', '.join(select_parts)}
        FROM public."{table}"
        WHERE {' AND '.join(where)}
        ORDER BY "{date_col}" DESC NULLS LAST, id DESC
        LIMIT %s
        """,
        tuple(params),
    )
    return _rows_to_dicts(cursor, cursor.fetchall())


def _allowed_scope(scope: str, role: str) -> bool:
    if scope == "provider":
        return role in PROVIDER_ROLES
    if scope == "ri":
        return role in RI_ROLES
    if scope in {"manager", "staff"}:
        return role in MANAGER_ROLES or role in PROVIDER_ROLES
    return False


def _build_alerts(events: list[dict[str, Any]], counts: Counter[str]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    if counts.get("safeguarding", 0):
        alerts.append({"level": "high", "title": "Safeguarding activity", "summary": f"{counts['safeguarding']} safeguarding record(s) in the current window."})
    if counts.get("incident", 0) >= 5:
        alerts.append({"level": "warning", "title": "Incident volume", "summary": f"{counts['incident']} incident(s) in the current window. Review patterns and plans."})
    if counts.get("missing_episode", 0):
        alerts.append({"level": "high", "title": "Missing episode evidence", "summary": f"{counts['missing_episode']} missing episode record(s). Check return home interviews and risk review."})
    if counts.get("risk", 0):
        alerts.append({"level": "medium", "title": "Risk review", "summary": f"{counts['risk']} risk assessment/review record(s) visible."})
    if events and counts.get("keywork", 0) == 0:
        alerts.append({"level": "medium", "title": "Child voice gap", "summary": "No keywork evidence is visible in this window. Check whether wishes and feelings are evidenced."})
    if (counts.get("incident", 0) or counts.get("safeguarding", 0)) and counts.get("support_plan", 0) == 0:
        alerts.append({"level": "medium", "title": "Plan linkage gap", "summary": "Incidents/safeguarding are visible without support plan review evidence in this window."})
    return alerts[:8]


def _group_by_home(events: list[dict[str, Any]], home_names: dict[int, str]) -> list[dict[str, Any]]:
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        home_id = _safe_int(event.get("home_id")) or 0
        grouped[home_id].append(event)

    rows: list[dict[str, Any]] = []
    for home_id, items in grouped.items():
        counts = Counter(str(item.get("record_type") or "record") for item in items)
        rows.append({
            "home_id": home_id or None,
            "home_name": home_names.get(home_id, "Unassigned / unknown home" if not home_id else f"Home {home_id}"),
            "total_events": len(items),
            "incidents": counts.get("incident", 0),
            "safeguarding": counts.get("safeguarding", 0),
            "missing_episodes": counts.get("missing_episode", 0),
            "risk_reviews": counts.get("risk", 0),
            "keywork": counts.get("keywork", 0),
            "support_plans": counts.get("support_plan", 0),
            "alert_level": "high" if counts.get("safeguarding", 0) or counts.get("missing_episode", 0) else "warning" if counts.get("incident", 0) >= 5 else "review",
        })
    return sorted(rows, key=lambda row: (row["alert_level"] != "high", -row["total_events"]))


def build_operational_intelligence(*, scope: str, current_user: dict[str, Any], days: int = 30) -> dict[str, Any]:
    role = _role(current_user)
    if not _allowed_scope(scope, role):
        return {"ok": False, "error": "forbidden", "detail": "Role cannot access this dashboard scope."}

    safe_days = max(1, min(int(days or 30), 120))
    start_date = date.today() - timedelta(days=safe_days)
    filters: dict[str, int | None] = {"home_id": None, "provider_id": None}

    if scope in {"staff", "manager"} and role not in PROVIDER_ROLES:
        filters["home_id"] = _home_id(current_user)
    elif scope in {"ri", "provider"}:
        filters["provider_id"] = _provider_id(current_user)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            events: list[dict[str, Any]] = []
            for source in CARE_EVENT_SOURCES:
                events.extend(_source_rows(cursor, source, filters, start_date))
            home_names = _fetch_home_names(cursor)

        events = sorted(events, key=lambda item: str(item.get("event_date") or ""), reverse=True)
        counts = Counter(str(item.get("record_type") or "record") for item in events)
        alerts = _build_alerts(events, counts)
        homes = _group_by_home(events, home_names)

        return {
            "ok": True,
            "scope": scope,
            "role": role,
            "window_days": safe_days,
            "summary": {
                "total_events": len(events),
                "incidents": counts.get("incident", 0),
                "safeguarding": counts.get("safeguarding", 0),
                "missing_episodes": counts.get("missing_episode", 0),
                "risk_reviews": counts.get("risk", 0),
                "keywork": counts.get("keywork", 0),
                "support_plans": counts.get("support_plan", 0),
                "homes_visible": len(homes),
            },
            "counts_by_category": dict(counts),
            "alerts": alerts,
            "homes": homes,
            "recent_events": events[:50],
            "provider_patterns": [
                f"{counts.get('incident', 0)} incident(s) across the current window.",
                f"{counts.get('safeguarding', 0)} safeguarding record(s) across the current window.",
                f"{len(homes)} home(s) visible in this dashboard scope.",
            ],
            "recommended_actions": [
                "Review all high-priority safeguarding and missing episode alerts first.",
                "Check whether incident patterns are reflected in risk and support plans.",
                "Use keywork and daily life evidence to ensure the child’s voice is visible.",
                "For provider/RI view, compare homes by repeated incidents, safeguarding activity and plan linkage gaps.",
            ],
        }
    finally:
        if conn is not None:
            release_db_connection(conn)
