from __future__ import annotations

from typing import Any

from schemas.operational_memory import ChronologyProjection, OperationalMemoryReplayEvent
from services.operational_memory_replay_service import operational_memory_replay_service


class ChronologyProjectionService:
    """Canonical chronology projections derived from replayable operational memory."""

    def project(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        projection_type: str = "operational",
        provider_id: int | None = None,
        home_id: int | None = None,
        child_id: int | None = None,
        staff_id: int | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        replay = operational_memory_replay_service.replay(
            conn,
            current_user=current_user,
            provider_id=provider_id,
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            entity_type=entity_type,
            entity_id=entity_id,
            tables=(
                "chronology_snapshot_history",
                "operational_lifecycle_history",
                "operational_audit_timeline",
                "governance_signoff_history",
                "evidence_relationship_history",
            ),
            limit=limit,
        )
        projections = self.from_events(replay.events, projection_type=projection_type)
        return {
            "ok": True,
            "scope": replay.scope,
            "projection_type": projection_type,
            "items": [projection.model_dump(mode="json") for projection in projections],
            "integrity": replay.integrity.model_dump(mode="json"),
        }

    def from_events(
        self,
        events: list[OperationalMemoryReplayEvent],
        *,
        projection_type: str = "operational",
    ) -> list[ChronologyProjection]:
        by_projection: dict[str, ChronologyProjection] = {}
        for event in sorted(events, key=lambda item: (item.created_at, item.id, item.source_table)):
            projection_id = self._projection_id(event)
            existing = by_projection.get(projection_id)
            projection = self._projection(event, projection_type=projection_type)
            if existing:
                projection = self._merge(existing, projection)
            by_projection[projection_id] = projection
        return sorted(by_projection.values(), key=lambda item: (item.occurred_at, item.replay_cursor), reverse=True)

    def _projection_id(self, event: OperationalMemoryReplayEvent) -> str:
        if event.chronology_references:
            return f"chronology:{event.chronology_references[0]}"
        return f"{event.entity_type}:{event.entity_id}:{event.correlation_id}"

    def _projection(self, event: OperationalMemoryReplayEvent, *, projection_type: str) -> ChronologyProjection:
        lifecycle = event.metadata.get("lifecycle") if isinstance(event.metadata.get("lifecycle"), dict) else {}
        signoff = event.metadata.get("signoff_metadata") if isinstance(event.metadata.get("signoff_metadata"), dict) else {}
        inspection_ids = self._ids(lifecycle.get("inspection_ids") or event.metadata.get("inspection_ids"))
        state = event.next_state or event.previous_state
        title = str(
            state.get("title")
            or state.get("event_title")
            or lifecycle.get("title")
            or f"{event.entity_type.replace('_', ' ').title()} {event.transition_type or event.event_type}"
        )
        status = state.get("status") or state.get("workflow_status") or event.transition_type
        summary = str(
            state.get("summary")
            or state.get("description")
            or lifecycle.get("calm_summary")
            or f"{event.event_type} recorded with status {status or 'unknown'}."
        )
        return ChronologyProjection(
            projection_id=self._projection_id(event),
            projection_type=projection_type,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            occurred_at=event.created_at,
            title=title,
            summary=summary,
            linked_evidence=event.evidence_references,
            linked_operational_states=[f"{event.entity_type}:{event.entity_id}"],
            linked_lifecycle_events=[event.replay_key] if event.source_table == "operational_lifecycle_history" else [],
            linked_governance_reviews=event.governance_references,
            linked_inspections=inspection_ids,
            linked_signoffs=[str(signoff.get("signoff_id"))] if signoff.get("signoff_id") else [],
            source_event_ids=[event.replay_key],
            replay_cursor=event.id,
            metadata={
                "source_table": event.source_table,
                "event_type": event.event_type,
                "transition_type": event.transition_type,
                "correlation_id": event.correlation_id,
            },
        )

    def _merge(self, left: ChronologyProjection, right: ChronologyProjection) -> ChronologyProjection:
        return ChronologyProjection(
            projection_id=left.projection_id,
            projection_type=left.projection_type,
            entity_type=left.entity_type,
            entity_id=left.entity_id,
            occurred_at=max(left.occurred_at, right.occurred_at),
            title=left.title,
            summary=left.summary,
            linked_evidence=self._merge_ids(left.linked_evidence, right.linked_evidence),
            linked_operational_states=self._merge_ids(left.linked_operational_states, right.linked_operational_states),
            linked_lifecycle_events=self._merge_ids(left.linked_lifecycle_events, right.linked_lifecycle_events),
            linked_governance_reviews=self._merge_ids(left.linked_governance_reviews, right.linked_governance_reviews),
            linked_inspections=self._merge_ids(left.linked_inspections, right.linked_inspections),
            linked_signoffs=self._merge_ids(left.linked_signoffs, right.linked_signoffs),
            source_event_ids=self._merge_ids(left.source_event_ids, right.source_event_ids),
            replay_cursor=max(left.replay_cursor, right.replay_cursor),
            metadata={**left.metadata, "merged_from": self._merge_ids(left.source_event_ids, right.source_event_ids)},
        )

    def _ids(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, (list, tuple, set)):
            return [str(item) for item in value if str(item)]
        return [str(value)] if str(value) else []

    def _merge_ids(self, left: list[str], right: list[str]) -> list[str]:
        return list(dict.fromkeys([*left, *right]))


chronology_projection_service = ChronologyProjectionService()
