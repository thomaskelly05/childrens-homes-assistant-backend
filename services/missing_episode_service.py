from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from core.policy_engine import context_from_user, policy_engine
from repositories.missing_episode_repository import missing_episode_repository
from repositories.os_repository_utils import current_user_id, table_exists
from schemas.missing_episode_contracts import (
    MissingEpisodeCreateRequest,
    MissingEpisodeListResponse,
    MissingEpisodeQueueItem,
    MissingEpisodeQueueResponse,
    MissingEpisodeRecord,
    MissingEpisodeTransitionRequest,
)
from services.operational_memory_repository import operational_memory_repository

OPEN_STATES = {"reported_missing", "police_notified", "return_pending", "returned", "RHI_required"}
CHRONOLOGY_BY_TRANSITION = {
    "create": "missing_reported",
    "police": "police_notified",
    "return": "returned_home",
    "safeguarding": "safeguarding_escalation",
    "pattern": "repeated_pattern_detected",
    "close": "returned_home",
}


class MissingEpisodeService:
    """First-class missing episode workflow with chronology and replay writes."""

    def __init__(self, repository=missing_episode_repository):
        self.repository = repository

    def create(self, conn: Any, *, payload: MissingEpisodeCreateRequest, current_user: dict[str, Any]) -> MissingEpisodeRecord:
        self._require_policy(current_user, "records:write", home_id=payload.home_id, provider_id=payload.provider_id)
        record = self.repository.create_missing(conn, payload=payload.model_dump(mode="json"), current_user=current_user)
        self._project(conn, current_user=current_user, record=record, previous=None, transition="create")
        if record.police_notified_at:
            self._project(conn, current_user=current_user, record=record, previous=None, transition="police")
        return self.get(conn, missing_episode_id=record.id, current_user=current_user) or record

    def list(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        young_person_id: int | None = None,
        lifecycle_state: str | None = None,
        limit: int = 100,
    ) -> MissingEpisodeListResponse:
        self._require_policy(current_user, "records:read", home_id=home_id)
        records = self.repository.list_missing(
            conn,
            current_user=current_user,
            filters={"home_id": home_id, "young_person_id": young_person_id, "lifecycle_state": lifecycle_state},
            limit=limit,
        )
        return MissingEpisodeListResponse(items=records, total=len(records))

    def get(self, conn: Any, *, missing_episode_id: str, current_user: dict[str, Any]) -> MissingEpisodeRecord | None:
        self._require_policy(current_user, "records:read")
        return self.repository.get_missing(conn, missing_episode_id=missing_episode_id, current_user=current_user)

    def mark_police_notified(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        update = payload.model_dump(mode="json", exclude_unset=True)
        update["police_notified_at"] = update.get("police_notified_at") or datetime.now(timezone.utc).isoformat()
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=MissingEpisodeTransitionRequest(**update),
            current_user=current_user,
            transition="police",
            lifecycle_state="police_notified",
            permission="records:write",
        )

    def mark_returned(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        update = payload.model_dump(mode="json", exclude_unset=True)
        returned_at = update.get("returned_at") or datetime.now(timezone.utc).isoformat()
        update["returned_at"] = returned_at
        update["return_home_interview_due_at"] = update.get("return_home_interview_due_at") or (
            datetime.fromisoformat(returned_at.replace("Z", "+00:00")) + timedelta(hours=72)
        ).isoformat()
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=MissingEpisodeTransitionRequest(**update),
            current_user=current_user,
            transition="return",
            lifecycle_state="RHI_required",
            permission="records:write",
        )

    def escalate_to_safeguarding(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=payload,
            current_user=current_user,
            transition="safeguarding",
            lifecycle_state=payload.lifecycle_state or "return_pending",
            permission="safeguarding:review",
        )

    def close(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=payload,
            current_user=current_user,
            transition="close",
            lifecycle_state="closed",
            permission="safeguarding:review",
        )

    def queues(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        limit: int = 300,
    ) -> MissingEpisodeQueueResponse:
        self._require_policy(current_user, "records:read", home_id=home_id)
        records = self.repository.list_missing(conn, current_user=current_user, filters={"home_id": home_id}, limit=limit)
        queues: dict[str, list[MissingEpisodeQueueItem]] = {
            "active_missing_episodes": [],
            "overdue_RHI": [],
            "repeated_missing_patterns": [],
            "safeguarding_escalation": [],
            "unresolved_follow_up": [],
        }
        now = datetime.now(timezone.utc)
        by_child = Counter(record.young_person_id for record in records)
        for record in records:
            if record.lifecycle_state in {"reported_missing", "police_notified", "return_pending"}:
                queues["active_missing_episodes"].append(self._queue_item(record, "active_missing_episodes", "Missing episode remains active.", priority="urgent"))
            if record.lifecycle_state == "RHI_required" and record.return_home_interview_due_at and self._is_past(record.return_home_interview_due_at, now):
                queues["overdue_RHI"].append(self._queue_item(record, "overdue_RHI", "Return-home interview is overdue.", priority="high"))
            if by_child[record.young_person_id] >= 3 and record.lifecycle_state in OPEN_STATES:
                queues["repeated_missing_patterns"].append(
                    self._queue_item(record, "repeated_missing_patterns", "Repeated missing pattern requires human review.", priority="high")
                )
            if record.risk_level in {"high", "critical"} and not record.safeguarding_link_ids and record.lifecycle_state in OPEN_STATES:
                queues["safeguarding_escalation"].append(
                    self._queue_item(record, "safeguarding_escalation", "High-risk missing episode needs safeguarding linkage.", priority="high")
                )
            if record.follow_up_action_ids and record.lifecycle_state in OPEN_STATES:
                queues["unresolved_follow_up"].append(self._queue_item(record, "unresolved_follow_up", "Follow-up action remains open.", priority="medium"))
        return MissingEpisodeQueueResponse(summary={category: len(items) for category, items in queues.items()}, queues=queues)

    def _transition(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
        transition: str,
        lifecycle_state: str,
        permission: str,
    ) -> MissingEpisodeRecord:
        current = self.repository.get_missing(conn, missing_episode_id=missing_episode_id, current_user=current_user)
        if current is None:
            raise HTTPException(status_code=404, detail="Missing episode not found.")
        self._require_policy(current_user, permission, home_id=current.home_id, provider_id=current.provider_id)
        before, after = self.repository.update_missing_state(
            conn,
            missing_episode_id=missing_episode_id,
            lifecycle_state=lifecycle_state,
            payload=payload.model_dump(mode="json", exclude_unset=True),
            current_user=current_user,
        )
        self._project(conn, current_user=current_user, record=after, previous=before, transition=transition, notes=payload.notes)
        return self.repository.get_missing(conn, missing_episode_id=missing_episode_id, current_user=current_user) or after

    def _project(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: MissingEpisodeRecord,
        previous: MissingEpisodeRecord | None,
        transition: str,
        notes: str | None = None,
    ) -> None:
        chronology_event_id = self._write_chronology(conn, current_user=current_user, record=record, transition=transition, notes=notes)
        memory_ids = self._write_memory(conn, current_user=current_user, record=record, previous=previous, transition=transition, chronology_event_id=chronology_event_id)
        self.repository.attach_missing_chronology_and_replay(
            conn,
            missing_episode_id=record.id,
            chronology_event_id=chronology_event_id,
            replay_event_ids=[value for value in memory_ids.values() if value],
        )

    def _write_chronology(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: MissingEpisodeRecord,
        transition: str,
        notes: str | None,
    ) -> str | None:
        if not table_exists(conn, "os_chronology_events"):
            return None
        event_type = CHRONOLOGY_BY_TRANSITION[transition]
        title = {
            "missing_reported": "Missing episode reported",
            "police_notified": "Police notified of missing episode",
            "returned_home": "Young person returned home",
            "safeguarding_escalation": "Missing episode safeguarding escalation",
            "repeated_pattern_detected": "Repeated missing pattern needs review",
        }.get(event_type, "Missing episode update")
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
                    title,
                    notes or record.circumstances,
                    "missing_episode_domain_records",
                    "helped_and_protected",
                    ["Missing from care"],
                    Json(record.evidence_ids),
                    "manager",
                    True,
                    current_user_id(current_user),
                    Json({"missing_episode_id": record.id, "lifecycle_state": record.lifecycle_state, "transition": transition}),
                ),
            )
            row = cur.fetchone()
        return str(row["id"]) if row else None

    def _write_memory(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: MissingEpisodeRecord,
        previous: MissingEpisodeRecord | None,
        transition: str,
        chronology_event_id: str | None,
    ) -> dict[str, str | None]:
        if not table_exists(conn, "operational_lifecycle_history"):
            return {}
        lifecycle_context = {
            "title": f"Missing episode for child {record.young_person_id}",
            "status": record.lifecycle_state,
            "calm_summary": record.circumstances,
            "chronology_ids": [chronology_event_id] if chronology_event_id else [],
            "evidence_edges": [{"target_id": evidence_id, "relationship": "missing_episode_evidence"} for evidence_id in record.evidence_ids],
            "requires_chronology": True,
            "return_home_interview_due_at": record.return_home_interview_due_at,
            "safeguarding_link_ids": record.safeguarding_link_ids,
        }
        return operational_memory_repository.append_lifecycle_transition(
            conn,
            current_user=current_user,
            entity_type="missing_episode",
            entity_id=record.id,
            previous_state=previous.model_dump(mode="json") if previous else None,
            next_state=record.model_dump(mode="json"),
            transition_type=CHRONOLOGY_BY_TRANSITION[transition],
            lifecycle_context=lifecycle_context,
        )

    def _queue_item(self, record: MissingEpisodeRecord, category: str, reason: str, *, priority: str) -> MissingEpisodeQueueItem:
        return MissingEpisodeQueueItem(
            queue_id=f"{category}:missing_episode:{record.id}",
            category=category,
            provider_id=record.provider_id,
            home_id=record.home_id,
            young_person_id=record.young_person_id,
            missing_episode_id=record.id,
            title=f"Missing episode for child {record.young_person_id}",
            reason=reason,
            priority=priority,
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
            raise HTTPException(status_code=403, detail="You do not have permission for this missing episode workflow.")

    def _is_past(self, value: str, now: datetime) -> bool:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return False
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed < now


missing_episode_service = MissingEpisodeService()
