from __future__ import annotations

from life_echo.schemas import (
    EmotionalTone,
    LifeEchoEventCreate,
    LifeEchoEventType,
    LifeEchoSource,
)


class IndiCareLifeEchoAdapter:
    """Transforms IndiCare-native records into LifeEcho events."""

    @staticmethod
    def from_daily_note(
        *,
        child_id: str,
        note: str,
        staff_id: str | None = None,
    ) -> LifeEchoEventCreate:
        return LifeEchoEventCreate(
            child_id=child_id,
            source=LifeEchoSource.indicare,
            source_system="indicare",
            event_type=LifeEchoEventType.daily_life,
            emotional_tone=EmotionalTone.settled,
            title="Daily reflection",
            narrative=note,
            staff_ids=[staff_id] if staff_id else [],
            tags=["daily-note", "indicare"],
        )

    @staticmethod
    def from_incident(
        *,
        child_id: str,
        incident_summary: str,
        emotional_tone: EmotionalTone = EmotionalTone.dysregulated,
    ) -> LifeEchoEventCreate:
        return LifeEchoEventCreate(
            child_id=child_id,
            source=LifeEchoSource.indicare,
            source_system="indicare",
            event_type=LifeEchoEventType.incident,
            emotional_tone=emotional_tone,
            title="Incident reflection",
            narrative=incident_summary,
            tags=["incident", "indicare"],
        )
