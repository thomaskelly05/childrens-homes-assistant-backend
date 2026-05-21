from __future__ import annotations

from collections import Counter

from life_echo.frontend.emotional_timeline.schema import (
    EmotionalTimelineView,
    TimelineNode,
)
from life_echo.schemas import LifeEchoEvent


class LifeEchoTimelineBuilder:
    """Builds frontend-ready emotional timeline structures."""

    @staticmethod
    def build(child_id: str, events: list[LifeEchoEvent]) -> EmotionalTimelineView:
        ordered = sorted(events, key=lambda event: event.occurred_at)

        nodes = [
            TimelineNode(
                id=event.id,
                title=event.title,
                timestamp=event.occurred_at.isoformat(),
                emotional_tone=event.emotional_tone.value,
                event_type=event.event_type.value,
                description=event.narrative,
                tags=event.tags,
            )
            for event in ordered
        ]

        emotion_counter = Counter(
            event.emotional_tone.value for event in ordered
        )

        dominant_emotion = (
            emotion_counter.most_common(1)[0][0]
            if emotion_counter
            else "unknown"
        )

        positive = sum(
            1
            for event in ordered
            if event.emotional_tone.value
            in {"calm", "settled", "joyful", "proud"}
        )

        distress = sum(
            1
            for event in ordered
            if event.emotional_tone.value
            in {"anxious", "angry", "withdrawn", "dysregulated"}
        )

        if positive > distress:
            trajectory = "improving"
        elif distress > positive:
            trajectory = "declining"
        else:
            trajectory = "mixed"

        return EmotionalTimelineView(
            child_id=child_id,
            nodes=nodes,
            wellbeing_trajectory=trajectory,
            dominant_emotion=dominant_emotion,
        )
