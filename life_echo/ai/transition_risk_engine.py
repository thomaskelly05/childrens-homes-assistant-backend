from __future__ import annotations

from life_echo.schemas import EmotionalTone, LifeEchoEvent, LifeEchoEventType


class LifeEchoTransitionRiskEngine:
    """Assesses emotional risk around placement or life transitions."""

    @staticmethod
    def analyse(events: list[LifeEchoEvent]) -> dict:
        transition_events = [
            event
            for event in events
            if event.event_type == LifeEchoEventType.transition
        ]

        if not transition_events:
            return {
                "transition_risk": "unknown",
                "summary": "No transition-related events identified.",
            }

        distress_count = sum(
            1
            for event in transition_events
            if event.emotional_tone
            in {
                EmotionalTone.anxious,
                EmotionalTone.withdrawn,
                EmotionalTone.dysregulated,
            }
        )

        if distress_count >= 3:
            level = "high"
        elif distress_count >= 1:
            level = "medium"
        else:
            level = "low"

        return {
            "transition_risk": level,
            "transition_event_count": len(transition_events),
            "distress_related_events": distress_count,
            "summary": (
                f"Transition-related emotional risk currently appears {level}."
            ),
        }
