from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta
from typing import Any, Iterable


@dataclass
class OperationalAction:
    action_id: str
    scope: str
    priority: str
    status: str
    category: str
    title: str
    description: str
    recommended_action: str
    source_record_type: str | None = None
    source_record_id: int | None = None
    young_person_id: int | None = None
    home_id: int | None = None
    due_date: str | None = None
    event_date: str | None = None
    assigned_role: str | None = None
    escalation_level: str | None = None
    tags: list[str] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["tags"] = self.tags or []
        return payload


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _normalise_token(value: Any) -> str:
    return _safe_str(value).lower().replace(" ", "_").replace("-", "_")


def _now() -> datetime:
    return datetime.utcnow()


def _parse_datetime(value: Any) -> datetime | None:
    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())

    text = _safe_str(value)
    if not text:
        return None

    text = text.replace("Z", "+00:00")

    for candidate in (
        text,
        text.replace(" ", "T"),
    ):
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue

    return None


def _to_iso_date(value: Any) -> str | None:
    dt = _parse_datetime(value)
    if not dt:
        return None
    return dt.date().isoformat()


def _days_until(value: Any) -> int | None:
    dt = _parse_datetime(value)
    if not dt:
        return None
    return (dt.date() - _now().date()).days


def _is_overdue(value: Any) -> bool:
    days = _days_until(value)
    return days is not None and days < 0


def _is_due_soon(value: Any, within_days: int = 7) -> bool:
    days = _days_until(value)
    return days is not None and 0 <= days <= within_days


def _build_action_id(
    category: str,
    source_record_type: str | None,
    source_record_id: Any,
    suffix: str = "",
) -> str:
    parts = [
        _normalise_token(category) or "action",
        _normalise_token(source_record_type) or "record",
        str(source_record_id or "unknown"),
        _normalise_token(suffix) if suffix else "",
    ]
    return "-".join([p for p in parts if p])


def _record_title(item: dict[str, Any], fallback: str = "Record") -> str:
    return (
        _safe_str(item.get("title"))
        or _safe_str(item.get("name"))
        or _safe_str(item.get("incident_type"))
        or _safe_str(item.get("appointment_type"))
        or _safe_str(item.get("document_type"))
        or fallback
    )


def _record_summary(item: dict[str, Any]) -> str:
    return (
        _safe_str(item.get("summary"))
        or _safe_str(item.get("description"))
        or _safe_str(item.get("outcome"))
        or _safe_str(item.get("note"))
        or _safe_str(item.get("details"))
    )


def _record_home_id(item: dict[str, Any], fallback_home_id: int | None = None) -> int | None:
    return _safe_int(item.get("home_id")) or fallback_home_id


def _record_child_id(item: dict[str, Any], fallback_child_id: int | None = None) -> int | None:
    return _safe_int(item.get("young_person_id")) or fallback_child_id


def _priority_rank(priority: str) -> int:
    value = _normalise_token(priority)
    if value == "critical":
        return 0
    if value == "high":
        return 1
    if value == "medium":
        return 2
    return 3


def _unique_actions(actions: Iterable[OperationalAction]) -> list[OperationalAction]:
    seen: set[str] = set()
    result: list[OperationalAction] = []

    for action in actions:
        if action.action_id in seen:
            continue
        seen.add(action.action_id)
        result.append(action)

    return sorted(
        result,
        key=lambda item: (
            _priority_rank(item.priority),
            item.due_date or "9999-12-31",
            item.title.lower(),
        ),
    )


def _build_existing_task_index(tasks: list[dict[str, Any]]) -> set[str]:
    keys: set[str] = set()

    for task in tasks:
        source_record_type = _normalise_token(
            task.get("source_record_type") or task.get("record_type")
        )
        source_record_id = _safe_int(
            task.get("source_record_id") or task.get("record_id") or task.get("source_id")
        )
        category = _normalise_token(task.get("task_category") or task.get("category"))
        status = _normalise_token(task.get("status"))

        if status in {"completed", "cancelled", "archived"}:
            continue

        if source_record_type and source_record_id:
            keys.add(f"{source_record_type}:{source_record_id}:{category or 'task'}")

    return keys


def _task_exists(
    existing_index: set[str],
    source_record_type: str,
    source_record_id: Any,
    category: str,
) -> bool:
    key = f"{_normalise_token(source_record_type)}:{_safe_int(source_record_id)}:{_normalise_token(category)}"
    return key in existing_index


def _build_task_actions(
    tasks: list[dict[str, Any]],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for task in tasks:
        status = _normalise_token(task.get("status"))
        if status in {"completed", "cancelled", "archived"}:
            continue

        title = _record_title(task, "Task")
        due_date = task.get("due_date")
        priority = _normalise_token(task.get("priority")) or "medium"

        if _is_overdue(due_date):
            priority = "high" if priority not in {"critical", "high"} else priority

        actions.append(
            OperationalAction(
                action_id=_build_action_id("task", "task", task.get("id")),
                scope=scope,
                priority=priority,
                status=status or "open",
                category="task",
                title=title,
                description=_record_summary(task) or "Open task requiring follow-up.",
                recommended_action="Review the task, confirm ownership, and complete or escalate as needed.",
                source_record_type="task",
                source_record_id=_safe_int(task.get("id")),
                young_person_id=_record_child_id(task),
                home_id=_record_home_id(task, default_home_id),
                due_date=_to_iso_date(due_date),
                event_date=_to_iso_date(task.get("created_at")),
                assigned_role=_safe_str(task.get("assigned_role")) or "staff",
                escalation_level="manager" if _is_overdue(due_date) else None,
                tags=["tasks", "readiness"],
            )
        )

    return actions


def _build_incident_actions(
    incidents: list[dict[str, Any]],
    existing_task_index: set[str],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for incident in incidents:
        incident_id = _safe_int(incident.get("id"))
        severity = _normalise_token(incident.get("severity"))
        workflow_status = _normalise_token(
            incident.get("workflow_status") or incident.get("status")
        )
        event_date = incident.get("incident_datetime") or incident.get("created_at")

        if severity in {"critical", "high"}:
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("incident_review", "incident", incident_id),
                    scope=scope,
                    priority="high" if severity == "high" else "critical",
                    status="open",
                    category="safeguarding_review",
                    title=f"Review incident: {_record_title(incident, 'Incident')}",
                    description=_record_summary(incident) or "A significant incident has been recorded.",
                    recommended_action="Review the incident promptly, confirm the child’s current safety, and ensure reflective follow-up is recorded.",
                    source_record_type="incident",
                    source_record_id=incident_id,
                    young_person_id=_record_child_id(incident),
                    home_id=_record_home_id(incident, default_home_id),
                    due_date=_to_iso_date(_now() + timedelta(days=1)),
                    event_date=_to_iso_date(event_date),
                    assigned_role="manager",
                    escalation_level="manager",
                    tags=["incident", "safeguarding"],
                )
            )

        if workflow_status not in {"approved", "completed", "closed"} and not _task_exists(
            existing_task_index, "incident", incident_id, "incident_follow_up"
        ):
            actions.append(
                OperationalAction(
                    action_id=_build_action_id(
                        "incident_follow_up",
                        "incident",
                        incident_id,
                    ),
                    scope=scope,
                    priority="medium" if severity not in {"critical", "high"} else "high",
                    status="open",
                    category="follow_up",
                    title=f"Follow up incident: {_record_title(incident, 'Incident')}",
                    description="A recorded incident appears to need follow-up, review, or completion.",
                    recommended_action="Check whether follow-up actions, child voice, notifications, and outcome recording have been completed.",
                    source_record_type="incident",
                    source_record_id=incident_id,
                    young_person_id=_record_child_id(incident),
                    home_id=_record_home_id(incident, default_home_id),
                    due_date=_to_iso_date(_now() + timedelta(days=1)),
                    event_date=_to_iso_date(event_date),
                    assigned_role="staff",
                    escalation_level="manager" if severity in {"critical", "high"} else None,
                    tags=["incident", "workflow"],
                )
            )

    return actions


def _build_missing_episode_actions(
    missing_episodes: list[dict[str, Any]],
    existing_task_index: set[str],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for item in missing_episodes:
        record_id = _safe_int(item.get("id"))
        return_datetime = item.get("return_datetime")
        status = _normalise_token(item.get("status"))

        if not return_datetime or status not in {"closed", "completed"}:
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("missing_episode_review", "missing_episode", record_id),
                    scope=scope,
                    priority="critical",
                    status="open",
                    category="missing_episode",
                    title="Missing episode requires immediate review",
                    description=_record_summary(item) or "A missing episode record requires active follow-up.",
                    recommended_action="Confirm whereabouts or return status, review immediate safety, and ensure all safeguarding actions are completed.",
                    source_record_type="missing_episode",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(item),
                    home_id=_record_home_id(item, default_home_id),
                    due_date=_to_iso_date(_now()),
                    event_date=_to_iso_date(item.get("start_datetime") or item.get("created_at")),
                    assigned_role="manager",
                    escalation_level="urgent",
                    tags=["missing", "safeguarding", "urgent"],
                )
            )
            continue

        if not _task_exists(existing_task_index, "missing_episode", record_id, "return_interview"):
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("return_interview", "missing_episode", record_id),
                    scope=scope,
                    priority="high",
                    status="open",
                    category="return_interview",
                    title="Arrange missing-from-care return reflection",
                    description="A missing episode has ended and follow-up reflection may still be needed.",
                    recommended_action="Ensure return interview, child voice, trigger analysis, and preventative planning are recorded.",
                    source_record_type="missing_episode",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(item),
                    home_id=_record_home_id(item, default_home_id),
                    due_date=_to_iso_date(_parse_datetime(return_datetime) or (_now() + timedelta(days=1))),
                    event_date=_to_iso_date(return_datetime),
                    assigned_role="keyworker",
                    escalation_level="manager",
                    tags=["missing", "return_home_interview"],
                )
            )

    return actions


def _build_safeguarding_actions(
    safeguarding_records: list[dict[str, Any]],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for record in safeguarding_records:
        record_id = _safe_int(record.get("id"))
        status = _normalise_token(record.get("status"))
        due_date = record.get("review_date") or record.get("due_date") or record.get("created_at")

        if status not in {"closed", "completed"}:
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("safeguarding_open", "safeguarding_record", record_id),
                    scope=scope,
                    priority="critical" if _is_overdue(due_date) else "high",
                    status="open",
                    category="safeguarding",
                    title=f"Open safeguarding concern: {_record_title(record, 'Safeguarding concern')}",
                    description=_record_summary(record) or "A safeguarding concern remains open.",
                    recommended_action="Review the concern, check safety planning, update actions, and confirm whether escalation or referral is required.",
                    source_record_type="safeguarding_record",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(record),
                    home_id=_record_home_id(record, default_home_id),
                    due_date=_to_iso_date(due_date),
                    event_date=_to_iso_date(
                        record.get("concern_datetime") or record.get("created_at")
                    ),
                    assigned_role="manager",
                    escalation_level="urgent" if _is_overdue(due_date) else "manager",
                    tags=["safeguarding", "open_concern"],
                )
            )

    return actions


def _build_appointment_actions(
    appointments: list[dict[str, Any]],
    existing_task_index: set[str],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for item in appointments:
        record_id = _safe_int(item.get("id"))
        status = _normalise_token(item.get("status"))
        appointment_date = (
            item.get("appointment_date")
            or item.get("start_datetime")
            or item.get("event_datetime")
        )

        if status in {"cancelled", "completed"}:
            continue

        if _is_due_soon(appointment_date, within_days=3):
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("appointment_prepare", "appointment", record_id),
                    scope=scope,
                    priority="medium",
                    status="open",
                    category="appointment",
                    title=f"Prepare for appointment: {_record_title(item, 'Appointment')}",
                    description="An upcoming appointment may require preparation or briefing.",
                    recommended_action="Prepare the young person, gather any needed information, and ensure the appointment is supported and followed up.",
                    source_record_type="appointment",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(item),
                    home_id=_record_home_id(item, default_home_id),
                    due_date=_to_iso_date(appointment_date),
                    event_date=_to_iso_date(appointment_date),
                    assigned_role="staff",
                    escalation_level=None,
                    tags=["appointment", "preparation"],
                )
            )

        if _is_overdue(appointment_date) and not _task_exists(
            existing_task_index, "appointment", record_id, "appointment_follow_up"
        ):
            actions.append(
                OperationalAction(
                    action_id=_build_action_id("appointment_follow_up", "appointment", record_id),
                    scope=scope,
                    priority="medium",
                    status="open",
                    category="follow_up",
                    title=f"Follow up appointment: {_record_title(item, 'Appointment')}",
                    description="A past appointment may need outcome recording or action follow-up.",
                    recommended_action="Confirm the outcome, any recommendations, and any actions for staff or professionals.",
                    source_record_type="appointment",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(item),
                    home_id=_record_home_id(item, default_home_id),
                    due_date=_to_iso_date(_now() + timedelta(days=1)),
                    event_date=_to_iso_date(appointment_date),
                    assigned_role="staff",
                    escalation_level=None,
                    tags=["appointment", "follow_up"],
                )
            )

    return actions


def _build_compliance_actions(
    compliance_items: list[dict[str, Any]],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for item in compliance_items:
        record_id = _safe_int(item.get("id"))
        status = _normalise_token(item.get("status") or item.get("approval_status"))
        due_date = item.get("due_date") or item.get("review_date")

        if status in {"completed", "approved", "closed", "archived"}:
            continue

        priority = "medium"
        escalation = None

        if _is_overdue(due_date):
            priority = "high"
            escalation = "manager"
        elif _is_due_soon(due_date, within_days=7):
            priority = "medium"

        actions.append(
            OperationalAction(
                action_id=_build_action_id("compliance", "compliance_item", record_id),
                scope=scope,
                priority=priority,
                status="open",
                category="compliance",
                title=f"Compliance item: {_record_title(item, 'Compliance item')}",
                description=_record_summary(item) or "A compliance requirement needs attention.",
                recommended_action="Review the requirement, confirm who owns it, and complete or escalate before it becomes non-compliant.",
                source_record_type="compliance_item",
                source_record_id=record_id,
                young_person_id=_record_child_id(item),
                home_id=_record_home_id(item, default_home_id),
                due_date=_to_iso_date(due_date),
                event_date=_to_iso_date(item.get("created_at")),
                assigned_role="manager" if priority == "high" else "staff",
                escalation_level=escalation,
                tags=["compliance", "inspection_readiness"],
            )
        )

    return actions


def _build_document_actions(
    documents: list[dict[str, Any]],
    *,
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    for item in documents:
        record_id = _safe_int(item.get("id"))
        review_date = item.get("review_date") or item.get("expiry_date")
        status = _normalise_token(item.get("status"))

        if status in {"archived", "expired"}:
            continue

        if _is_overdue(review_date) or _is_due_soon(review_date, within_days=14):
            priority = "high" if _is_overdue(review_date) else "medium"

            actions.append(
                OperationalAction(
                    action_id=_build_action_id("document_review", "document", record_id),
                    scope=scope,
                    priority=priority,
                    status="open",
                    category="document_review",
                    title=f"Document review due: {_record_title(item, 'Document')}",
                    description="A document appears to be due or overdue for review.",
                    recommended_action="Review the document, update if needed, and confirm the next review date.",
                    source_record_type="document",
                    source_record_id=record_id,
                    young_person_id=_record_child_id(item),
                    home_id=_record_home_id(item, default_home_id),
                    due_date=_to_iso_date(review_date),
                    event_date=_to_iso_date(item.get("updated_at") or item.get("created_at")),
                    assigned_role="manager" if priority == "high" else "staff",
                    escalation_level="manager" if priority == "high" else None,
                    tags=["documents", "review_cycle"],
                )
            )

    return actions


def _build_pattern_actions(
    *,
    incidents: list[dict[str, Any]],
    missing_episodes: list[dict[str, Any]],
    safeguarding_records: list[dict[str, Any]],
    scope: str,
    default_home_id: int | None = None,
) -> list[OperationalAction]:
    actions: list[OperationalAction] = []

    recent_incidents = [
        item for item in incidents
        if (_parse_datetime(item.get("incident_datetime") or item.get("created_at")) or _now())
        >= (_now() - timedelta(days=30))
    ]

    if len(recent_incidents) >= 3:
        first = recent_incidents[0]
        actions.append(
            OperationalAction(
                action_id=f"pattern-incidents-{_record_child_id(first) or _record_home_id(first, default_home_id) or 'scope'}",
                scope=scope,
                priority="high",
                status="open",
                category="pattern",
                title="Repeated incidents pattern identified",
                description=f"{len(recent_incidents)} recent incidents suggest a pattern that may need deeper analysis.",
                recommended_action="Review chronology, triggers, protective factors, and whether the current plan and risk formulation fully explain what is happening.",
                source_record_type="incident",
                source_record_id=_safe_int(first.get("id")),
                young_person_id=_record_child_id(first),
                home_id=_record_home_id(first, default_home_id),
                due_date=_to_iso_date(_now() + timedelta(days=2)),
                event_date=_to_iso_date(first.get("incident_datetime") or first.get("created_at")),
                assigned_role="manager",
                escalation_level="manager",
                tags=["pattern", "incidents", "analysis"],
            )
        )

    recent_missing = [
        item for item in missing_episodes
        if (_parse_datetime(item.get("start_datetime") or item.get("created_at")) or _now())
        >= (_now() - timedelta(days=60))
    ]

    if len(recent_missing) >= 2:
        first = recent_missing[0]
        actions.append(
            OperationalAction(
                action_id=f"pattern-missing-{_record_child_id(first) or _record_home_id(first, default_home_id) or 'scope'}",
                scope=scope,
                priority="critical",
                status="open",
                category="pattern",
                title="Repeated missing pattern identified",
                description=f"{len(recent_missing)} recent missing episodes suggest increased vulnerability.",
                recommended_action="Review missing patterns, contextual safeguarding risks, known triggers, and whether escalation or multi-agency planning is required.",
                source_record_type="missing_episode",
                source_record_id=_safe_int(first.get("id")),
                young_person_id=_record_child_id(first),
                home_id=_record_home_id(first, default_home_id),
                due_date=_to_iso_date(_now() + timedelta(days=1)),
                event_date=_to_iso_date(first.get("start_datetime") or first.get("created_at")),
                assigned_role="manager",
                escalation_level="urgent",
                tags=["pattern", "missing", "contextual_safeguarding"],
            )
        )

    open_safeguarding = [
        item for item in safeguarding_records
        if _normalise_token(item.get("status")) not in {"closed", "completed"}
    ]

    if len(open_safeguarding) >= 2:
        first = open_safeguarding[0]
        actions.append(
            OperationalAction(
                action_id=f"pattern-safeguarding-{_record_child_id(first) or _record_home_id(first, default_home_id) or 'scope'}",
                scope=scope,
                priority="critical",
                status="open",
                category="pattern",
                title="Multiple open safeguarding concerns",
                description="There are multiple open safeguarding concerns requiring joined-up oversight.",
                recommended_action="Review all open concerns together, confirm risk formulation, safety planning, and whether thresholds for escalation or referral have been met.",
                source_record_type="safeguarding_record",
                source_record_id=_safe_int(first.get("id")),
                young_person_id=_record_child_id(first),
                home_id=_record_home_id(first, default_home_id),
                due_date=_to_iso_date(_now() + timedelta(days=1)),
                event_date=_to_iso_date(first.get("concern_datetime") or first.get("created_at")),
                assigned_role="manager",
                escalation_level="urgent",
                tags=["pattern", "safeguarding", "oversight"],
            )
        )

    return actions


def build_operational_actions(
    bundle: dict[str, Any] | None,
    *,
    scope: str = "child",
    home_id: int | None = None,
    young_person_id: int | None = None,
) -> dict[str, Any]:
    bundle = bundle or {}

    tasks = _safe_list(bundle.get("tasks"))
    incidents = _safe_list(bundle.get("incidents")) + _safe_list(bundle.get("home_incidents"))
    missing_episodes = _safe_list(bundle.get("missing_episodes"))
    safeguarding_records = _safe_list(bundle.get("safeguarding_records"))
    appointments = _safe_list(bundle.get("appointments"))
    compliance_items = _safe_list(bundle.get("compliance_items"))
    documents = _safe_list(bundle.get("documents")) + _safe_list(bundle.get("statutory_documents"))

    existing_task_index = _build_existing_task_index(tasks)

    actions: list[OperationalAction] = []
    actions.extend(_build_task_actions(tasks, scope=scope, default_home_id=home_id))
    actions.extend(
        _build_incident_actions(
            incidents,
            existing_task_index,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_missing_episode_actions(
            missing_episodes,
            existing_task_index,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_safeguarding_actions(
            safeguarding_records,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_appointment_actions(
            appointments,
            existing_task_index,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_compliance_actions(
            compliance_items,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_document_actions(
            documents,
            scope=scope,
            default_home_id=home_id,
        )
    )
    actions.extend(
        _build_pattern_actions(
            incidents=incidents,
            missing_episodes=missing_episodes,
            safeguarding_records=safeguarding_records,
            scope=scope,
            default_home_id=home_id,
        )
    )

    unique = _unique_actions(actions)

    grouped = {
        "critical": [item.to_dict() for item in unique if item.priority == "critical"],
        "high": [item.to_dict() for item in unique if item.priority == "high"],
        "medium": [item.to_dict() for item in unique if item.priority == "medium"],
        "low": [item.to_dict() for item in unique if item.priority == "low"],
    }

    return {
        "scope": scope,
        "home_id": home_id,
        "young_person_id": young_person_id,
        "summary": {
            "total": len(unique),
            "critical": len(grouped["critical"]),
            "high": len(grouped["high"]),
            "medium": len(grouped["medium"]),
            "low": len(grouped["low"]),
        },
        "actions": [item.to_dict() for item in unique],
        "grouped": grouped,
    }