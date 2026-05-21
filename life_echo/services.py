from __future__ import annotations

from collections import defaultdict
from datetime import timezone, datetime

from life_echo.schemas import (
    EmotionalTone,
    LifeEchoEvent,
    LifeEchoEventCreate,
    LifeEchoInsight,
)


class LifeEchoService:
    """Temporary in-memory implementation.

    This intentionally starts lightweight so the API contract stabilises first.
    The next phase should move storage into PostgreSQL with adapter sync jobs.
    """

    def __init__(self) -> None:
        self._events: dict[str, list[LifeEchoEvent]] = defaultdict(list)

    def create_event(self, payload: LifeEchoEventCreate) -> LifeEchoEvent:
        event = LifeEchoEvent(**payload.model_dump())
        self._events[payload.child_id].append(event)
        self._events[payload.child_id].sort(key=lambda item: item.occurred_at)
        return event

    def get_timeline(self, child_id: str) -> list[LifeEchoEvent]:
        return self._events.get(child_id, [])

    def generate_insight(self, child_id: str) -> LifeEchoInsight:
        events = self.get_timeline(child_id)

        if not events:
            return LifeEchoInsight(
                child_id=child_id,
                summary="No LifeEcho events have been recorded yet.",
            )

        emotional_distribution: dict[str, int] = defaultdict(int)
        event_types: dict[str, int] = defaultdict(int)

        for event in events:
            emotional_distribution[event.emotional_tone.value] += 1
            event_types[event.event_type.value] += 1

        dominant_emotion = max(emotional_distribution, key=emotional_distribution.get)
        dominant_event_type = max(event_types, key=event_types.get)

        strengths: list[str] = []
        needs: list[str] = []
        patterns: list[str] = []
        reflections: list[str] = []

        positive_emotions = {
            EmotionalTone.joyful.value,
            EmotionalTone.proud.value,
            EmotionalTone.settled.value,
            EmotionalTone.calm.value,
        }

        if dominant_emotion in positive_emotions:
            strengths.append("Recent emotional patterns suggest increasing stability or safety.")
        else:
            needs.append("There may be unresolved emotional distress or environmental stressors.")

        patterns.append(f"Most common emotional presentation: {dominant_emotion}.")
        patterns.append(f"Most common event category: {dominant_event_type}.")

        reflections.append("What environmental factors may be influencing the emotional pattern?")
        reflections.append("Which relationships appear to increase emotional safety?")
        reflections.append("Are positive moments being captured consistently alongside incidents?")

        return LifeEchoInsight(
            child_id=child_id,
            generated_at=datetime.now(timezone.utc),
            summary=(
                f"LifeEcho identified {len(events)} events with a dominant emotional tone "
                f"of '{dominant_emotion}'."
            ),
            patterns=patterns,
            strengths=strengths,
            needs=needs,
            suggested_reflections=reflections,
        )


life_echo_service = LifeEchoService()
