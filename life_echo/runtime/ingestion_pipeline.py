from __future__ import annotations

from life_echo.runtime.event_bus import life_echo_event_bus
from life_echo.schemas import LifeEchoEventCreate
from life_echo.services import life_echo_service


class LifeEchoIngestionPipeline:
    """Processes incoming emotional continuity events through the runtime."""

    @staticmethod
    def ingest(payload: LifeEchoEventCreate):
        event = life_echo_service.create_event(payload)

        life_echo_event_bus.publish(
            "life_echo.event.created",
            {
                "event_id": event.id,
                "child_id": event.child_id,
                "event_type": event.event_type.value,
                "emotional_tone": event.emotional_tone.value,
            },
        )

        return event
