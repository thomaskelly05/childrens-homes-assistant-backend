from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from core.policy_engine import context_from_user, policy_engine
from repositories.os_repository_utils import current_user_id, table_exists
from repositories.safeguarding_repository import safeguarding_repository
from schemas.safeguarding_contracts import (
    SafeguardingActionRequest,
    SafeguardingCreateRequest,
    SafeguardingListResponse,
    SafeguardingQueueItem,
    SafeguardingQueueResponse,
    SafeguardingRecord,
    SafeguardingTransitionRequest,
)
from services.operational_memory_repository import operational_memory_repository

OPEN_STATES = {"draft", "submitted", "manager_review", "action_required", "escalated", "external_notification", "monitoring"}
CHRONOLOGY_BY_TRANSITION = {
    "create": "safeguarding_created",
    "review": "safeguarding_reviewed",
    "action": "safeguarding_action_added",
    "escalate": "safeguarding_escalated",
    "resolve": "safeguarding_resolved",
}


class SafeguardingDomainService:
    """First-class safeguarding workflow service with chronology and replay writes."""

    def __init__(self, repository=safeguarding_repository):
        self.repository = repository

    def create(self, conn: Any, *, payload: SafeguardingCreateRequest, current_user: dict[str, Any]) -> SafeguardingRecord:
        self._require_policy(current_user, "records:write", home_id=payload.home_id, provider_id=payload.provider_id)
        record = self.repository.create(conn, payload=payload.model_dump(mode="json"), current_user=current_user)
        self._project(conn, current_user=current_user, record=record, previous=None, transition="create")
        return self.get(conn, safeguarding_id=record.id, current_user=current_user) or record

    def list(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        young_person_id: int | None = None,
        lifecycle_state: str | None = None,
        limit: int = 100,
    ) -> SafeguardingListResponse:
        self._require_policy(current_user, "records:read", home_id=home_id)
        records = self.repository.list(
            conn,
            current_user=current_user,
            filters={"home_id": home_id, "young_person_id": young_person_id, "lifecycle_state": lifecycle_state},
            limit=limit,
        )
        return SafeguardingListResponse(items=records, total=len(records))

    def get(self, conn: Any, *, safeguarding_id: str, current_user: dict[str, Any]) -> SafeguardingRecord | None:
        self._require_policy(current_user, "records:read")
        return self.repository.get(conn, safeguarding_id=safeguarding_id, current_user=current_user)

    def review(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        payload: SafeguardingTransitionRequest,
        current_user: dict[str, Any],
    ) -> SafeguardingRecord:
        record = self._transition(
            conn,
            safeguarding_id=safeguarding_id,
            payload=payload,
            current_user=current_user,
            transition="review",
            lifecycle_state=payload.lifecycle_state or "manager_review",
            permission="safeguarding:review",
        )
        return record

    def add_action(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        payload: SafeguardingActionRequest,
        current_user: dict[str, Any],
    ) -> SafeguardingRecord:
        current = self.repository.get(conn, safeguarding_id=safeguarding_id, current_user=current_user)
        if current is None:
            raise HTTPException(status_code=404, detail="Safeguarding record not found.")
        self._require_policy(current_user, "records:write", home_id=current.home_id, provider_id=current.provider_id)
        action_id = self._create_action_if_available(conn, safeguarding=current, payload=payload, current_user=current_user)
        merged_actions = [*current.linked_action_ids, *([action_id] if action_id else [])]
        merged_evidence = [*current.evidence_ids, *payload.evidence_ids]
        update = SafeguardingTransitionRequest(
            lifecycle_state="action_required",
            notes=payload.action_summary,
            evidence_ids=merged_evidence,
            linked_action_ids=merged_actions,
            metadata={**current.metadata, "last_action": payload.model_dump(mode="json")},
        )
        return self._transition(
            conn,
            safeguarding_id=safeguarding_id,
            payload=update,
            current_user=current_user,
            transition="action",
            lifecycle_state="action_required",
            permission="records:write",
        )

    def escalate(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        payload: SafeguardingTransitionRequest,
        current_user: dict[str, Any],
    ) -> SafeguardingRecord:
        return self._transition(
            conn,
            safeguarding_id=safeguarding_id,
            payload=payload,
            current_user=current_user,
            transition="escalate",
            lifecycle_state="escalated",
            permission="safeguarding:review",
        )

    def resolve(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        payload: SafeguardingTransitionRequest,
        current_user: dict[str, Any],
    ) -> SafeguardingRecord:
        return self._transition(
            conn,
            safeguarding_id=safeguarding_id,
            payload=payload,
            current_user=current_user,
            transition="resolve",
            lifecycle_state="resolved",
            permission="safeguarding:review",
        )

    def queues(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        limit: int = 300,
    ) -> SafeguardingQueueResponse:
        self._require_policy(current_user, "records:read", home_id=home_id)
        records = self.repository.list(conn, current_user=current_user, filters={"home_id": home_id}, limit=limit)
        queues: dict[str, list[SafeguardingQueueItem]] = {
            "unresolved_safeguarding": [],
            "overdue_review": [],
            "child_voice_missing": [],
            "external_notification_pending": [],
            "unresolved_safeguarding_actions": [],
        }
        now = datetime.now(timezone.utc)
        for record in records:
            if record.lifecycle_state in OPEN_STATES:
                queues["unresolved_safeguarding"].append(self._queue_item(record, "unresolved_safeguarding", "Safeguarding lifecycle remains open."))
            if record.review_due_at and self._is_past(record.review_due_at, now) and record.lifecycle_state in OPEN_STATES:
                queues["overdue_review"].append(self._queue_item(record, "overdue_review", "Safeguarding review is overdue.", priority="high"))
            if not record.child_voice and record.lifecycle_state in OPEN_STATES:
                queues["child_voice_missing"].append(self._queue_item(record, "child_voice_missing", "Child voice has not yet been recorded.", priority="medium"))
            if record.external_notification_required and not record.external_notification_at and record.lifecycle_state in OPEN_STATES:
                queues["external_notification_pending"].append(
                    self._queue_item(record, "external_notification_pending", "External safeguarding notification remains pending.", priority="high")
                )
            if record.lifecycle_state == "action_required" and not record.linked_action_ids:
                queues["unresolved_safeguarding_actions"].append(
                    self._queue_item(record, "unresolved_safeguarding_actions", "Safeguarding action is required but no action is linked.", priority="high")
                )
        return SafeguardingQueueResponse(
            summary={category: len(items) for category, items in queues.items()},
            queues=queues,
        )

    def _transition(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        payload: SafeguardingTransitionRequest,
        current_user: dict[str, Any],
        transition: str,
        lifecycle_state: str,
        permission: str,
    ) -> SafeguardingRecord:
        current = self.repository.get(conn, safeguarding_id=safeguarding_id, current_user=current_user)
        if current is None:
            raise HTTPException(status_code=404, detail="Safeguarding record not found.")
        self._require_policy(current_user, permission, home_id=current.home_id, provider_id=current.provider_id)
        before, after = self.repository.update_state(
            conn,
            safeguarding_id=safeguarding_id,
            lifecycle_state=lifecycle_state,
            payload=payload.model_dump(mode="json", exclude_unset=True),
            current_user=current_user,
        )
        self._project(conn, current_user=current_user, record=after, previous=before, transition=transition, notes=payload.notes)
        return self.repository.get(conn, safeguarding_id=safeguarding_id, current_user=current_user) or after

    def _project(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: SafeguardingRecord,
        previous: SafeguardingRecord | None,
        transition: str,
        notes: str | None = None,
    ) -> None:
        chronology_event_id = self._write_chronology(conn, current_user=current_user, record=record, transition=transition, notes=notes)
        memory_ids = self._write_memory(conn, current_user=current_user, record=record, previous=previous, transition=transition, chronology_event_id=chronology_event_id)
        self.repository.attach_chronology_and_replay(
            conn,
            safeguarding_id=record.id,
            chronology_event_id=chronology_event_id,
            replay_event_ids=[value for value in memory_ids.values() if value],
        )

    def _write_chronology(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: SafeguardingRecord,
        transition: str,
        notes: str | None,
    ) -> str | None:
        if not table_exists(conn, "os_chronology_events"):
            return None
        event_type = CHRONOLOGY_BY_TRANSITION[transition]
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.os_chronology_events (
                  provider_id, home_id, young_person_id, event_type, event_title, event_summary,
                  event_at, source_table, source_id, sccif_area, regulation_refs, evidence_refs,
                  visibility, is_sensitive, created_by, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, NULL, %s, %s, %s::jsonb, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    record.provider_id,
                    record.home_id,
                    record.young_person_id,
                    event_type,
                    record.title,
                    notes or record.concern_summary,
                    "safeguarding_domain_records",
                    "helped_and_protected",
                    ["Safeguarding"],
                    Json(record.evidence_ids),
                    "manager",
                    True,
                    current_user_id(current_user),
                    Json({"safeguarding_id": record.id, "lifecycle_state": record.lifecycle_state, "transition": transition}),
                ),
            )
            row = cur.fetchone()
        return str(row["id"]) if row else None

    def _write_memory(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: SafeguardingRecord,
        previous: SafeguardingRecord | None,
        transition: str,
        chronology_event_id: str | None,
    ) -> dict[str, str | None]:
        if not table_exists(conn, "operational_lifecycle_history"):
            return {}
        lifecycle_context = {
            "title": record.title,
            "status": record.lifecycle_state,
            "calm_summary": record.concern_summary,
            "chronology_ids": [chronology_event_id] if chronology_event_id else [],
            "evidence_edges": [{"target_id": evidence_id, "relationship": "safeguarding_evidence"} for evidence_id in record.evidence_ids],
            "requires_chronology": True,
            "external_notification_required": record.external_notification_required,
        }
        return operational_memory_repository.append_lifecycle_transition(
            conn,
            current_user=current_user,
            entity_type="safeguarding",
            entity_id=record.id,
            previous_state=previous.model_dump(mode="json") if previous else None,
            next_state=record.model_dump(mode="json"),
            transition_type=CHRONOLOGY_BY_TRANSITION[transition],
            lifecycle_context=lifecycle_context,
        )

    def _create_action_if_available(
        self,
        conn: Any,
        *,
        safeguarding: SafeguardingRecord,
        payload: SafeguardingActionRequest,
        current_user: dict[str, Any],
    ) -> str | None:
        if not table_exists(conn, "universal_tasks"):
            return None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.universal_tasks (
                  provider_id, home_id, young_person_id, title, description, priority,
                  status, source_type, source_id, owner_user_id, due_at, created_by, metadata
                )
                VALUES (%s, %s, %s, %s, %s, 'high', 'open', 'safeguarding', NULL, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    safeguarding.provider_id,
                    safeguarding.home_id,
                    safeguarding.young_person_id,
                    "Safeguarding follow-up",
                    payload.action_summary,
                    payload.owner_user_id,
                    payload.due_at,
                    current_user_id(current_user),
                    Json({"safeguarding_id": safeguarding.id, **payload.metadata}),
                ),
            )
            row = cur.fetchone()
        return f"universal_task:{row['id']}" if row else None

    def _queue_item(self, record: SafeguardingRecord, category: str, reason: str, *, priority: str | None = None) -> SafeguardingQueueItem:
        return SafeguardingQueueItem(
            queue_id=f"{category}:safeguarding:{record.id}",
            category=category,
            provider_id=record.provider_id,
            home_id=record.home_id,
            young_person_id=record.young_person_id,
            safeguarding_id=record.id,
            title=record.title,
            reason=reason,
            priority=priority or ("urgent" if record.severity == "critical" else "high" if record.severity == "high" else "medium"),
            lifecycle_state=record.lifecycle_state,
            chronology_links=record.chronology_event_ids,
            evidence_links=record.evidence_ids,
        )

    def _require_policy(self, current_user: dict[str, Any], permission: str, *, home_id: int | None = None, provider_id: int | None = None) -> None:
        context = context_from_user(
            current_user,
            requested_home_id=home_id,
            requested_provider_id=provider_id if home_id is None else None,
        )
        decision = policy_engine.evaluate(
            {**current_user, "permissions": sorted(context.permissions)},
            permission,
            home_id=home_id,
            provider_id=provider_id if home_id is None else None,
        )
        if not decision.allowed:
            raise HTTPException(status_code=403, detail="You do not have permission for this safeguarding workflow.")

    def _is_past(self, value: str, now: datetime) -> bool:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return False
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed < now


safeguarding_domain_service = SafeguardingDomainService()
