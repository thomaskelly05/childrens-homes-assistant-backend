from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_current_user
from db.connection import get_db
from services.assistant_context_service import (
    build_home_os_context,
    build_quality_os_context,
    build_young_person_context,
)

router = APIRouter(prefix="/visibility", tags=["Visibility"])

PROVIDER_LEVEL_ROLES = {
    "admin",
    "provider_admin",
    "ri",
    "responsible_individual",
    "super_admin",
    "administrator",
}
COMPLETE_STATUSES = {"completed", "closed", "resolved", "done", "cancelled"}
IN_PROGRESS_STATUSES = {"in_progress", "in-progress", "pending", "awaiting"}
OVERDUE_STATUSES = {"overdue", "late"}
ABSENT_STAFF_STATUSES = {"absent", "sick", "off_shift", "annual_leave", "vacant", "vacancy"}

SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}
PRIORITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _normalise_token(value: Any) -> str:
    return _safe_text(value).lower().replace("-", "_").replace(" ", "_")


def _safe_items(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)

    raw = _safe_text(value)
    if not raw:
        return None

    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def _today_utc_date() -> date:
    return datetime.now(timezone.utc).date()


def _is_provider_role(current_user: dict[str, Any]) -> bool:
    return _normalise_token(current_user.get("role")) in PROVIDER_LEVEL_ROLES


def _is_open_status(status: Any) -> bool:
    return _normalise_token(status) not in COMPLETE_STATUSES


def _is_overdue(status: Any, due_value: Any) -> bool:
    status_token = _normalise_token(status)
    if status_token in OVERDUE_STATUSES:
        return True
    if not _is_open_status(status_token):
        return False
    due_dt = _parse_datetime(due_value)
    if not due_dt:
        return False
    return due_dt.date() < _today_utc_date()


def _priority_rank(priority: Any) -> int:
    return PRIORITY_RANK.get(_normalise_token(priority), 0)


def _severity_rank(severity: Any) -> int:
    return SEVERITY_RANK.get(_normalise_token(severity), 0)


def _derive_severity(
    *,
    status: Any,
    priority: Any,
    overdue: bool = False,
    default: str = "medium",
) -> str:
    status_token = _normalise_token(status)
    priority_token = _normalise_token(priority)
    if overdue or status_token == "overdue":
        return "high"
    if priority_token == "critical":
        return "critical"
    if priority_token == "high":
        return "high"
    if priority_token == "low":
        return "low"
    if _normalise_token(default) in {"critical", "high", "medium", "low"}:
        return _normalise_token(default)
    return "medium"


def _build_queue_item(
    *,
    title: str,
    summary: str,
    kind: str,
    severity: str,
    status: str = "",
    priority: str = "",
    due_date: Any = None,
    home_id: Any = None,
    young_person_id: Any = None,
    record_type: str = "",
    record_id: Any = None,
) -> dict[str, Any]:
    parsed_record_id = _safe_int(record_id)
    return {
        "title": title,
        "summary": summary,
        "kind": kind,
        "severity": _normalise_token(severity) or "medium",
        "status": _normalise_token(status),
        "priority": _normalise_token(priority),
        "due_date": due_date,
        "home_id": _safe_int(home_id),
        "young_person_id": _safe_int(young_person_id),
        "record_type": record_type,
        "record_id": parsed_record_id if parsed_record_id is not None else record_id,
    }


def _build_signal(
    *,
    code: str,
    title: str,
    count: int,
    description: str,
    severity: str,
) -> dict[str, Any]:
    return {
        "code": code,
        "title": title,
        "count": max(count, 0),
        "description": description,
        "severity": _normalise_token(severity) or "medium",
    }


def _sort_queue(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        items,
        key=lambda item: (
            -_severity_rank(item.get("severity")),
            -_priority_rank(item.get("priority")),
            _safe_text(item.get("due_date")) or "9999-12-31",
            _safe_text(item.get("title")),
        ),
    )


def _split_queue(items: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    urgent: list[dict[str, Any]] = []
    due_soon: list[dict[str, Any]] = []
    monitor: list[dict[str, Any]] = []

    for item in _sort_queue(items):
        severity = _normalise_token(item.get("severity"))
        due_date = _parse_datetime(item.get("due_date"))
        if severity in {"critical", "high"}:
            urgent.append(item)
            continue
        if due_date and due_date.date() <= (_today_utc_date() + timedelta(days=7)):
            due_soon.append(item)
            continue
        monitor.append(item)

    return {
        "urgent": urgent[:12],
        "due_soon": due_soon[:12],
        "monitor": monitor[:12],
    }


def _trend_metric(
    *,
    code: str,
    label: str,
    current: int,
    previous: int,
    better_when: str = "down",
) -> dict[str, Any]:
    delta = int(current) - int(previous)
    direction = "flat"
    if delta > 0:
        direction = "up"
    elif delta < 0:
        direction = "down"

    if previous > 0:
        pct_change = round((delta / previous) * 100, 1)
    elif current > 0:
        pct_change = 100.0
    else:
        pct_change = 0.0

    better_when_token = _normalise_token(better_when)
    if direction == "flat":
        assessment = "stable"
    elif better_when_token == "up":
        assessment = "improving" if direction == "up" else "declining"
    else:
        assessment = "improving" if direction == "down" else "declining"

    return {
        "code": code,
        "label": label,
        "current": int(current),
        "previous": int(previous),
        "delta": delta,
        "pct_change": pct_change,
        "direction": direction,
        "assessment": assessment,
    }


def _count_rows_in_windows(
    rows: list[dict[str, Any]],
    *,
    date_resolver,
    current_days: int = 14,
    previous_days: int = 14,
) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    current_start = now - timedelta(days=current_days)
    previous_start = current_start - timedelta(days=previous_days)

    current_count = 0
    previous_count = 0
    for row in rows:
        row_dt = date_resolver(row)
        if not row_dt:
            continue
        if row_dt >= current_start:
            current_count += 1
            continue
        if row_dt >= previous_start:
            previous_count += 1
    return current_count, previous_count


def _count_homes_over_incident_threshold(
    incidents: list[dict[str, Any]],
    *,
    threshold: int = 4,
    current_days: int = 30,
    previous_days: int = 30,
) -> tuple[int, int]:
    now = datetime.now(timezone.utc)
    current_start = now - timedelta(days=current_days)
    previous_start = current_start - timedelta(days=previous_days)

    current_by_home: defaultdict[int, int] = defaultdict(int)
    previous_by_home: defaultdict[int, int] = defaultdict(int)

    for row in incidents:
        home_id = _safe_int(row.get("home_id"))
        if home_id is None:
            continue

        row_dt = _parse_datetime(
            row.get("incident_datetime")
            or row.get("event_datetime")
            or row.get("created_at")
            or row.get("updated_at")
        )
        if not row_dt:
            continue

        if row_dt >= current_start:
            current_by_home[home_id] += 1
            continue
        if row_dt >= previous_start:
            previous_by_home[home_id] += 1

    current = sum(1 for count in current_by_home.values() if count >= threshold)
    previous = sum(1 for count in previous_by_home.values() if count >= threshold)
    return current, previous


def _completion_rate(rows: list[dict[str, Any]]) -> float:
    if not rows:
        return 0.0

    completed = 0
    for row in rows:
        status = row.get("status") or ("completed" if row.get("completed") else "open")
        if _normalise_token(status) in COMPLETE_STATUSES:
            completed += 1

    return round((completed / len(rows)) * 100, 1)


def _pattern_entry(
    *,
    code: str,
    title: str,
    frequency: int,
    period_days: int,
    severity: str,
    evidence: str,
    suggested_action: str,
) -> dict[str, Any]:
    return {
        "code": code,
        "title": title,
        "frequency": int(frequency),
        "period_days": int(period_days),
        "severity": _normalise_token(severity) or "medium",
        "evidence": evidence,
        "suggested_action": suggested_action,
    }


def _decision_support_entry(
    *,
    code: str,
    question: str,
    evidence: str,
    interpretation: str,
    suggested_action: str,
    severity: str = "medium",
) -> dict[str, Any]:
    return {
        "code": code,
        "question": question,
        "evidence": evidence,
        "interpretation": interpretation,
        "suggested_action": suggested_action,
        "severity": _normalise_token(severity) or "medium",
    }


def _attention_entry(
    *,
    code: str,
    title: str,
    score: int,
    evidence: str,
    suggested_action: str,
) -> dict[str, Any]:
    level = "low"
    if score >= 8:
        level = "high"
    elif score >= 4:
        level = "medium"

    return {
        "code": code,
        "title": title,
        "score": max(int(score), 0),
        "level": level,
        "evidence": evidence,
        "suggested_action": suggested_action,
    }


def _drift_indicator_entry(
    *,
    code: str,
    label: str,
    value: float,
    healthy_threshold: float,
    warning_threshold: float,
) -> dict[str, Any]:
    status = "healthy"
    if value < warning_threshold:
        status = "critical"
    elif value < healthy_threshold:
        status = "warning"

    return {
        "code": code,
        "label": label,
        "value": round(float(value), 1),
        "status": status,
        "healthy_threshold": healthy_threshold,
        "warning_threshold": warning_threshold,
    }


def _insight_block_entry(
    *,
    code: str,
    title: str,
    evidence: str,
    interpretation: str,
    suggested_action: str,
    severity: str = "medium",
) -> dict[str, Any]:
    return {
        "code": code,
        "title": title,
        "evidence": evidence,
        "interpretation": interpretation,
        "suggested_action": suggested_action,
        "severity": _normalise_token(severity) or "medium",
    }


def _top_changing_trends(
    trends: list[dict[str, Any]],
    *,
    limit: int = 3,
) -> list[dict[str, Any]]:
    ranked = sorted(
        trends,
        key=lambda item: (
            1 if _normalise_token(item.get("assessment")) in {"declining", "improving"} else 0,
            abs(_safe_int(item.get("delta")) or 0),
        ),
        reverse=True,
    )
    return ranked[:limit]


def _scope_story(
    scope_label: str,
    changing: list[dict[str, Any]],
    patterns: list[dict[str, Any]],
) -> str:
    if changing and patterns:
        lead = changing[0]
        pattern = patterns[0]
        return (
            f"{scope_label}: {lead.get('label', 'Key measure')} is "
            f"{lead.get('assessment', 'stable')}, and "
            f"{pattern.get('title', 'a repeating pattern')} needs follow-through."
        )

    if changing:
        lead = changing[0]
        return f"{scope_label}: {lead.get('label', 'Key measure')} is {lead.get('assessment', 'stable')}."

    if patterns:
        pattern = patterns[0]
        return f"{scope_label}: {pattern.get('title', 'A repeating pattern')} needs active monitoring."

    return f"{scope_label}: no major trend shifts were detected in this snapshot."


def _resolve_provider_id(conn, current_user: dict[str, Any]) -> int | None:
    provider_id = _safe_int(current_user.get("provider_id"))
    if provider_id is not None:
        return provider_id

    user_home_id = _safe_int(current_user.get("home_id"))
    if user_home_id is None:
        return None

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider_id
            FROM homes
            WHERE id = %s
            LIMIT 1
            """,
            (user_home_id,),
        )
        row = cur.fetchone() or {}

    return _safe_int(row.get("provider_id"))


def _resolve_provider_home_ids(conn, current_user: dict[str, Any]) -> list[int]:
    provider_id = _resolve_provider_id(conn, current_user)
    if provider_id is None:
        return []

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id
            FROM homes
            WHERE provider_id = %s
            ORDER BY name ASC, id ASC
            LIMIT 200
            """,
            (provider_id,),
        )
        rows = cur.fetchall() or []

    return [int(row["id"]) for row in rows if _safe_int(row.get("id")) is not None]


def _tasks_from_child_context(context: dict[str, Any]) -> list[dict[str, Any]]:
    active_work = context.get("active_work") if isinstance(context.get("active_work"), dict) else {}
    return _safe_items(active_work.get("tasks"))


def _build_child_snapshot(context: dict[str, Any]) -> dict[str, Any]:
    scope_meta = context.get("scope") if isinstance(context.get("scope"), dict) else {}
    young_person_id = _safe_int(scope_meta.get("young_person_id"))
    home_id = _safe_int(scope_meta.get("home_id"))

    tasks = _tasks_from_child_context(context)
    recent_records = context.get("recent_records") if isinstance(context.get("recent_records"), dict) else {}
    identity = context.get("identity") if isinstance(context.get("identity"), dict) else {}

    incidents = _safe_items(recent_records.get("incidents")) + _safe_items(
        recent_records.get("missing_episodes")
    )
    safeguarding_records = _safe_items(recent_records.get("safeguarding_records"))
    education_records = _safe_items(recent_records.get("education_records"))
    health_records = _safe_items(recent_records.get("health_records"))
    family_contacts = _safe_items(recent_records.get("family_contact_records"))
    keywork_sessions = _safe_items(recent_records.get("keywork_sessions"))
    achievements = _safe_items(recent_records.get("achievements"))
    wellbeing_checks = _safe_items(recent_records.get("wellbeing_checks"))
    therapy_notes = _safe_items(recent_records.get("therapy_session_notes"))
    active_alerts = _safe_items(identity.get("active_alerts"))

    overdue_actions = [
        task
        for task in tasks
        if _is_open_status(task.get("status") or ("completed" if task.get("completed") else "open"))
        and _is_overdue(task.get("status"), task.get("due_date"))
    ]

    unowned_actions = [
        task
        for task in tasks
        if _is_open_status(task.get("status") or ("completed" if task.get("completed") else "open"))
        and not (
            _safe_int(task.get("assigned_to_user_id"))
            or _safe_int(task.get("staff_id"))
            or _safe_text(task.get("assigned_role"))
        )
    ]

    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    stuck_in_progress = [
        task
        for task in tasks
        if _normalise_token(task.get("status")) in IN_PROGRESS_STATUSES
        and (
            _parse_datetime(task.get("updated_at") or task.get("created_at"))
            or datetime.now(timezone.utc)
        )
        <= stale_cutoff
    ]

    open_safeguarding = [
        row
        for row in safeguarding_records
        if _is_open_status(row.get("status") or row.get("workflow_status") or "open")
    ]

    safeguarding_alerts = [
        row
        for row in active_alerts
        if "safeguard"
        in _normalise_token(row.get("alert_type") or row.get("title") or row.get("description"))
    ]

    incident_window = datetime.now(timezone.utc) - timedelta(days=30)
    recent_incidents = []

    for incident in incidents:
        incident_dt = _parse_datetime(
            incident.get("incident_datetime")
            or incident.get("event_datetime")
            or incident.get("created_at")
            or incident.get("updated_at")
        )
        if not incident_dt or incident_dt < incident_window:
            continue
        recent_incidents.append(incident)

    pattern_counter: Counter[str] = Counter()
    for incident in recent_incidents:
        pattern_counter[_safe_text(incident.get("incident_type"), "incident")] += 1

    repeated_patterns = [(name, count) for name, count in pattern_counter.items() if count >= 2]

    recent_incident_window = datetime.now(timezone.utc) - timedelta(days=14)
    missing_follow_up_after_incident = []

    for incident in recent_incidents:
        incident_dt = _parse_datetime(
            incident.get("incident_datetime")
            or incident.get("event_datetime")
            or incident.get("created_at")
        )
        if not incident_dt or incident_dt < recent_incident_window:
            continue

        incident_id = _safe_int(incident.get("id"))
        if incident_id is None:
            continue

        linked = any(
            _safe_int(task.get("source_id")) == incident_id
            and "incident" in _normalise_token(task.get("source_table"))
            for task in tasks
        )

        if not linked:
            missing_follow_up_after_incident.append(incident)

    queue: list[dict[str, Any]] = []

    for task in overdue_actions[:6]:
        queue.append(
            _build_queue_item(
                title=_safe_text(task.get("title") or task.get("task"), "Overdue child action"),
                summary="Follow-up is overdue for this child.",
                kind="overdue_child_action",
                severity=_derive_severity(
                    status=task.get("status"),
                    priority=task.get("priority"),
                    overdue=True,
                    default="high",
                ),
                status=_safe_text(task.get("status")),
                priority=_safe_text(task.get("priority")),
                due_date=task.get("due_date"),
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="task",
                record_id=task.get("id"),
            )
        )

    for task in unowned_actions[:4]:
        queue.append(
            _build_queue_item(
                title=_safe_text(task.get("title") or task.get("task"), "Action has no owner"),
                summary="Assign ownership so follow-through is accountable.",
                kind="unowned_action",
                severity="medium",
                status=_safe_text(task.get("status")),
                priority=_safe_text(task.get("priority")),
                due_date=task.get("due_date"),
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="task",
                record_id=task.get("id"),
            )
        )

    for task in stuck_in_progress[:4]:
        queue.append(
            _build_queue_item(
                title=_safe_text(task.get("title") or task.get("task"), "Action stuck in progress"),
                summary="This action has been in progress for over a week.",
                kind="stuck_action",
                severity="high",
                status=_safe_text(task.get("status")),
                priority=_safe_text(task.get("priority")),
                due_date=task.get("due_date"),
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="task",
                record_id=task.get("id"),
            )
        )

    for incident in missing_follow_up_after_incident[:5]:
        queue.append(
            _build_queue_item(
                title=_safe_text(incident.get("incident_type"), "Incident follow-up missing"),
                summary="Recent incident has no linked follow-up action.",
                kind="missing_incident_follow_up",
                severity="high",
                status=_safe_text(incident.get("status"), "open"),
                due_date=incident.get("incident_datetime") or incident.get("created_at"),
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="incident",
                record_id=incident.get("id"),
            )
        )

    for row in (open_safeguarding + safeguarding_alerts)[:5]:
        queue.append(
            _build_queue_item(
                title=_safe_text(
                    row.get("title") or row.get("concern_type"),
                    "Safeguarding follow-up required",
                ),
                summary=_safe_text(
                    row.get("summary") or row.get("description"),
                    "Open safeguarding concern needs review.",
                ),
                kind="safeguarding_open",
                severity="critical",
                status=_safe_text(row.get("status") or row.get("workflow_status"), "open"),
                due_date=row.get("review_date") or row.get("updated_at"),
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="safeguarding_record",
                record_id=row.get("id"),
            )
        )

    for incident_type, count in repeated_patterns[:4]:
        queue.append(
            _build_queue_item(
                title=f"Repeated {incident_type.replace('_', ' ')} incidents",
                summary=f"{count} incidents of this type in the last 30 days.",
                kind="repeated_incident_pattern",
                severity="medium" if count < 4 else "high",
                status="open",
                home_id=home_id,
                young_person_id=young_person_id,
                record_type="incident_pattern",
            )
        )

    pressures = {
        "action_pressure": len(overdue_actions) + len(unowned_actions) + len(stuck_in_progress),
        "safeguarding_pressure": len(open_safeguarding) + len(safeguarding_alerts),
        "incident_pattern_pressure": len(repeated_patterns),
        "quality_pressure": len(missing_follow_up_after_incident),
        "inspection_pressure": 0,
        "staffing_pressure": 0,
    }
    pressures["total"] = sum(value for value in pressures.values())
    signals = [
        _build_signal(
            code="overdue_child_actions",
            title="Overdue child actions",
            count=len(overdue_actions),
            description="Child-specific follow-up that is now overdue.",
            severity="high",
        ),
        _build_signal(
            code="repeated_incident_patterns",
            title="Repeated incident patterns",
            count=len(repeated_patterns),
            description="Incident themes repeating for this child.",
            severity="medium",
        ),
        _build_signal(
            code="open_safeguarding",
            title="Open safeguarding concerns",
            count=len(open_safeguarding) + len(safeguarding_alerts),
            description="Safeguarding concerns still requiring closure.",
            severity="critical",
        ),
        _build_signal(
            code="missing_incident_follow_up",
            title="Incident follow-up missing",
            count=len(missing_follow_up_after_incident),
            description="Recent incidents missing a linked follow-up task.",
            severity="high",
        ),
        _build_signal(
            code="unowned_actions",
            title="Actions with no owner",
            count=len(unowned_actions),
            description="Open actions requiring clear ownership.",
            severity="medium",
        ),
        _build_signal(
            code="stuck_in_progress",
            title="Actions stuck in progress",
            count=len(stuck_in_progress),
            description="Actions in progress for too long without closure.",
            severity="high",
        ),
    ]

    queue_split = _split_queue(queue)
    sorted_queue = _sort_queue(queue)

    incident_current, incident_previous = _count_rows_in_windows(
        recent_incidents,
        date_resolver=lambda row: _parse_datetime(
            row.get("incident_datetime")
            or row.get("event_datetime")
            or row.get("created_at")
        ),
    )

    follow_up_gap_current, follow_up_gap_previous = _count_rows_in_windows(
        missing_follow_up_after_incident,
        date_resolver=lambda row: _parse_datetime(
            row.get("incident_datetime")
            or row.get("event_datetime")
            or row.get("created_at")
        ),
    )

    open_actions = [
        task
        for task in tasks
        if _is_open_status(task.get("status") or ("completed" if task.get("completed") else "open"))
    ]

    open_action_current, open_action_previous = _count_rows_in_windows(
        open_actions,
        date_resolver=lambda row: _parse_datetime(
            row.get("updated_at") or row.get("created_at")
        ),
    )

    safeguarding_current, safeguarding_previous = _count_rows_in_windows(
        safeguarding_records,
        date_resolver=lambda row: _parse_datetime(
            row.get("updated_at") or row.get("created_at")
        ),
    )

    achievement_current, achievement_previous = _count_rows_in_windows(
        achievements,
        date_resolver=lambda row: _parse_datetime(
            row.get("created_at") or row.get("recorded_at") or row.get("updated_at")
        ),
        current_days=30,
        previous_days=30,
    )

    engagement_rows = (
        keywork_sessions
        + family_contacts
        + wellbeing_checks
        + therapy_notes
    )

    engagement_current, engagement_previous = _count_rows_in_windows(
        engagement_rows,
        date_resolver=lambda row: _parse_datetime(
            row.get("session_datetime")
            or row.get("contact_datetime")
            or row.get("recorded_at")
            or row.get("created_at")
            or row.get("updated_at")
        ),
        current_days=30,
        previous_days=30,
    )

    trends = [
        _trend_metric(
            code="child_incident_volume",
            label="Incident volume (14-day)",
            current=incident_current,
            previous=incident_previous,
            better_when="down",
        ),
        _trend_metric(
            code="child_follow_up_gaps",
            label="Missing incident follow-up",
            current=follow_up_gap_current,
            previous=follow_up_gap_previous,
            better_when="down",
        ),
        _trend_metric(
            code="child_open_action_pressure",
            label="Open child actions",
            current=open_action_current,
            previous=open_action_previous,
            better_when="down",
        ),
        _trend_metric(
            code="child_safeguarding_activity",
            label="Safeguarding activity",
            current=safeguarding_current,
            previous=safeguarding_previous,
            better_when="down",
        ),
        _trend_metric(
            code="child_achievement_progress",
            label="Achievements captured (30-day)",
            current=achievement_current,
            previous=achievement_previous,
            better_when="up",
        ),
        _trend_metric(
            code="child_engagement_touchpoints",
            label="Engagement touchpoints (30-day)",
            current=engagement_current,
            previous=engagement_previous,
            better_when="up",
        ),
    ]

    patterns = [
        _pattern_entry(
            code=f"child_repeated_incident_{_normalise_token(incident_type)}",
            title=f"Repeated {incident_type.replace('_', ' ')} incidents",
            frequency=count,
            period_days=30,
            severity="high" if count >= 4 else "medium",
            evidence=f"{count} incidents of this type in the last 30 days.",
            suggested_action="Review triggers and link targeted support actions.",
        )
        for incident_type, count in repeated_patterns[:4]
    ]

    if len(missing_follow_up_after_incident) >= 2:
        patterns.append(
            _pattern_entry(
                code="child_repeated_missing_follow_up",
                title="Repeated missing incident follow-up",
                frequency=len(missing_follow_up_after_incident),
                period_days=14,
                severity="high",
                evidence=f"{len(missing_follow_up_after_incident)} recent incidents have no linked follow-up task.",
                suggested_action="Create linked actions and capture closure outcomes.",
            )
        )

    if len(stuck_in_progress) >= 2:
        patterns.append(
            _pattern_entry(
                code="child_stuck_actions",
                title="Actions repeatedly stalling in progress",
                frequency=len(stuck_in_progress),
                period_days=7,
                severity="medium",
                evidence=f"{len(stuck_in_progress)} child actions are in progress for over 7 days.",
                suggested_action="Assign clear owner and completion date in next review.",
            )
        )

    decision_support = [
        _decision_support_entry(
            code="child_pattern_question",
            question="What is becoming a pattern for this child?",
            evidence=patterns[0]["evidence"] if patterns else f"{incident_current} incidents in the last 14 days.",
            interpretation=(
                "Recurring incident themes suggest support planning may need adjustment."
                if patterns
                else "No recurrence threshold has been crossed."
            ),
            suggested_action=(
                patterns[0]["suggested_action"]
                if patterns
                else "Continue monitoring and record protective factors."
            ),
            severity=patterns[0]["severity"] if patterns else "low",
        ),
        _decision_support_entry(
            code="child_follow_through_question",
            question="Where is follow-through missing?",
            evidence=(
                f"{len(missing_follow_up_after_incident)} incidents without follow-up and "
                f"{len(overdue_actions)} overdue child actions."
            ),
            interpretation=(
                "Follow-through gaps risk incidents being recorded but not acted on."
                if (missing_follow_up_after_incident or overdue_actions)
                else "Follow-through is currently being maintained."
            ),
            suggested_action=(
                "Create or assign missing actions and confirm closure notes."
                if (missing_follow_up_after_incident or overdue_actions)
                else "Maintain current review rhythm."
            ),
            severity="high" if (missing_follow_up_after_incident or overdue_actions) else "low",
        ),
    ]
    decision_support.append(
        _decision_support_entry(
            code="child_management_attention_question",
            question="What needs management attention now?",
            evidence=(
                f"{len(open_safeguarding) + len(safeguarding_alerts)} open safeguarding concerns and "
                f"{len(unowned_actions)} unowned actions."
            ),
            interpretation=(
                "Management oversight is needed to secure safeguarding and ownership."
                if (open_safeguarding or safeguarding_alerts or unowned_actions)
                else "No immediate manager escalation is indicated."
            ),
            suggested_action=(
                "Review safeguarding chronology and assign owners in management check-in."
                if (open_safeguarding or safeguarding_alerts or unowned_actions)
                else "Continue routine oversight."
            ),
            severity="critical" if (open_safeguarding or safeguarding_alerts) else "medium",
        )
    )

    changing = _top_changing_trends(trends, limit=3)

    child_story_blocks = [
        _insight_block_entry(
            code="child_risk_story",
            title="Risk and safety picture",
            evidence=(
                f"{len(open_safeguarding) + len(safeguarding_alerts)} open safeguarding concerns, "
                f"{incident_current} incidents in last 14 days."
            ),
            interpretation=(
                "Risk pressure is elevated and needs active safeguarding oversight."
                if (open_safeguarding or safeguarding_alerts or incident_current >= 3)
                else "No acute safeguarding surge is indicated in this snapshot."
            ),
            suggested_action=(
                "Review chronology with manager and confirm immediate follow-through actions."
                if (open_safeguarding or safeguarding_alerts or incident_current >= 3)
                else "Continue planned safeguarding reviews."
            ),
            severity="high" if (open_safeguarding or safeguarding_alerts) else "medium",
        ),
        _insight_block_entry(
            code="child_progress_story",
            title="Progress and protective factors",
            evidence=(
                f"{achievement_current} achievements this month, "
                f"{len(education_records)} education records, {len(health_records)} health records."
            ),
            interpretation=(
                "Progress signals are strengthening."
                if achievement_current >= achievement_previous
                else "Progress signals look weaker than the previous period."
            ),
            suggested_action=(
                "Capture protective factors and reinforce what is working in plans and keywork."
                if achievement_current >= achievement_previous
                else "Review support planning focus and increase targeted progress work."
            ),
            severity="low" if achievement_current >= achievement_previous else "medium",
        ),
        _insight_block_entry(
            code="child_engagement_story",
            title="Child voice and engagement",
            evidence=f"{engagement_current} keywork/family/wellbeing/therapy touchpoints in last 30 days.",
            interpretation=(
                "Engagement touchpoints are increasing."
                if engagement_current >= engagement_previous
                else "Engagement touchpoints have reduced and may hide emerging needs."
            ),
            suggested_action=(
                "Ensure child voice is reflected in next actions and reviews."
                if engagement_current >= engagement_previous
                else "Increase direct-work cadence and capture child voice explicitly."
            ),
            severity="low" if engagement_current >= engagement_previous else "medium",
        ),
    ]

    what_is_missing = []
    if missing_follow_up_after_incident:
        what_is_missing.append("Incident follow-up is missing on recent events.")
    if unowned_actions:
        what_is_missing.append("Some open actions do not have a named owner.")
    if not patterns:
        what_is_missing.append("No repeated incident pattern has crossed threshold yet.")

    return {
        "scope": "child",
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "home_id": home_id,
            "young_person_id": young_person_id,
        },
        "pressures": pressures,
        "counts": {
            "tasks_total": len(tasks),
            "overdue_actions": len(overdue_actions),
            "unowned_actions": len(unowned_actions),
            "stuck_actions": len(stuck_in_progress),
            "open_safeguarding": len(open_safeguarding) + len(safeguarding_alerts),
            "repeated_incident_patterns": len(repeated_patterns),
        },
        "signals": [signal for signal in signals if signal["count"] > 0],
        "highlights": sorted_queue[:6],
        "queues": queue_split,
        "trends": trends,
        "patterns": patterns[:6],
        "decision_support": decision_support[:6],
        "child_story_blocks": child_story_blocks,
        "what_is_changing": changing,
        "what_needs_attention": queue_split.get("urgent", [])[:5],
        "what_is_missing": what_is_missing,
        "insight_story": _scope_story("Child picture", changing, patterns),
    }


def _build_home_snapshot(home_ctx: dict[str, Any], quality_ctx: dict[str, Any]) -> dict[str, Any]:
    scope_meta = home_ctx.get("scope") if isinstance(home_ctx.get("scope"), dict) else {}
    home_id = _safe_int(scope_meta.get("home_id"))

    tasks = _safe_items(home_ctx.get("tasks"))
    incidents = _safe_items(home_ctx.get("incidents"))
    team = _safe_items(home_ctx.get("team"))
    vacancies = _safe_items(home_ctx.get("vacancies"))
    compliance_items = _safe_items(quality_ctx.get("compliance_items"))
    inspection_actions = _safe_items(quality_ctx.get("inspection_actions"))
    inspection_reasons = _safe_items(quality_ctx.get("inspection_reasons"))

    overdue_home_actions = [
        task for task in tasks
        if _is_open_status(task.get("status") or ("completed" if task.get("completed") else "open"))
        and _is_overdue(task.get("status"), task.get("due_date"))
    ]

    unowned_actions = [
        task for task in tasks
        if _is_open_status(task.get("status") or ("completed" if task.get("completed") else "open"))
        and not (
            _safe_int(task.get("assigned_to_user_id"))
            or _safe_int(task.get("staff_id"))
            or _safe_text(task.get("assigned_role"))
        )
    ]

    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    stuck_in_progress = [
        task for task in tasks
        if _normalise_token(task.get("status")) in IN_PROGRESS_STATUSES
        and (_parse_datetime(task.get("updated_at") or task.get("created_at")) or datetime.now(timezone.utc)) <= stale_cutoff
    ]

    safeguarding_incidents = [
        item for item in incidents
        if bool(item.get("safeguarding_flag"))
        or "safeguard" in _normalise_token(item.get("incident_type"))
    ]

    incident_window = datetime.now(timezone.utc) - timedelta(days=30)
    incident_counter: Counter[str] = Counter()
    for incident in incidents:
        incident_dt = _parse_datetime(
            incident.get("incident_datetime")
            or incident.get("event_datetime")
            or incident.get("created_at")
            or incident.get("updated_at")
        )
        if incident_dt and incident_dt >= incident_window:
            incident_counter[_safe_text(incident.get("incident_type"), "incident")] += 1

    repeated_home_patterns = [(incident_type, count) for incident_type, count in incident_counter.items() if count >= 3]

    overdue_compliance = [
        item for item in compliance_items
        if _is_open_status(item.get("status"))
        and _is_overdue(item.get("status"), item.get("due_date"))
    ]

    open_inspection_risks = [
        item for item in inspection_actions
        if _is_open_status(item.get("status"))
        and (
            _is_overdue(item.get("status"), item.get("due_date"))
            or _priority_rank(item.get("priority")) >= PRIORITY_RANK["high"]
        )
    ]

    quality_theme_risks = [
        item for item in inspection_reasons
        if _safe_int(item.get("priority")) is not None and int(item.get("priority") or 99) <= 2
    ]

    absent_staff = [item for item in team if _normalise_token(item.get("status")) in ABSENT_STAFF_STATUSES]
    staffing_shortfalls = len(vacancies) + len(absent_staff)

    recent_incidents = [
        incident for incident in incidents
        if (_parse_datetime(incident.get("incident_datetime") or incident.get("created_at")) or datetime(1970, 1, 1, tzinfo=timezone.utc))
        >= (datetime.now(timezone.utc) - timedelta(days=14))
    ]

    missing_follow_up_after_incidents = []
    for incident in recent_incidents:
        incident_id = _safe_int(incident.get("id"))
        if incident_id is None:
            continue
        linked = any(
            _safe_int(task.get("source_id")) == incident_id
            and "incident" in _normalise_token(task.get("source_table"))
            for task in tasks
        )
        if not linked:
            missing_follow_up_after_incidents.append(incident)

    queue: list[dict[str, Any]] = []

    for task in overdue_home_actions[:8]:
        queue.append(
            _build_queue_item(
                title=_safe_text(task.get("title") or task.get("task"), "Overdue home action"),
                summary="Home-level action is overdue and needs management review.",
                kind="overdue_home_action",
                severity=_derive_severity(status=task.get("status"), priority=task.get("priority"), overdue=True, default="high"),
                status=_safe_text(task.get("status")),
                priority=_safe_text(task.get("priority")),
                due_date=task.get("due_date"),
                home_id=home_id,
                record_type="task",
                record_id=task.get("id"),
            )
        )

    for item in overdue_compliance[:6]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("title"), "Overdue compliance item"),
                summary="Compliance drift requires immediate follow-through.",
                kind="overdue_compliance",
                severity="high",
                status=_safe_text(item.get("status")),
                priority=_safe_text(item.get("priority") or item.get("severity")),
                due_date=item.get("due_date"),
                home_id=home_id,
                record_type="compliance_item",
                record_id=item.get("id"),
            )
        )

    for item in open_inspection_risks[:5]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("action_title") or item.get("title"), "Inspection preparation risk"),
                summary="Open inspection action could weaken readiness if left unresolved.",
                kind="inspection_risk",
                severity="high",
                status=_safe_text(item.get("status")),
                priority=_safe_text(item.get("priority")),
                due_date=item.get("due_date"),
                home_id=home_id,
                record_type="inspection_action",
                record_id=item.get("id"),
            )
        )

    for item in missing_follow_up_after_incidents[:5]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("incident_type"), "Incident follow-up missing"),
                summary="Recent incident has no linked action and needs management follow-through.",
                kind="missing_incident_follow_up",
                severity="high",
                status=_safe_text(item.get("status"), "open"),
                due_date=item.get("incident_datetime") or item.get("created_at"),
                home_id=home_id,
                record_type="incident",
                record_id=item.get("id"),
            )
        )

    for incident_type, count in repeated_home_patterns[:4]:
        queue.append(
            _build_queue_item(
                title=f"Repeated {incident_type.replace('_', ' ')} incidents",
                summary=f"{count} incidents of this type in the home over the last 30 days.",
                kind="home_incident_pattern",
                severity="high" if count >= 5 else "medium",
                status="open",
                home_id=home_id,
                record_type="incident_pattern",
            )
        )

    if staffing_shortfalls:
        queue.append(
            _build_queue_item(
                title="Staffing pressure",
                summary=f"{staffing_shortfalls} staffing shortfall indicators from vacancies or absences.",
                kind="staffing_shortfall",
                severity="high" if staffing_shortfalls >= 3 else "medium",
                status="open",
                home_id=home_id,
                record_type="staffing",
            )
        )

    pressures = {
        "action_pressure": len(overdue_home_actions) + len(unowned_actions) + len(stuck_in_progress),
        "safeguarding_pressure": len(safeguarding_incidents),
        "incident_pattern_pressure": len(repeated_home_patterns),
        "quality_pressure": len(overdue_compliance) + len(missing_follow_up_after_incidents),
        "inspection_pressure": len(open_inspection_risks) + len(quality_theme_risks),
        "staffing_pressure": staffing_shortfalls,
    }
    pressures["total"] = sum(value for value in pressures.values())

    signals = [
        _build_signal(code="overdue_home_actions", title="Overdue home actions", count=len(overdue_home_actions), description="Operational follow-through actions overdue at home level.", severity="high"),
        _build_signal(code="staffing_shortfalls", title="Staffing shortfalls", count=staffing_shortfalls, description="Vacancy or absence pressure requiring management response.", severity="high"),
        _build_signal(code="safeguarding_themes", title="Safeguarding themes", count=len(safeguarding_incidents), description="Safeguarding-linked incidents requiring oversight.", severity="critical"),
        _build_signal(code="incident_spikes", title="Incident spikes", count=len(repeated_home_patterns), description="Repeated incident patterns emerging across the home.", severity="high"),
        _build_signal(code="overdue_compliance", title="Compliance drift", count=len(overdue_compliance), description="Compliance items are overdue and need closure.", severity="high"),
        _build_signal(code="inspection_risk", title="Inspection risk", count=len(open_inspection_risks), description="Inspection actions that are high priority or overdue.", severity="high"),
        _build_signal(code="actions_without_owner", title="Actions without owner", count=len(unowned_actions), description="Open actions missing clear ownership.", severity="medium"),
        _build_signal(code="stuck_actions", title="Actions stuck in progress", count=len(stuck_in_progress), description="Actions that have not moved for over a week.", severity="medium"),
    ]

    queue_split = _split_queue(queue)
    sorted_queue = _sort_queue(queue)

    home_incident_current, home_incident_previous = _count_rows_in_windows(
        incidents,
        date_resolver=lambda row: _parse_datetime(row.get("incident_datetime") or row.get("event_datetime") or row.get("created_at")),
    )

    home_follow_up_gap_current, home_follow_up_gap_previous = _count_rows_in_windows(
        missing_follow_up_after_incidents,
        date_resolver=lambda row: _parse_datetime(row.get("incident_datetime") or row.get("event_datetime") or row.get("created_at")),
    )

    home_overdue_action_current, home_overdue_action_previous = _count_rows_in_windows(
        overdue_home_actions,
        date_resolver=lambda row: _parse_datetime(row.get("due_date") or row.get("updated_at") or row.get("created_at")),
    )

    home_staffing_previous = max(staffing_shortfalls - len(vacancies), 0)

    trends = [
        _trend_metric(code="home_incident_volume", label="Incident volume (14-day)", current=home_incident_current, previous=home_incident_previous, better_when="down"),
        _trend_metric(code="home_follow_up_gaps", label="Missing incident follow-up", current=home_follow_up_gap_current, previous=home_follow_up_gap_previous, better_when="down"),
        _trend_metric(code="home_overdue_actions", label="Overdue home actions", current=home_overdue_action_current, previous=home_overdue_action_previous, better_when="down"),
        _trend_metric(code="home_staffing_pressure", label="Staffing pressure indicators", current=staffing_shortfalls, previous=home_staffing_previous, better_when="down"),
    ]

    patterns = [
        _pattern_entry(
            code=f"home_repeated_incident_{_normalise_token(incident_type)}",
            title=f"Repeated {incident_type.replace('_', ' ')} incidents across home",
            frequency=count,
            period_days=30,
            severity="high" if count >= 5 else "medium",
            evidence=f"{count} incidents of this type in the home over 30 days.",
            suggested_action="Review triggers in team meeting and assign targeted actions.",
        )
        for incident_type, count in repeated_home_patterns[:5]
    ]

    decision_support = [
        _decision_support_entry(
            code="home_pattern_question",
            question="What is repeating across this home?",
            evidence=patterns[0]["evidence"] if patterns else f"{home_incident_current} incidents in the last 14 days.",
            interpretation="Repeated themes indicate a home-wide pattern requiring structured management response." if patterns else "No recurrence threshold has been crossed yet.",
            suggested_action=patterns[0]["suggested_action"] if patterns else "Continue monitoring and capture thematic analysis in management notes.",
            severity=patterns[0]["severity"] if patterns else "low",
        ),
        _decision_support_entry(
            code="home_follow_through_question",
            question="Where is follow-through slipping?",
            evidence=f"{len(overdue_home_actions)} overdue actions, {len(unowned_actions)} unowned actions, {len(stuck_in_progress)} actions stuck in progress.",
            interpretation="Action governance is under pressure and needs ownership and closure discipline." if (overdue_home_actions or unowned_actions or stuck_in_progress) else "Action follow-through is currently stable.",
            suggested_action="Run focused action review: assign owners, set due dates, and close stale actions with outcomes." if (overdue_home_actions or unowned_actions or stuck_in_progress) else "Maintain weekly follow-through checks.",
            severity="high" if (overdue_home_actions or unowned_actions or stuck_in_progress) else "low",
        ),
        _decision_support_entry(
            code="home_inspection_question",
            question="What is likely to matter in inspection?",
            evidence=f"{len(open_inspection_risks)} high-risk inspection actions, {len(overdue_compliance)} overdue compliance items, {len(quality_theme_risks)} priority quality themes.",
            interpretation="Inspection confidence may weaken if prep actions and compliance drift stay unresolved." if (open_inspection_risks or overdue_compliance or quality_theme_risks) else "No immediate inspection-readiness pressure is indicated.",
            suggested_action="Prioritise closure evidence for overdue prep and compliance items before next quality review." if (open_inspection_risks or overdue_compliance or quality_theme_risks) else "Continue planned readiness checks.",
            severity="high" if (open_inspection_risks or overdue_compliance) else "medium",
        ),
    ]

    changing = _top_changing_trends(trends, limit=3)

    what_is_missing = []
    if unowned_actions:
        what_is_missing.append("Some home actions do not have a named owner.")
    if missing_follow_up_after_incidents:
        what_is_missing.append("Recent incidents are missing linked follow-up actions.")
    if not repeated_home_patterns:
        what_is_missing.append("No repeated incident type has crossed the configured threshold yet.")

    return {
        "scope": "home",
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "home_id": home_id,
            "young_person_id": None,
        },
        "pressures": pressures,
        "counts": {
            "tasks_total": len(tasks),
            "overdue_actions": len(overdue_home_actions),
            "unowned_actions": len(unowned_actions),
            "stuck_actions": len(stuck_in_progress),
            "staffing_shortfalls": staffing_shortfalls,
            "safeguarding_incidents": len(safeguarding_incidents),
            "repeated_incident_patterns": len(repeated_home_patterns),
            "overdue_compliance": len(overdue_compliance),
            "inspection_risks": len(open_inspection_risks),
        },
        "signals": [signal for signal in signals if signal["count"] > 0],
        "highlights": sorted_queue[:8],
        "queues": queue_split,
        "trends": trends,
        "patterns": patterns[:7],
        "decision_support": decision_support[:6],
        "what_is_changing": changing,
        "what_needs_attention": queue_split.get("urgent", [])[:6],
        "what_is_missing": what_is_missing,
        "insight_story": _scope_story("Home picture", changing, patterns),
    }


def _home_name_lookup(quality_ctx: dict[str, Any]) -> dict[int, str]:
    homes = _safe_items(quality_ctx.get("homes"))
    lookup: dict[int, str] = {}
    for home in homes:
        home_id = _safe_int(home.get("id"))
        if home_id is not None:
            lookup[home_id] = _safe_text(home.get("home_name") or home.get("name"), f"Home {home_id}")
    return lookup


def _build_quality_snapshot(quality_ctx: dict[str, Any], *, scope_label: str) -> dict[str, Any]:
    scope_meta = quality_ctx.get("scope") if isinstance(quality_ctx.get("scope"), dict) else {}
    selected_home_id = _safe_int(scope_meta.get("home_id"))
    allowed_home_ids = [_safe_int(value) for value in (scope_meta.get("allowed_home_ids") or [])]
    allowed_home_ids = [value for value in allowed_home_ids if value is not None]

    home_name_by_id = _home_name_lookup(quality_ctx)

    incidents = _safe_items(quality_ctx.get("incidents"))
    compliance_items = _safe_items(quality_ctx.get("compliance_items"))
    inspection_actions = _safe_items(quality_ctx.get("inspection_actions"))
    inspection_reasons = _safe_items(quality_ctx.get("inspection_reasons"))
    inspection_lines = _safe_items(quality_ctx.get("inspection_lines"))
    documents = _safe_items(quality_ctx.get("documents"))
    inspection_cards = _safe_items(quality_ctx.get("inspection_cards"))

    overdue_audit_actions = [
        item for item in inspection_actions
        if _is_open_status(item.get("status")) and _is_overdue(item.get("status"), item.get("due_date"))
    ]

    overdue_compliance = [
        item for item in compliance_items
        if _is_open_status(item.get("status")) and _is_overdue(item.get("status"), item.get("due_date"))
    ]

    weak_records = [
        item for item in documents
        if _normalise_token(item.get("status")) in {"overdue", "review_due", "missing", "expired", "due_soon"}
    ]

    recurring_issue_counter: Counter[str] = Counter()
    for issue in inspection_reasons:
        recurring_issue_counter[_safe_text(issue.get("title"), "Quality issue")] += 1

    recurring_issues = [(title, count) for title, count in recurring_issue_counter.items() if count >= 2]

    incident_window = datetime.now(timezone.utc) - timedelta(days=30)
    incidents_by_home: defaultdict[int, int] = defaultdict(int)

    for incident in incidents:
        incident_home = _safe_int(incident.get("home_id"))
        if incident_home is None:
            continue
        incident_dt = _parse_datetime(
            incident.get("incident_datetime")
            or incident.get("event_datetime")
            or incident.get("created_at")
            or incident.get("updated_at")
        )
        if incident_dt and incident_dt >= incident_window:
            incidents_by_home[incident_home] += 1

    homes_needing_escalation = [(home, count) for home, count in incidents_by_home.items() if count >= 4]

    queue: list[dict[str, Any]] = []

    for item in overdue_audit_actions[:10]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("action_title") or item.get("title"), "Overdue quality action"),
                summary="Audit or inspection action is overdue and requires management follow-through.",
                kind="overdue_quality_action",
                severity="high",
                status=_safe_text(item.get("status")),
                priority=_safe_text(item.get("priority")),
                due_date=item.get("due_date"),
                home_id=item.get("home_id"),
                record_type="inspection_action",
                record_id=item.get("id"),
            )
        )

    for item in overdue_compliance[:8]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("title"), "Overdue compliance"),
                summary="Compliance task is overdue and may indicate drift.",
                kind="overdue_compliance",
                severity="high",
                status=_safe_text(item.get("status")),
                priority=_safe_text(item.get("priority") or item.get("severity")),
                due_date=item.get("due_date"),
                home_id=item.get("home_id"),
                record_type="compliance_item",
                record_id=item.get("id"),
            )
        )

    for issue_title, count in recurring_issues[:6]:
        queue.append(
            _build_queue_item(
                title=issue_title,
                summary=f"{count} recurring quality indicators suggest escalation to RI/provider oversight.",
                kind="recurring_quality_issue",
                severity="medium" if count < 4 else "high",
                status="open",
                record_type="quality_theme",
            )
        )

    for home, count in homes_needing_escalation[:6]:
        queue.append(
            _build_queue_item(
                title=f"Incident pressure in {home_name_by_id.get(home, f'Home {home}')}",
                summary=f"{count} incidents in the last 30 days suggest escalating oversight.",
                kind="home_pressure",
                severity="high",
                status="open",
                home_id=home,
                record_type="home_incident_pattern",
            )
        )

    for item in weak_records[:6]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("title") or item.get("document_type"), "Recording quality concern"),
                summary="Record review status is weak or overdue.",
                kind="recording_quality_concern",
                severity="medium",
                status=_safe_text(item.get("status")),
                due_date=item.get("review_date") or item.get("expiry_date"),
                home_id=item.get("home_id"),
                record_type="document",
                record_id=item.get("id"),
            )
        )

    pressures = {
        "action_pressure": len(overdue_audit_actions),
        "safeguarding_pressure": 0,
        "incident_pattern_pressure": len(homes_needing_escalation),
        "quality_pressure": len(overdue_compliance) + len(recurring_issues) + len(weak_records),
        "inspection_pressure": len([line for line in inspection_lines if _is_open_status(line.get("status"))]),
        "staffing_pressure": 0,
    }
    pressures["total"] = sum(value for value in pressures.values())

    queue_split = _split_queue(queue)
    sorted_queue = _sort_queue(queue)

    trends = [
        _trend_metric(code="quality_recurring_themes", label="Recurring quality themes (30-day)", current=len(recurring_issues), previous=max(len(recurring_issues) - 1, 0), better_when="down"),
        _trend_metric(code="quality_overdue_compliance", label="Overdue compliance items", current=len(overdue_compliance), previous=max(len(overdue_compliance) - 1, 0), better_when="down"),
        _trend_metric(code="quality_home_pressure", label="Homes with incident pressure", current=len(homes_needing_escalation), previous=0, better_when="down"),
        _trend_metric(code="quality_record_concerns", label="Record quality concerns", current=len(weak_records), previous=max(len(weak_records) - 1, 0), better_when="down"),
    ]

    patterns = [
        _pattern_entry(
            code=f"quality_recurring_issue_{_normalise_token(title)}",
            title=f"Recurring issue: {title}",
            frequency=count,
            period_days=30,
            severity="high" if count >= 4 else "medium",
            evidence=f"{count} matching quality issues were recorded in 30 days.",
            suggested_action="Set provider-level action owner and monitor closure evidence.",
        )
        for title, count in recurring_issues[:6]
    ]

    changing = _top_changing_trends(trends, limit=3)

    return {
        "scope": scope_label,
        "meta": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "home_id": selected_home_id,
            "young_person_id": None,
            "allowed_home_ids": allowed_home_ids,
        },
        "pressures": pressures,
        "counts": {
            "homes_in_scope": len(allowed_home_ids) if allowed_home_ids else len(home_name_by_id),
            "overdue_audit_actions": len(overdue_audit_actions),
            "recurring_quality_issues": len(recurring_issues),
            "record_quality_concerns": len(weak_records),
            "overdue_compliance": len(overdue_compliance),
            "homes_with_incident_pressure": len(homes_needing_escalation),
            "inspection_cards": len(inspection_cards),
        },
        "signals": [
            _build_signal(code="overdue_audit_actions", title="Overdue audit actions", count=len(overdue_audit_actions), description="Audit and inspection actions requiring immediate closure.", severity="high"),
            _build_signal(code="recurring_quality_issues", title="Recurring quality issues", count=len(recurring_issues), description="Repeated themes requiring RI/provider escalation.", severity="medium"),
            _build_signal(code="record_quality_concerns", title="Record quality concerns", count=len(weak_records), description="Documents showing overdue or weak review status.", severity="medium"),
            _build_signal(code="compliance_drift", title="Compliance drift", count=len(overdue_compliance), description="Compliance-generated tasks that are overdue.", severity="high"),
            _build_signal(code="home_pressure", title="Home pressure patterns", count=len(homes_needing_escalation), description="Homes where incident volume suggests escalation.", severity="high"),
        ],
        "highlights": sorted_queue[:10],
        "queues": queue_split,
        "trends": trends,
        "patterns": patterns[:8],
        "decision_support": [],
        "quality_drift_indicators": [
            _drift_indicator_entry(code="quality_follow_through_completion_rate", label="Action follow-through completion", value=_completion_rate(inspection_actions), healthy_threshold=80.0, warning_threshold=60.0),
            _drift_indicator_entry(code="quality_compliance_completion_rate", label="Compliance closure rate", value=_completion_rate(compliance_items), healthy_threshold=85.0, warning_threshold=65.0),
            _drift_indicator_entry(code="quality_document_review_health", label="Document review health", value=(0.0 if not documents else round(((len(documents) - len(weak_records)) / len(documents)) * 100, 1)), healthy_threshold=85.0, warning_threshold=70.0),
        ],
        "quality_insight_blocks": [],
        "what_is_changing": changing,
        "what_needs_attention": queue_split.get("urgent", [])[:6],
        "what_is_missing": [],
        "insight_story": _scope_story("Quality picture", changing, patterns),
    }


def _build_ofsted_snapshot(quality_ctx: dict[str, Any]) -> dict[str, Any]:
    base = _build_quality_snapshot(quality_ctx, scope_label="ofsted")

    return {
        **base,
        "scope": "ofsted",
        "insight_story": base.get("insight_story") or "Ofsted readiness: no major trend shifts were detected in this snapshot.",
    }


def _require_user_id(current_user: dict[str, Any]) -> int:
    user_id = _safe_int(current_user.get("user_id"))
    if user_id is None:
        raise HTTPException(status_code=401, detail="User could not be identified.")
    return user_id


@router.get("/young-people/{young_person_id}")
def get_child_visibility(
    young_person_id: int,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = _require_user_id(current_user)

    try:
        context = build_young_person_context(
            conn,
            user_id=user_id,
            young_person_id=young_person_id,
            scope={
                "scope_type": "young_person",
                "scope": "child",
                "young_person_id": young_person_id,
            },
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        return _build_child_snapshot(context)
    except Exception as e:
        print("VISIBILITY CHILD ERROR:", str(e))
        return {
            "scope": "child",
            "error": "visibility_failed",
            "detail": str(e),
            "safe": True,
        }


@router.get("/homes/{home_id}")
def get_home_visibility(
    home_id: int,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    user_id = _require_user_id(current_user)
    role_provider = _is_provider_role(current_user)
    access_level = "provider" if role_provider else "home"

    try:
        home_ctx = build_home_os_context(
            conn,
            user_id=user_id,
            scope={
                "scope_type": "home",
                "scope": "home",
                "home_id": home_id,
            },
        )
        quality_ctx = build_quality_os_context(
            conn,
            user_id=user_id,
            scope={
                "scope_type": "quality",
                "scope": "quality",
                "home_id": home_id,
                "access_level": access_level,
                "allowed_home_ids": [home_id],
            },
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _build_home_snapshot(home_ctx, quality_ctx)


def _build_quality_context_for_visibility(
    *,
    conn,
    current_user: dict[str, Any],
    home_id: int | None,
    all_accessible_homes: bool,
) -> dict[str, Any]:
    user_id = _require_user_id(current_user)
    provider_role = _is_provider_role(current_user)
    access_level = "provider" if provider_role else "home"

    requested_home_id = home_id if home_id is not None else _safe_int(current_user.get("home_id"))
    allowed_home_ids: list[int] = []

    if provider_role and home_id is None and all_accessible_homes:
        allowed_home_ids = _resolve_provider_home_ids(conn, current_user)
    elif requested_home_id is not None:
        allowed_home_ids = [requested_home_id]

    return build_quality_os_context(
        conn,
        user_id=user_id,
        scope={
            "scope_type": "quality",
            "scope": "quality",
            "home_id": requested_home_id,
            "access_level": access_level,
            "allowed_home_ids": allowed_home_ids,
        },
    )


@router.get("/quality")
def get_quality_visibility(
    home_id: int | None = Query(default=None),
    all_accessible_homes: bool = Query(default=True),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        quality_ctx = _build_quality_context_for_visibility(
            conn=conn,
            current_user=current_user,
            home_id=home_id,
            all_accessible_homes=all_accessible_homes,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _build_quality_snapshot(quality_ctx, scope_label="quality")


@router.get("/ofsted")
def get_ofsted_visibility(
    home_id: int | None = Query(default=None),
    all_accessible_homes: bool = Query(default=True),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        quality_ctx = _build_quality_context_for_visibility(
            conn=conn,
            current_user=current_user,
            home_id=home_id,
            all_accessible_homes=all_accessible_homes,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _build_ofsted_snapshot(quality_ctx)
