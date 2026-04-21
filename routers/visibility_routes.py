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
        return value
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


def _derive_severity(*, status: Any, priority: Any, overdue: bool = False, default: str = "medium") -> str:
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
        "record_id": _safe_int(record_id) if _safe_int(record_id) is not None else record_id,
    }


def _build_signal(*, code: str, title: str, count: int, description: str, severity: str) -> dict[str, Any]:
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

    incidents = _safe_items(recent_records.get("incidents")) + _safe_items(recent_records.get("missing_episodes"))
    safeguarding_records = _safe_items(recent_records.get("safeguarding_records"))
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
        and (_parse_datetime(task.get("updated_at") or task.get("created_at")) or datetime.now(timezone.utc))
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
        if "safeguard" in _normalise_token(row.get("alert_type") or row.get("title") or row.get("description"))
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
                title=_safe_text(row.get("title") or row.get("concern_type"), "Safeguarding follow-up required"),
                summary=_safe_text(row.get("summary") or row.get("description"), "Open safeguarding concern needs review."),
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
        "highlights": _sort_queue(queue)[:6],
        "queues": _split_queue(queue),
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
        and (_parse_datetime(task.get("updated_at") or task.get("created_at")) or datetime.now(timezone.utc))
        <= stale_cutoff
    ]

    safeguarding_incidents = [
        item
        for item in incidents
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
        if not incident_dt or incident_dt < incident_window:
            continue
        incident_counter[_safe_text(incident.get("incident_type"), "incident")] += 1
    repeated_home_patterns = [(incident_type, count) for incident_type, count in incident_counter.items() if count >= 3]

    overdue_compliance = [
        item
        for item in compliance_items
        if _is_open_status(item.get("status"))
        and _is_overdue(item.get("status"), item.get("due_date"))
    ]
    open_inspection_risks = [
        item
        for item in inspection_actions
        if _is_open_status(item.get("status"))
        and (
            _is_overdue(item.get("status"), item.get("due_date"))
            or _priority_rank(item.get("priority")) >= PRIORITY_RANK["high"]
        )
    ]
    quality_theme_risks = [
        item
        for item in inspection_reasons
        if _safe_int(item.get("priority")) is not None and int(item.get("priority") or 99) <= 2
    ]

    absent_staff = [item for item in team if _normalise_token(item.get("status")) in ABSENT_STAFF_STATUSES]
    staffing_shortfalls = len(vacancies) + len(absent_staff)

    recent_incidents = [
        incident
        for incident in incidents
        if (_parse_datetime(incident.get("incident_datetime") or incident.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc))
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

    for item in quality_theme_risks[:4]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("title"), "Quality theme requiring escalation"),
                summary=_safe_text(item.get("description"), "Quality concern with inspection impact."),
                kind="quality_theme",
                severity="medium",
                status=_safe_text(item.get("status"), "open"),
                home_id=home_id,
                record_type="inspection_reason",
                record_id=item.get("id"),
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
        _build_signal(
            code="overdue_home_actions",
            title="Overdue home actions",
            count=len(overdue_home_actions),
            description="Operational follow-through actions overdue at home level.",
            severity="high",
        ),
        _build_signal(
            code="staffing_shortfalls",
            title="Staffing shortfalls",
            count=staffing_shortfalls,
            description="Vacancy or absence pressure requiring management response.",
            severity="high",
        ),
        _build_signal(
            code="safeguarding_themes",
            title="Safeguarding themes",
            count=len(safeguarding_incidents),
            description="Safeguarding-linked incidents requiring oversight.",
            severity="critical",
        ),
        _build_signal(
            code="incident_spikes",
            title="Incident spikes",
            count=len(repeated_home_patterns),
            description="Repeated incident patterns emerging across the home.",
            severity="high",
        ),
        _build_signal(
            code="overdue_compliance",
            title="Compliance drift",
            count=len(overdue_compliance),
            description="Compliance items are overdue and need closure.",
            severity="high",
        ),
        _build_signal(
            code="inspection_risk",
            title="Inspection risk",
            count=len(open_inspection_risks),
            description="Inspection actions that are high priority or overdue.",
            severity="high",
        ),
        _build_signal(
            code="actions_without_owner",
            title="Actions without owner",
            count=len(unowned_actions),
            description="Open actions missing clear ownership.",
            severity="medium",
        ),
        _build_signal(
            code="stuck_actions",
            title="Actions stuck in progress",
            count=len(stuck_in_progress),
            description="Actions that have not moved for over a week.",
            severity="medium",
        ),
    ]

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
        "highlights": _sort_queue(queue)[:8],
        "queues": _split_queue(queue),
    }


def _home_name_lookup(quality_ctx: dict[str, Any]) -> dict[int, str]:
    homes = _safe_items(quality_ctx.get("homes"))
    lookup: dict[int, str] = {}
    for home in homes:
        home_id = _safe_int(home.get("id"))
        if home_id is None:
            continue
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
        item
        for item in inspection_actions
        if _is_open_status(item.get("status"))
        and _is_overdue(item.get("status"), item.get("due_date"))
    ]
    overdue_compliance = [
        item
        for item in compliance_items
        if _is_open_status(item.get("status"))
        and _is_overdue(item.get("status"), item.get("due_date"))
    ]
    weak_records = [
        item
        for item in documents
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
        if not incident_dt or incident_dt < incident_window:
            continue
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

    signals = [
        _build_signal(
            code="overdue_audit_actions",
            title="Overdue audit actions",
            count=len(overdue_audit_actions),
            description="Audit and inspection actions requiring immediate closure.",
            severity="high",
        ),
        _build_signal(
            code="recurring_quality_issues",
            title="Recurring quality issues",
            count=len(recurring_issues),
            description="Repeated themes requiring RI/provider escalation.",
            severity="medium",
        ),
        _build_signal(
            code="record_quality_concerns",
            title="Record quality concerns",
            count=len(weak_records),
            description="Documents showing overdue or weak review status.",
            severity="medium",
        ),
        _build_signal(
            code="compliance_drift",
            title="Compliance drift",
            count=len(overdue_compliance),
            description="Compliance-generated tasks that are overdue.",
            severity="high",
        ),
        _build_signal(
            code="home_pressure",
            title="Home pressure patterns",
            count=len(homes_needing_escalation),
            description="Homes where incident volume suggests escalation.",
            severity="high",
        ),
    ]

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
        "signals": [signal for signal in signals if signal["count"] > 0],
        "highlights": _sort_queue(queue)[:10],
        "queues": _split_queue(queue),
    }


def _build_ofsted_snapshot(quality_ctx: dict[str, Any]) -> dict[str, Any]:
    base = _build_quality_snapshot(quality_ctx, scope_label="ofsted")
    inspection_actions = _safe_items(quality_ctx.get("inspection_actions"))
    inspection_reasons = _safe_items(quality_ctx.get("inspection_reasons"))
    inspection_lines = _safe_items(quality_ctx.get("inspection_lines"))
    inspection_cards = _safe_items(quality_ctx.get("inspection_cards"))
    documents = _safe_items(quality_ctx.get("documents"))

    evidence_gaps = [
        item
        for item in inspection_reasons
        if (_safe_int(item.get("priority")) or 99) <= 2
        or _normalise_token(item.get("reason_type")) in {"concern", "gap"}
    ]
    overdue_prep_actions = [
        item
        for item in inspection_actions
        if _is_open_status(item.get("status"))
        and (
            _is_overdue(item.get("status"), item.get("due_date"))
            or _priority_rank(item.get("priority")) >= PRIORITY_RANK["high"]
        )
    ]
    weak_or_missing_records = [
        item
        for item in documents
        if _normalise_token(item.get("status")) in {"overdue", "review_due", "missing", "expired", "due_soon"}
    ]
    likely_inspector_concerns = [
        item
        for item in inspection_lines
        if _is_open_status(item.get("status"))
        and (
            _priority_rank(item.get("priority")) >= PRIORITY_RANK["high"]
            or _is_overdue(item.get("status"), item.get("due_date"))
        )
    ]
    weak_judgement_areas = [
        item
        for item in inspection_cards
        if _normalise_token(item.get("overall_band")) in {"requires_improvement", "inadequate"}
        or float(item.get("overall_score") or 0) < 70
        or float(item.get("confidence_score") or 0) < 70
    ]

    queue = base["highlights"][:]
    for item in evidence_gaps[:6]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("title"), "Inspection evidence gap"),
                summary=_safe_text(item.get("description"), "Evidence gap may attract inspector concern."),
                kind="evidence_gap",
                severity="high",
                status=_safe_text(item.get("status"), "open"),
                home_id=item.get("home_id"),
                record_type="inspection_reason",
                record_id=item.get("id"),
            )
        )
    for item in likely_inspector_concerns[:6]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("line_of_enquiry"), "Likely inspector line of enquiry"),
                summary=_safe_text(item.get("rationale"), "Likely inspector challenge area."),
                kind="inspector_concern",
                severity="high",
                status=_safe_text(item.get("status"), "open"),
                priority=_safe_text(item.get("priority")),
                due_date=item.get("due_date"),
                home_id=item.get("home_id"),
                record_type="inspection_line_of_enquiry",
                record_id=item.get("id"),
            )
        )
    for item in weak_judgement_areas[:4]:
        queue.append(
            _build_queue_item(
                title=_safe_text(item.get("home_name"), "Home with weak judgement signal"),
                summary="Overall band or confidence score suggests inspection risk.",
                kind="weak_judgement_signal",
                severity="high",
                status=_safe_text(item.get("overall_band"), "warning"),
                home_id=item.get("home_id"),
                record_type="inspection_scorecard",
                record_id=item.get("id"),
            )
        )

    pressures = dict(base.get("pressures") or {})
    pressures["inspection_pressure"] = (
        len(evidence_gaps)
        + len(overdue_prep_actions)
        + len(likely_inspector_concerns)
        + len(weak_judgement_areas)
    )
    pressures["quality_pressure"] = len(weak_or_missing_records)
    pressures["total"] = sum(
        value for key, value in pressures.items() if key != "total" and isinstance(value, int)
    )

    signals = [
        _build_signal(
            code="evidence_gaps",
            title="Evidence gaps",
            count=len(evidence_gaps),
            description="Inspection evidence gaps needing urgent closure.",
            severity="high",
        ),
        _build_signal(
            code="overdue_prep_actions",
            title="Overdue preparation actions",
            count=len(overdue_prep_actions),
            description="Preparation actions that are overdue or high priority.",
            severity="high",
        ),
        _build_signal(
            code="weak_records",
            title="Weak or missing records",
            count=len(weak_or_missing_records),
            description="Records likely to weaken inspection confidence.",
            severity="medium",
        ),
        _build_signal(
            code="likely_inspector_concerns",
            title="Likely inspector concerns",
            count=len(likely_inspector_concerns),
            description="Open lines of enquiry likely to attract inspector challenge.",
            severity="high",
        ),
        _build_signal(
            code="weak_judgement_signals",
            title="Weak judgement signals",
            count=len(weak_judgement_areas),
            description="Home-level scorecard signals below target confidence.",
            severity="high",
        ),
    ]

    return {
        "scope": "ofsted",
        "meta": base.get("meta"),
        "pressures": pressures,
        "counts": {
            **(base.get("counts") or {}),
            "evidence_gaps": len(evidence_gaps),
            "overdue_prep_actions": len(overdue_prep_actions),
            "weak_or_missing_records": len(weak_or_missing_records),
            "likely_inspector_concerns": len(likely_inspector_concerns),
            "weak_judgement_areas": len(weak_judgement_areas),
        },
        "signals": [signal for signal in signals if signal["count"] > 0],
        "highlights": _sort_queue(queue)[:10],
        "queues": _split_queue(queue),
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

    return _build_child_snapshot(context)


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
