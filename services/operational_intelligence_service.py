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
    cursor.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s)", (table_name,))
    row = cursor.fetchone()
    return bool(row.get("exists") if isinstance(row, dict) else row and row[0])


def _columns(cursor: Any, table_name: str) -> set[str]:
    cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
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

    select_parts = ["id", f"'{source['type']}' AS record_type", f"'{source['label']}' AS label", f'"{date_col}" AS event_date', f"'{table}' AS source_table"]
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
        f"SELECT {', '.join(select_parts)} FROM public.\"{table}\" WHERE {' AND '.join(where)} ORDER BY \"{date_col}\" DESC NULLS LAST, id DESC LIMIT %s",
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


def _risk_score(counts: Counter[str]) -> int:
    score = 0
    score += counts.get("safeguarding", 0) * 20
    score += counts.get("missing_episode", 0) * 18
    score += counts.get("incident", 0) * 8
    score += counts.get("risk", 0) * 7
    if counts.get("keywork", 0) == 0 and sum(counts.values()):
        score += 10
    if (counts.get("incident", 0) or counts.get("safeguarding", 0)) and counts.get("support_plan", 0) == 0:
        score += 12
    return max(0, min(score, 100))


def _risk_band(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "warning"
    return "review"


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
        grouped[_safe_int(event.get("home_id")) or 0].append(event)

    rows: list[dict[str, Any]] = []
    for home_id, items in grouped.items():
        counts = Counter(str(item.get("record_type") or "record") for item in items)
        score = _risk_score(counts)
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
            "risk_score": score,
            "alert_level": _risk_band(score),
        })
    return sorted(rows, key=lambda row: (-row["risk_score"], -row["total_events"]))


def _event_date(event: dict[str, Any]) -> date | None:
    try:
        return datetime.fromisoformat(str(event.get("event_date")).replace("Z", "+00:00")).date()
    except Exception:
        return None


def _trend_series(events: list[dict[str, Any]], days: int) -> list[dict[str, Any]]:
    bucket_count = 7 if days <= 30 else 10
    today = date.today()
    step = max(1, days // bucket_count)
    buckets: list[dict[str, Any]] = []
    for index in range(bucket_count):
        end = today - timedelta(days=index * step)
        start = max(today - timedelta(days=days), end - timedelta(days=step - 1))
        items = [event for event in events if (event_date := _event_date(event)) and start <= event_date <= end]
        counts = Counter(str(item.get("record_type") or "record") for item in items)
        buckets.append({"label": f"{start.strftime('%d %b')} - {end.strftime('%d %b')}", "total": len(items), "incidents": counts.get("incident", 0), "safeguarding": counts.get("safeguarding", 0), "missing_episodes": counts.get("missing_episode", 0)})
    return list(reversed(buckets))


def _predictive_signals(events: list[dict[str, Any]], trends: list[dict[str, Any]], homes: list[dict[str, Any]]) -> list[dict[str, str]]:
    signals: list[dict[str, str]] = []
    if len(trends) >= 2:
        previous = trends[-2]
        latest = trends[-1]
        if latest.get("incidents", 0) > previous.get("incidents", 0):
            signals.append({"level": "warning", "title": "Incident trend rising", "summary": "The latest trend window shows more incidents than the previous window. Check behaviour support and risk plans."})
        if latest.get("safeguarding", 0) > previous.get("safeguarding", 0):
            signals.append({"level": "high", "title": "Safeguarding trend rising", "summary": "Safeguarding activity has increased. Check escalation, management oversight and external notifications."})
        if latest.get("missing_episodes", 0) > previous.get("missing_episodes", 0):
            signals.append({"level": "high", "title": "Missing episode trend rising", "summary": "Missing episode activity has increased. Check return home interviews, risk controls and multi-agency planning."})

    high_homes = [home for home in homes if home.get("risk_score", 0) >= 70]
    if high_homes:
        signals.append({"level": "high", "title": "High-risk home(s) identified", "summary": f"{len(high_homes)} home(s) are currently scoring high risk. Prioritise leadership review and evidence checks."})
    if events and not any(event.get("record_type") == "keywork" for event in events):
        signals.append({"level": "medium", "title": "Child voice visibility risk", "summary": "No keywork evidence is visible in this window. This may weaken inspection evidence of wishes and feelings."})
    return signals[:6]


def _inspection_report(scope: str, score: int, counts: Counter[str], alerts: list[dict[str, Any]], homes: list[dict[str, Any]], signals: list[dict[str, str]]) -> dict[str, Any]:
    high_homes = [home for home in homes if home.get("risk_score", 0) >= 70]
    return {
        "title": f"IndiCare {scope.title()} Inspection Summary",
        "risk_statement": f"Current operational risk is scored at {score}/100 ({_risk_band(score)}).",
        "headline_findings": [
            f"{counts.get('incident', 0)} incident(s), {counts.get('safeguarding', 0)} safeguarding record(s), and {counts.get('missing_episode', 0)} missing episode(s) are visible in the review window.",
            f"{len(high_homes)} home(s) currently require high-priority leadership attention.",
            f"{len(alerts)} live alert(s) and {len(signals)} predictive signal(s) have been generated.",
        ],
        "strengths_to_check": [
            "Evidence of child voice through keywork, daily life records and direct work.",
            "Clear manager oversight on incidents, safeguarding and risk reviews.",
            "Plans updated in response to meaningful events and changing needs.",
        ],
        "challenge_points": [item.get("summary", item.get("title", "Review required")) for item in [*alerts, *signals]][:8],
        "recommended_leadership_actions": [
            "Prioritise high-risk homes and safeguarding alerts for management review.",
            "Check that incidents and safeguarding concerns are linked to plans and risk assessments.",
            "Confirm child voice and impact are evidenced, not just events recorded.",
            "Use the trend view to determine whether risk is increasing, reducing or stable.",
        ],
    }


def _chronology_graph_intelligence(events: list[dict[str, Any]]) -> dict[str, Any]:
    linked = [event for event in events if event.get("young_person_id")]
    by_child: dict[str, Counter[str]] = defaultdict(Counter)
    for event in linked:
        by_child[str(event.get("young_person_id"))][str(event.get("record_type") or "record")] += 1
    nodes = [
        {
            "young_person_id": young_person_id,
            "total_events": sum(counts.values()),
            "dominant_event_type": counts.most_common(1)[0][0] if counts else "record",
            "safeguarding_links": counts.get("safeguarding", 0),
            "incident_links": counts.get("incident", 0),
        }
        for young_person_id, counts in by_child.items()
    ]
    return {
        "nodes": sorted(nodes, key=lambda item: (-item["safeguarding_links"], -item["total_events"]))[:20],
        "edges_foundation": "Record-link graph foundation; durable cross-record edges can be populated by chronology linking jobs.",
        "patterns": [
            "Repeated family-time anxiety pattern should be checked where family contact and incident records cluster.",
            "Safeguarding/incident clusters should be reviewed against risk assessments and support plans.",
        ],
    }


def _safeguarding_panels(events: list[dict[str, Any]], counts: Counter[str]) -> list[dict[str, Any]]:
    safeguarding_events = [event for event in events if event.get("record_type") in {"safeguarding", "incident", "missing_episode", "risk"}]
    return [
        {
            "id": "manager_review",
            "title": "Manager review",
            "level": "high" if safeguarding_events else "review",
            "summary": f"{len(safeguarding_events)} safeguarding/risk-linked event(s) visible in the current window.",
            "spoken_summary": "There are safeguarding and risk-linked events that may need manager review." if safeguarding_events else "No safeguarding-linked events were visible in the current window.",
        },
        {
            "id": "plan_linkage",
            "title": "Plan linkage",
            "level": "medium" if (counts.get("incident", 0) or counts.get("safeguarding", 0)) and counts.get("support_plan", 0) == 0 else "stable",
            "summary": "Check whether incidents/safeguarding are linked to current plans and risk assessments.",
            "spoken_summary": "Incidents or safeguarding should be checked against current plans before drawing conclusions.",
        },
    ]


def _sccif_ofsted_readiness(score: int, alerts: list[dict[str, Any]], signals: list[dict[str, str]], counts: Counter[str]) -> dict[str, Any]:
    gaps: list[dict[str, str]] = []
    if counts.get("keywork", 0) == 0:
        gaps.append({"area": "Child voice", "summary": "Evidence for child voice is limited in this window."})
    if (counts.get("incident", 0) or counts.get("safeguarding", 0)) and counts.get("support_plan", 0) == 0:
        gaps.append({"area": "Impact of care", "summary": "Incident/safeguarding evidence needs plan-impact linkage."})
    if alerts or signals:
        gaps.append({"area": "Leadership and management", "summary": "Management oversight should be checked against current alerts and signals."})
    return {
        "readiness_band": _risk_band(score),
        "sccif_focus": ["help and protection", "leadership and management", "children's progress", "wishes and feelings"],
        "evidence_gaps": gaps[:8],
        "spoken_summary": "SCCIF readiness should focus on child voice, manager oversight and evidence of impact.",
    }


def _management_copilot_cards(alerts: list[dict[str, Any]], signals: list[dict[str, str]], homes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for alert in alerts[:4]:
        cards.append({"type": "alert", "title": alert.get("title"), "level": alert.get("level"), "summary": alert.get("summary"), "action": "Review evidence and assign management follow-up if needed."})
    for signal in signals[:3]:
        cards.append({"type": "predictive_signal", "title": signal.get("title"), "level": signal.get("level"), "summary": signal.get("summary"), "action": "Check whether the trend is supported by records and plans."})
    for home in homes[:2]:
        if home.get("risk_score", 0) >= 40:
            cards.append({"type": "home_risk", "title": home.get("home_name"), "level": home.get("alert_level"), "summary": f"Risk score {home.get('risk_score')}/100 from visible operational records.", "action": "Prioritise oversight and evidence checks."})
    return cards[:8]


def _child_centred_indicators(counts: Counter[str], events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": "child_voice",
            "label": "Child voice",
            "status": "limited" if counts.get("keywork", 0) == 0 and events else "visible",
            "summary": "Evidence for child voice is limited this month." if counts.get("keywork", 0) == 0 and events else "Child voice evidence is visible in the current window.",
        },
        {
            "id": "impact",
            "label": "Impact of care",
            "status": "needs_linkage" if (counts.get("incident", 0) or counts.get("safeguarding", 0)) and counts.get("support_plan", 0) == 0 else "review",
            "summary": "Check that plans show the impact of care after incidents or safeguarding events.",
        },
        {
            "id": "relationships",
            "label": "Relationships and family time",
            "status": "review",
            "summary": "Review family-time records for anxiety, presentation changes and follow-up evidence.",
        },
    ]


def _realtime_operational_events(alerts: list[dict[str, Any]], signals: list[dict[str, str]]) -> list[dict[str, Any]]:
    now = datetime.utcnow().isoformat() + "Z"
    return [
        {
            "id": f"op-{index}",
            "type": item.get("level") or "review",
            "title": item.get("title"),
            "summary": item.get("summary"),
            "created_at": now,
            "orb_spoken": item.get("summary"),
        }
        for index, item in enumerate([*alerts, *signals], start=1)
    ][:10]


def _orb_spoken_insights(summary: dict[str, Any], readiness: dict[str, Any], cards: list[dict[str, Any]]) -> list[str]:
    insights = [
        f"There are {summary.get('safeguarding', 0)} safeguarding record(s) and {summary.get('incidents', 0)} incident(s) in the current window.",
        readiness.get("spoken_summary", "SCCIF readiness should be reviewed against current records."),
    ]
    if summary.get("high_risk_homes", 0):
        insights.append(f"{summary['high_risk_homes']} home(s) currently need high-priority leadership attention.")
    for card in cards[:3]:
        if card.get("summary"):
            insights.append(str(card["summary"]))
    return insights[:6]


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
        score = _risk_score(counts)
        alerts = _build_alerts(events, counts)
        homes = _group_by_home(events, home_names)
        high_risk_homes = [home for home in homes if home.get("risk_score", 0) >= 70]
        trends = _trend_series(events, safe_days)
        predictive_signals = _predictive_signals(events, trends, homes)
        inspection_report = _inspection_report(scope, score, counts, alerts, homes, predictive_signals)
        chronology_graph = _chronology_graph_intelligence(events)
        safeguarding_panels = _safeguarding_panels(events, counts)
        sccif_readiness = _sccif_ofsted_readiness(score, alerts, predictive_signals, counts)
        management_cards = _management_copilot_cards(alerts, predictive_signals, homes)
        child_centred_indicators = _child_centred_indicators(counts, events)
        realtime_events = _realtime_operational_events(alerts, predictive_signals)
        summary = {
            "total_events": len(events),
            "incidents": counts.get("incident", 0),
            "safeguarding": counts.get("safeguarding", 0),
            "missing_episodes": counts.get("missing_episode", 0),
            "risk_reviews": counts.get("risk", 0),
            "keywork": counts.get("keywork", 0),
            "support_plans": counts.get("support_plan", 0),
            "homes_visible": len(homes),
            "risk_score": score,
            "high_risk_homes": len(high_risk_homes),
            "predictive_signals": len(predictive_signals),
        }

        return {
            "ok": True,
            "scope": scope,
            "role": role,
            "window_days": safe_days,
            "risk_score": score,
            "risk_band": _risk_band(score),
            "summary": summary,
            "counts_by_category": dict(counts),
            "alerts": alerts,
            "predictive_signals": predictive_signals,
            "inspection_report": inspection_report,
            "chronology_graph_intelligence": chronology_graph,
            "safeguarding_intelligence_panels": safeguarding_panels,
            "sccif_ofsted_readiness_intelligence": sccif_readiness,
            "management_copilot_cards": management_cards,
            "child_centred_intelligence_indicators": child_centred_indicators,
            "realtime_operational_events": realtime_events,
            "orb_spoken_insights": _orb_spoken_insights(summary, sccif_readiness, management_cards),
            "homes": homes,
            "ranked_homes": homes,
            "high_risk_homes": high_risk_homes,
            "trends": trends,
            "recent_events": events[:50],
            "provider_patterns": [
                f"Overall risk score is {score}/100 ({_risk_band(score)}).",
                f"{counts.get('incident', 0)} incident(s) across the current window.",
                f"{counts.get('safeguarding', 0)} safeguarding record(s) across the current window.",
                f"{len(high_risk_homes)} home(s) currently score as high risk.",
                f"{len(predictive_signals)} predictive signal(s) require review.",
            ],
            "recommended_actions": inspection_report["recommended_leadership_actions"],
        }
    finally:
        if conn is not None:
            release_db_connection(conn)


def build_orb_operational_intelligence_snapshot(*, current_user: dict[str, Any], context: dict[str, Any] | None = None) -> dict[str, Any]:
    """Small, failure-tolerant intelligence payload that Orb can speak during a turn."""

    role = _role(current_user)
    if role in PROVIDER_ROLES:
        scope = "provider"
    elif role in RI_ROLES:
        scope = "ri"
    elif role in MANAGER_ROLES:
        scope = "manager"
    else:
        scope = "staff"
    try:
        data = build_operational_intelligence(scope=scope, current_user=current_user, days=30)
        if not data.get("ok"):
            return {"ok": False, "scope": scope, "orb_spoken_insights": []}
        return {
            "ok": True,
            "scope": scope,
            "context": context or {},
            "summary": data.get("summary", {}),
            "orb_spoken_insights": data.get("orb_spoken_insights", []),
            "management_copilot_cards": data.get("management_copilot_cards", [])[:4],
            "sccif_ofsted_readiness_intelligence": data.get("sccif_ofsted_readiness_intelligence", {}),
            "realtime_operational_events": data.get("realtime_operational_events", [])[:4],
        }
    except Exception as exc:
        return {"ok": False, "scope": scope, "error": str(exc), "orb_spoken_insights": []}
