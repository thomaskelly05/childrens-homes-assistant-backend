from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from services.intelligence.chronology_engine import chronology_engine
from services.realtime_event_bus import REALTIME_EVENT_TYPES, realtime_event_bus


EVENT_TYPE_BY_TARGET = {
    "chronology": "chronology.update",
    "dashboard": "operational_state.lifecycle",
    "alerts": "management.alert",
    "orb": "assistant.context_refresh",
    "evidence": "evidence.graph",
    "governance": "governance.signoff",
    "inspection": "inspection.evidence",
    "actions": "action.update",
    "tasks": "action.update",
    "reports": "audit.timeline",
}


@dataclass(frozen=True)
class OperationalEvent:
    domain: str
    entity_type: str
    entity_id: str
    transition_type: str
    home_id: int | str | None
    actor: dict[str, Any]
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OperationalEventBus:
    """Reusable propagation standard over the existing realtime event bus."""

    def propagation_plan(self, event: OperationalEvent) -> dict[str, Any]:
        plan = chronology_engine.propagation_plan(
            domain=event.domain,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            transition_type=event.transition_type,
        )
        event_types = [
            EVENT_TYPE_BY_TARGET[target]
            for target in plan.targets
            if target in EVENT_TYPE_BY_TARGET and EVENT_TYPE_BY_TARGET[target] in REALTIME_EVENT_TYPES
        ]
        if plan.should_write_chronology and "chronology.update" not in event_types:
            event_types.append("chronology.update")
        if plan.should_refresh_orb and "assistant.context_refresh" not in event_types:
            event_types.append("assistant.context_refresh")
        return {
            **plan.to_dict(),
            "realtime_event_types": list(dict.fromkeys(event_types)),
            "dedupe_key": self._dedupe_key(event),
        }

    def publish(self, event: OperationalEvent) -> dict[str, Any]:
        plan = self.propagation_plan(event)
        results: list[dict[str, Any]] = []
        for event_type in plan["realtime_event_types"]:
            results.append(
                realtime_event_bus.publish(
                    event_type=event_type,
                    home_id=event.home_id,
                    actor=event.actor,
                    payload={
                        **event.payload,
                        "domain": event.domain,
                        "entity_type": event.entity_type,
                        "entity_id": event.entity_id,
                        "transition_type": event.transition_type,
                    },
                    required_permission="realtime:subscribe",
                    dedupe_key=f"{plan['dedupe_key']}:{event_type}",
                )
            )
        return {"ok": True, "plan": plan, "results": results}

    def _dedupe_key(self, event: OperationalEvent) -> str:
        return ":".join([event.domain, event.entity_type, event.entity_id, event.transition_type])


operational_event_bus = OperationalEventBus()

