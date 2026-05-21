from __future__ import annotations

from collections import Counter

from life_echo.schemas import EmotionalTone, LifeEchoEvent


class LifeEchoResilienceGrowthEngine:
    """Identifies resilience and emotional growth indicators over time."""

    POSITIVE_TONES = {
        EmotionalTone.calm,
        EmotionalTone.settled,
        EmotionalTone.joyful,
        EmotionalTone.proud,
    }

    @classmethod
    def analyse(cls, events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "growth_detected": False,
                "strengths": [],
            }

        strengths: list[str] = []

        positive_events = [
            event
            for event in events
            if event.emotional_tone in cls.POSITIVE_TONES
        ]

        tags = Counter()
        for event in positive_events:
            tags.update(event.tags)

        if len(positive_events) >= 5:
            strengths.append(
                "Repeated emotionally positive or regulated experiences detected."
            )

        if tags:
            strengths.append(
                f"Common resilience themes include: {', '.join(tag for tag, _ in tags.most_common(3))}."
            )

        return {
            "growth_detected": len(strengths) > 0,
            "positive_event_count": len(positive_events),
            "strengths": strengths,
        }
