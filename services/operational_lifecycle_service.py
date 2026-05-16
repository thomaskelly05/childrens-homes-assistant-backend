from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from schemas.operational_state import (
    AuditTimelineEvent,
    DurabilityRecoveryMarker,
    EvidenceEdge,
    GovernanceSignOff,
    OperationalLifecycleStatus,
    OperationalStateEscalation,
    OperationalStateHistoryEvent,
    OperationalStateLifecycleSnapshot,
    OperationalStateResolution,
    RealtimeAwarenessEvent,
)

LIFECYCLE_STATUSES: tuple[OperationalLifecycleStatus, ...] = (
    "open",
    "acknowledged",
    "in_review",
    "resolved",
    "reopened",
    "escalated",
    "archived",
)

TRANSITION_STATUS: dict[str, OperationalLifecycleStatus] = {
    "open": "open",
    "create": "open",
    "created": "open",
    "acknowledge": "acknowledged",
    "acknowledged": "acknowledged",
    "assign": "acknowledged",
    "assigned": "acknowledged",
    "review": "in_review",
    "start_review": "in_review",
    "manager_review": "in_review",
    "in_review": "in_review",
    "resolve": "resolved",
    "resolved": "resolved",
    "complete": "resolved",
    "completed": "resolved",
    "close": "resolved",
    "closed": "resolved",
    "sign_off": "resolved",
    "management_sign_off": "resolved",
    "reopen": "reopened",
    "reopened": "reopened",
    "escalate": "escalated",
    "escalated": "escalated",
    "archive": "archived",
    "archived": "archived",
}

STATUS_ALIASES: dict[str, OperationalLifecycleStatus] = {
    "draft": "open",
    "submitted": "in_review",
    "manager_review": "in_review",
    "manager_reviewed": "in_review",
    "review_required": "in_review",
    "returned": "reopened",
    "approved": "resolved",
    "locked": "resolved",
    "completed": "resolved",
    "closed": "resolved",
    "strong": "resolved",
    "overdue": "escalated",
    "critical": "escalated",
}

OPEN_LIFECYCLE_STATUSES = {"open", "acknowledged", "in_review", "reopened", "escalated"}


def _text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


def _timestamp(value: Any = None) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _actor_id(current_user: dict[str, Any]) -> str | None:
    return _text(current_user.get("id") or current_user.get("user_id") or current_user.get("sub"))


def normalise_lifecycle_status(value: Any) -> OperationalLifecycleStatus:
    key = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if key in LIFECYCLE_STATUSES:
        return key  # type: ignore[return-value]
    return STATUS_ALIASES.get(key, "open")


def status_for_transition(transition: str) -> OperationalLifecycleStatus | None:
    return TRANSITION_STATUS.get(str(transition or "").strip().lower().replace("-", "_").replace(" ", "_"))


def is_open_lifecycle(value: Any) -> bool:
    return normalise_lifecycle_status(value) in OPEN_LIFECYCLE_STATUSES


def transition_change_summary(entity_type: str, status: str, transition: str) -> str:
    clean_entity = entity_type.replace("_", " ")
    clean_transition = transition.replace("_", " ")
    if normalise_lifecycle_status(status) == "escalated":
        return f"{clean_entity.title()} moved to escalated review for calm follow-up."
    if normalise_lifecycle_status(status) == "resolved":
        return f"{clean_entity.title()} was resolved with review metadata retained."
    return f"{clean_entity.title()} moved through {clean_transition} to {status.replace('_', ' ')}."


def build_resolution(payload: dict[str, Any], current_user: dict[str, Any], *, status: str) -> OperationalStateResolution:
    lifecycle_status = normalise_lifecycle_status(status)
    resolved_at = payload.get("resolved_at") or payload.get("completed_at") or payload.get("closed_at")
    if lifecycle_status == "resolved" and not resolved_at:
        resolved_at = _now()
    return OperationalStateResolution(
        resolved_by=_text(payload.get("resolved_by") or payload.get("completed_by") or (_actor_id(current_user) if lifecycle_status == "resolved" else None)),
        resolved_at=_timestamp(resolved_at),
        resolution_reason=_text(payload.get("resolution_reason") or payload.get("reason")),
        review_notes=_text(payload.get("review_notes") or payload.get("notes") or payload.get("comment")),
    )


def build_escalation(payload: dict[str, Any], current_user: dict[str, Any], *, status: str) -> OperationalStateEscalation:
    lifecycle_status = normalise_lifecycle_status(status)
    escalated_at = payload.get("escalated_at")
    if lifecycle_status == "escalated" and not escalated_at:
        escalated_at = _now()
    return OperationalStateEscalation(
        escalated_by=_text(payload.get("escalated_by") or (_actor_id(current_user) if lifecycle_status == "escalated" else None)),
        escalated_at=_timestamp(escalated_at),
        escalation_reason=_text(payload.get("escalation_reason") or payload.get("reason")),
        escalation_level=_text(payload.get("escalation_level") or payload.get("priority") or payload.get("severity")),
        assigned_to=_text(payload.get("assigned_to") or payload.get("assigned_to_user_id") or payload.get("assigned_to_staff_id")),
        assigned_role=_text(payload.get("assigned_role")),
    )


def build_signoff(payload: dict[str, Any], current_user: dict[str, Any], *, transition: str, status: str) -> GovernanceSignOff:
    signed_off = transition in {"sign_off", "management_sign_off", "approve", "approved", "approve_lock"} or normalise_lifecycle_status(status) == "resolved"
    return GovernanceSignOff(
        signoff_id=_text(payload.get("signoff_id") or payload.get("sign_off_id")),
        state="signed_off" if signed_off else _text(payload.get("signoff_state") or payload.get("review_state")) or "not_required",
        reviewer_id=_text(payload.get("reviewer_id") or payload.get("reviewed_by")),
        reviewer_name=_text(payload.get("reviewer_name") or payload.get("reviewed_by_name")),
        signed_off_by=_text(payload.get("signed_off_by") or (_actor_id(current_user) if signed_off else None)),
        signed_off_at=_timestamp(payload.get("signed_off_at") or (_now() if signed_off else None)),
        required_role=_text(payload.get("required_role") or payload.get("assigned_role")),
        notes=_text(payload.get("signoff_notes") or payload.get("review_notes") or payload.get("notes")),
    )


def _ids(payload: dict[str, Any], *keys: str) -> list[str]:
    values: list[str] = []
    for key in keys:
        raw = payload.get(key)
        if raw in (None, ""):
            continue
        if isinstance(raw, (list, tuple, set)):
            values.extend(str(item) for item in raw if item not in (None, ""))
        else:
            values.append(str(raw))
    return list(dict.fromkeys(values))


def build_evidence_edges(entity_type: str, entity_id: str, payload: dict[str, Any]) -> list[EvidenceEdge]:
    edges: list[EvidenceEdge] = []
    for evidence_id in _ids(payload, "evidence_id", "evidence_ids", "linked_evidence"):
        edges.append(
            EvidenceEdge(
                source_type=entity_type,
                source_id=entity_id,
                target_type="evidence",
                target_id=evidence_id,
                relationship="supports_resolution" if payload.get("resolution_reason") else "supports_review",
                explanation=_text(payload.get("evidence_explanation")) or "Linked as supporting operational evidence.",
            )
        )
    for chronology_id in _ids(payload, "chronology_id", "chronology_ids", "linked_chronology"):
        edges.append(
            EvidenceEdge(
                source_type=entity_type,
                source_id=entity_id,
                target_type="chronology",
                target_id=chronology_id,
                relationship="chronology_context",
                explanation="Linked to preserve inspection and safeguarding traceability.",
            )
        )
    return edges


def build_history_event(
    *,
    entity_type: str,
    entity_id: str,
    transition: str,
    status: str,
    payload: dict[str, Any],
    current_user: dict[str, Any],
    event_id: str | None = None,
) -> OperationalStateHistoryEvent:
    return OperationalStateHistoryEvent(
        event_id=event_id,
        status=normalise_lifecycle_status(status),
        transition=transition,
        actor_id=_actor_id(current_user),
        actor_name=_text(current_user.get("name") or current_user.get("display_name") or current_user.get("email")),
        occurred_at=_timestamp(payload.get("occurred_at")) or _now(),
        notes=_text(payload.get("review_notes") or payload.get("resolution_reason") or payload.get("notes") or payload.get("comment")),
        evidence_ids=_ids(payload, "evidence_id", "evidence_ids", "linked_evidence"),
        chronology_ids=_ids(payload, "chronology_id", "chronology_ids", "linked_chronology"),
        governance_ids=_ids(payload, "governance_id", "governance_ids", "linked_governance"),
    )


def build_audit_timeline_event(
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    status: str,
    transition: str,
    payload: dict[str, Any],
    current_user: dict[str, Any],
    event_id: str | None = None,
) -> AuditTimelineEvent:
    return AuditTimelineEvent(
        event_id=event_id,
        actor_id=_actor_id(current_user),
        actor_name=_text(current_user.get("name") or current_user.get("display_name") or current_user.get("email")),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        timestamp=_now(),
        change_summary=transition_change_summary(entity_type, status, transition),
        linked_evidence=_ids(payload, "evidence_id", "evidence_ids", "linked_evidence"),
        linked_chronology=_ids(payload, "chronology_id", "chronology_ids", "linked_chronology"),
        operational_relevance="lifecycle_transition",
        safeguarding_relevance="relevant" if entity_type == "safeguarding" or payload.get("safeguarding_relevance") else "not_assessed",
        governance_relevance="relevant" if payload.get("governance_id") or payload.get("signoff_id") else "not_assessed",
        metadata={"transition": transition, "status": status},
    )


def build_transition_context(
    *,
    entity_type: str,
    entity_id: str,
    transition: str,
    status: str,
    payload: dict[str, Any],
    current_user: dict[str, Any],
) -> dict[str, Any]:
    history = build_history_event(
        entity_type=entity_type,
        entity_id=entity_id,
        transition=transition,
        status=status,
        payload=payload,
        current_user=current_user,
    )
    audit = build_audit_timeline_event(
        action=f"{entity_type}.{transition}",
        entity_type=entity_type,
        entity_id=entity_id,
        transition=transition,
        status=status,
        payload=payload,
        current_user=current_user,
    )
    snapshot = OperationalStateLifecycleSnapshot(
        entity_type=entity_type,
        entity_id=entity_id,
        current_state=normalise_lifecycle_status(status),
        transition=transition,
        assigned_to=_text(payload.get("assigned_to") or payload.get("assigned_to_user_id") or payload.get("assigned_to_staff_id")),
        assigned_role=_text(payload.get("assigned_role")),
        resolution=build_resolution(payload, current_user, status=status),
        escalation=build_escalation(payload, current_user, status=status),
        signoff=build_signoff(payload, current_user, transition=transition, status=status),
        history=[history],
        audit_timeline=[audit],
        evidence_edges=build_evidence_edges(entity_type, entity_id, payload),
        chronology_ids=history.chronology_ids,
        governance_ids=history.governance_ids,
        durability=DurabilityRecoveryMarker(
            workflow_id=_text(payload.get("workflow_id")),
            idempotency_key=_text(payload.get("idempotency_key")),
            save_state="transition_recorded",
            retry_state="not_required",
            recovery_hint="Transition metadata, workflow event and audit context were recorded together where storage is available.",
        ),
        calm_summary=audit.change_summary or "Lifecycle transition recorded.",
    )
    return snapshot.model_dump(mode="json")


def build_realtime_awareness_event(*, home_id: Any, entity_type: str, entity_id: str, status: str, transition: str) -> RealtimeAwarenessEvent:
    return RealtimeAwarenessEvent(
        event_type="operational_state.lifecycle",
        home_id=str(home_id),
        entity_type=entity_type,
        entity_id=entity_id,
        lifecycle_status=normalise_lifecycle_status(status),
        change_summary=transition_change_summary(entity_type, status, transition),
        dedupe_key=f"{home_id}:{entity_type}:{entity_id}:{transition}:{status}",
    )


def snapshot_from_record(
    *,
    entity_type: str,
    entity_id: str,
    record: dict[str, Any],
    history_rows: list[dict[str, Any]] | None = None,
    audit_rows: list[dict[str, Any]] | None = None,
) -> OperationalStateLifecycleSnapshot:
    status = record.get("status") or record.get("workflow_status") or record.get("manager_review_status") or "open"
    metadata = record.get("metadata") if isinstance(record.get("metadata"), dict) else {}
    lifecycle = metadata.get("lifecycle") if isinstance(metadata.get("lifecycle"), dict) else {}
    current_state = normalise_lifecycle_status(lifecycle.get("current_state") or status)
    history = [
        OperationalStateHistoryEvent(
            event_id=_text(row.get("id") or row.get("event_id")),
            status=normalise_lifecycle_status(row.get("status") or row.get("workflow_status") or row.get("event_type")),
            transition=_text(row.get("event_type") or row.get("transition") or row.get("status")) or "recorded",
            actor_id=_text(row.get("actor_user_id") or row.get("created_by")),
            occurred_at=_timestamp(row.get("event_at") or row.get("created_at")),
            notes=_text(row.get("description") or row.get("summary") or row.get("notes")),
            evidence_ids=_ids(row.get("metadata") if isinstance(row.get("metadata"), dict) else {}, "evidence_ids", "linked_evidence"),
            chronology_ids=_ids(row.get("metadata") if isinstance(row.get("metadata"), dict) else {}, "chronology_ids", "linked_chronology"),
            governance_ids=_ids(row.get("metadata") if isinstance(row.get("metadata"), dict) else {}, "governance_ids", "linked_governance"),
        )
        for row in (history_rows or [])
    ]
    audit = [
        AuditTimelineEvent(
            event_id=_text(row.get("id") or row.get("event_id")),
            actor_id=_text(row.get("actor_user_id")),
            action=_text(row.get("action")) or "audit_event",
            entity_type=entity_type,
            entity_id=entity_id,
            timestamp=_timestamp(row.get("created_at")),
            change_summary=_text(row.get("reason")) or _text(row.get("action")),
            metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
        )
        for row in (audit_rows or [])
    ]
    return OperationalStateLifecycleSnapshot(
        entity_type=entity_type,
        entity_id=entity_id,
        current_state=current_state,
        transition=_text(lifecycle.get("transition")),
        assigned_to=_text(record.get("assigned_to") or record.get("owner_user_id")),
        assigned_role=_text(record.get("assigned_role")),
        history=history,
        audit_timeline=audit,
        calm_summary=f"{entity_type.replace('_', ' ').title()} is currently {current_state.replace('_', ' ')}.",
    )


class OperationalLifecycleService:
    def statuses(self) -> list[str]:
        return list(LIFECYCLE_STATUSES)

    normalise_lifecycle_status = staticmethod(normalise_lifecycle_status)
    status_for_transition = staticmethod(status_for_transition)
    is_open_lifecycle = staticmethod(is_open_lifecycle)
    build_transition_context = staticmethod(build_transition_context)
    build_realtime_awareness_event = staticmethod(build_realtime_awareness_event)
    snapshot_from_record = staticmethod(snapshot_from_record)


operational_lifecycle_service = OperationalLifecycleService()
