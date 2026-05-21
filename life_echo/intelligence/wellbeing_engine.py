from __future__ import annotations

from collections import Counter

from life_echo.schemas import EmotionalTone, LifeEchoEvent


class LifeEchoWellbeingEngine:
    """Builds a simple wellbeing trajectory from emotional events."""

    POSITIVE = {
        EmotionalTone.calm.value,
        EmotionalTone.settled.value,
        EmotionalTone.joyful.value,
        EmotionalTone.proud.value,
    }

    NEGATIVE = {
        EmotionalTone.anxious.value,
        EmotionalTone.angry.value,
        EmotionalTone.dysregulated.value,
        EmotionalTone.withdrawn.value,
        EmotionalTone.sad.value,
    }

    @classmethod
    def calculate(cls, events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "score": 0,
                "trajectory": "unknown",
                "summary": "No wellbeing data available yet.",
            }

        emotional_counter = Counter(event.emotional_tone.value for event in events)

        positive_total = sum(emotional_counter.get(item, 0) for item in cls.POSITIVE)
        negative_total = sum(emotional_counter.get(item, 0) for item in cls.NEGATIVE)

        score = positive_total - negative_total

        if score >= 3:
            trajectory = "improving"
        elif score <= -3:
            trajectory = "declining"
        else:
            trajectory = "mixed"

        return {
            "score": score,
            "trajectory": trajectory,
            "positive_events": positive_total,
            "distress_events": negative_total,
            "summary": (
                f"Wellbeing trajectory currently appears {trajectory}."
            ),
        }
