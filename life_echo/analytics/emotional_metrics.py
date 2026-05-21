from __future__ import annotations

from collections import Counter

from life_echo.schemas import LifeEchoEvent


class LifeEchoEmotionalMetrics:
    """Aggregates emotional continuity metrics for dashboards and reporting."""

    @staticmethod
    def calculate(events: list[LifeEchoEvent]) -> dict:
        emotions = Counter(event.emotional_tone.value for event in events)
        event_types = Counter(event.event_type.value for event in events)

        return {
            "total_events": len(events),
            "emotion_distribution": dict(emotions),
            "event_type_distribution": dict(event_types),
            "dominant_emotion": (
                emotions.most_common(1)[0][0]
                if emotions
                else "unknown"
            ),
        }
