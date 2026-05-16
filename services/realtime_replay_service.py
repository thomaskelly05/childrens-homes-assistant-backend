from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from core.policy_engine import policy_engine
from schemas.operational_memory import OperationalMemoryReplayEvent
from services.operational_memory_replay_service import operational_memory_replay_service


class RealtimeReplayService:
    """Durable realtime replay sourced from operational_event_log."""

    def replay(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        provider_id: int | None = None,
        home_id: int | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        after_cursor: int | None = None,
        since: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        if not policy_engine.has_permission(current_user, "realtime:subscribe", home_id=home_id, provider_id=provider_id):
            raise HTTPException(status_code=403, detail="Realtime replay access denied.")
        replay = operational_memory_replay_service.replay(
            conn,
            current_user=current_user,
            provider_id=provider_id,
            home_id=home_id,
            entity_type=entity_type,
            entity_id=entity_id,
            after_cursor=after_cursor,
            since=since,
            tables=("operational_event_log",),
            limit=limit,
            permission="realtime:subscribe",
        )
        events = [self._realtime_event(event) for event in replay.events]
        return {
            "ok": True,
            "events": events,
            "next_cursor": replay.next_cursor,
            "checkpoint": self.checkpoint(replay.events),
            "integrity": replay.integrity.model_dump(mode="json"),
            "source": "operational_event_log",
        }

    def checkpoint(self, events: list[OperationalMemoryReplayEvent]) -> dict[str, Any]:
        if not events:
            return {"cursor": 0, "event_count": 0, "last_event_at": None}
        return {
            "cursor": max(event.id for event in events),
            "event_count": len(events),
            "last_event_at": max(event.created_at for event in events),
        }

    def _realtime_event(self, event: OperationalMemoryReplayEvent) -> dict[str, Any]:
        payload = event.metadata.get("lifecycle") if isinstance(event.metadata.get("lifecycle"), dict) else {}
        return {
            "id": event.replay_key,
            "cursor": event.id,
            "type": event.event_type,
            "home_id": str(event.home_id) if event.home_id is not None else None,
            "provider_id": event.provider_id,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "correlation_id": event.correlation_id,
            "created_at": event.created_at,
            "payload": {
                "transition": event.transition_type,
                "previous_state": event.previous_state,
                "next_state": event.next_state,
                "evidence_references": event.evidence_references,
                "chronology_references": event.chronology_references,
                "governance_references": event.governance_references,
                **payload,
            },
        }


realtime_replay_service = RealtimeReplayService()
