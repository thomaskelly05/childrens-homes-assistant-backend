from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from core.policy_engine import context_from_user
from schemas.operational_memory import OperationalMemoryReplayEvent, ProviderOperationalQueueItem
from services.operational_memory_replay_service import operational_memory_replay_service

QUEUE_CATEGORIES = (
    "safeguarding_escalations",
    "unresolved_safeguarding",
    "overdue_review",
    "child_voice_missing",
    "external_notification_pending",
    "unresolved_safeguarding_actions",
    "active_missing_episodes",
    "overdue_RHI",
    "repeated_missing_patterns",
    "safeguarding_escalation",
    "unresolved_follow_up",
    "unresolved_lifecycle_states",
    "unresolved_reviews",
    "stale_evidence",
    "chronology_gaps",
    "overdue_signoffs",
    "unresolved_inspections",
    "governance_backlog",
    "workforce_compliance_gaps",
)

RESOLVED_STATUSES = {"resolved", "closed", "completed", "approved", "signed_off", "locked", "archived"}


class ProviderOperationalQueueService:
    """Provider-wide operational queue engine over replayable memory events."""

    def overview(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        provider_id: int | None = None,
        home_id: int | None = None,
        limit: int = 500,
    ) -> dict[str, Any]:
        context = context_from_user(current_user)
        if context.tenancy_scope not in {"provider", "platform"} and not context.provider_oversight_access:
            raise HTTPException(status_code=403, detail="Provider oversight access is required.")
        replay = operational_memory_replay_service.replay(
            conn,
            current_user=current_user,
            provider_id=provider_id,
            home_id=home_id,
            tables=("operational_event_log", "operational_lifecycle_history", "governance_signoff_history", "evidence_relationship_history", "chronology_snapshot_history"),
            limit=limit,
            permission="provider:oversight",
        )
        items = self.from_events(replay.events)
        queues = {category: [] for category in QUEUE_CATEGORIES}
        for item in items:
            queues.setdefault(item.category, []).append(item.model_dump(mode="json"))
        return {
            "ok": True,
            "provider_id": provider_id or context.provider_id,
            "home_id": home_id,
            "summary": {category: len(queues[category]) for category in QUEUE_CATEGORIES},
            "queues": queues,
            "replay_cursor": replay.next_cursor,
            "integrity": replay.integrity.model_dump(mode="json"),
        }

    def from_events(self, events: list[OperationalMemoryReplayEvent]) -> list[ProviderOperationalQueueItem]:
        latest: dict[str, OperationalMemoryReplayEvent] = {}
        for event in sorted(events, key=lambda item: (item.created_at, item.id)):
            latest[f"{event.entity_type}:{event.entity_id}"] = event
        items: list[ProviderOperationalQueueItem] = []
        for event in latest.values():
            items.extend(self._items_for_event(event))
        return sorted(items, key=lambda item: (item.priority, item.queue_id))

    def _items_for_event(self, event: OperationalMemoryReplayEvent) -> list[ProviderOperationalQueueItem]:
        state = {**event.previous_state, **event.next_state}
        lifecycle = event.metadata.get("lifecycle") if isinstance(event.metadata.get("lifecycle"), dict) else {}
        status = str(state.get("status") or state.get("workflow_status") or lifecycle.get("status") or event.transition_type or "open").lower()
        text = " ".join(
            str(value)
            for value in [
                event.entity_type,
                event.event_type,
                event.transition_type,
                state.get("title"),
                state.get("summary"),
                lifecycle.get("calm_summary"),
            ]
            if value
        ).lower()
        items: list[ProviderOperationalQueueItem] = []
        if event.entity_type == "safeguarding" or "safeguarding" in text or status == "escalated":
            items.append(self._item(event, "safeguarding_escalations", status, "Safeguarding escalation needs oversight."))
        if event.entity_type == "safeguarding" and status not in RESOLVED_STATUSES:
            items.append(self._item(event, "unresolved_safeguarding", status, "Safeguarding lifecycle remains open."))
            if not state.get("child_voice"):
                items.append(self._item(event, "child_voice_missing", status, "Child voice has not yet been recorded."))
            if state.get("external_notification_required") and not state.get("external_notification_at"):
                items.append(self._item(event, "external_notification_pending", status, "External safeguarding notification remains pending."))
            if status == "action_required" and not state.get("linked_action_ids"):
                items.append(self._item(event, "unresolved_safeguarding_actions", status, "Safeguarding action is required but not yet linked."))
        if event.entity_type == "missing_episode":
            if status in {"reported_missing", "police_notified", "return_pending"}:
                items.append(self._item(event, "active_missing_episodes", status, "Missing episode remains active."))
            if status == "rhi_required" or status == "RHI_required":
                items.append(self._item(event, "overdue_RHI", status, "Return-home interview requires review."))
            if "repeated_pattern" in text or event.transition_type == "repeated_pattern_detected":
                items.append(self._item(event, "repeated_missing_patterns", status, "Repeated missing pattern requires human review."))
            if state.get("risk_level") in {"high", "critical"} and not state.get("safeguarding_link_ids"):
                items.append(self._item(event, "safeguarding_escalation", status, "High-risk missing episode needs safeguarding linkage."))
            if state.get("follow_up_action_ids") and status not in RESOLVED_STATUSES:
                items.append(self._item(event, "unresolved_follow_up", status, "Missing episode follow-up remains open."))
        if status not in RESOLVED_STATUSES:
            items.append(self._item(event, "unresolved_lifecycle_states", status, "Lifecycle state is not resolved."))
        if "review" in status or "review" in text:
            items.append(self._item(event, "unresolved_reviews", status, "Review remains open or recently changed."))
        if state.get("stale_evidence") or lifecycle.get("stale_evidence"):
            items.append(self._item(event, "stale_evidence", status, "Evidence is marked stale."))
        if (state.get("requires_chronology") or lifecycle.get("requires_chronology")) and not event.chronology_references:
            items.append(self._item(event, "chronology_gaps", status, "Chronology linkage is required but absent."))
        signoff = event.metadata.get("signoff_metadata") if isinstance(event.metadata.get("signoff_metadata"), dict) else {}
        if (state.get("signoff_required") or signoff.get("state") in {"required", "pending"}) and not signoff.get("signed_off_at"):
            items.append(self._item(event, "overdue_signoffs", status, "Governance signoff remains outstanding."))
        if state.get("inspection_gap") or lifecycle.get("inspection_gap") or lifecycle.get("missing_evidence"):
            items.append(self._item(event, "unresolved_inspections", status, "Inspection evidence gap remains unresolved."))
        if event.governance_references or state.get("governance_required"):
            items.append(self._item(event, "governance_backlog", status, "Governance review is linked to this state."))
        if event.entity_type == "staff" and (state.get("compliance_gap") or status == "overdue"):
            items.append(self._item(event, "workforce_compliance_gaps", status, "Workforce compliance needs review."))
        return items

    def _item(self, event: OperationalMemoryReplayEvent, category: str, status: str, reason: str) -> ProviderOperationalQueueItem:
        return ProviderOperationalQueueItem(
            queue_id=f"{category}:{event.entity_type}:{event.entity_id}:{event.id}",
            category=category,
            provider_id=event.provider_id,
            home_id=event.home_id,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            status=status,
            priority=self._priority(event, category),
            title=f"{event.entity_type.replace('_', ' ').title()} {event.entity_id}",
            reason=reason,
            chronology_links=event.chronology_references,
            lifecycle_links=[event.replay_key] if event.source_table in {"operational_lifecycle_history", "operational_event_log"} else [],
            evidence_links=event.evidence_references,
            governance_links=event.governance_references,
            inspection_links=self._inspection_links(event),
            replay_cursor=event.id,
        )

    def _priority(self, event: OperationalMemoryReplayEvent, category: str) -> str:
        state = {**event.previous_state, **event.next_state}
        value = str(state.get("priority") or state.get("severity") or "").lower()
        if category == "safeguarding_escalations" or value in {"critical", "urgent", "high"}:
            return "high"
        if category in {"chronology_gaps", "overdue_signoffs", "unresolved_inspections"}:
            return "medium"
        return "low"

    def _inspection_links(self, event: OperationalMemoryReplayEvent) -> list[str]:
        lifecycle = event.metadata.get("lifecycle") if isinstance(event.metadata.get("lifecycle"), dict) else {}
        values = lifecycle.get("inspection_ids") or event.metadata.get("inspection_ids") or []
        if isinstance(values, (list, tuple, set)):
            return [str(item) for item in values if str(item)]
        return [str(values)] if str(values) else []


provider_operational_queue_service = ProviderOperationalQueueService()
