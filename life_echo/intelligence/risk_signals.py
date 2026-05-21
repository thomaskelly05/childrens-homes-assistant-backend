from __future__ import annotations

from collections import Counter

from life_echo.schemas import EmotionalTone, LifeEchoEvent, LifeEchoEventType


class LifeEchoRiskSignals:
    """Detects emerging safeguarding or placement instability indicators."""

    @staticmethod
    def analyse(events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "risk_level": "unknown",
                "signals": [],
                "summary": "No emotional continuity data available yet.",
            }

        signals: list[str] = []

        incident_total = sum(
            1
            for event in events
            if event.event_type == LifeEchoEventType.incident
        )

        missing_total = sum(
            1
            for event in events
            if event.event_type == LifeEchoEventType.missing_episode
        )

        distress_total = sum(
            1
            for event in events
            if event.emotional_tone
            in {
                EmotionalTone.anxious,
                EmotionalTone.angry,
                EmotionalTone.dysregulated,
                EmotionalTone.withdrawn,
            }
        )

        trigger_counter = Counter()
        for event in events:
            trigger_counter.update(event.triggers)

        if incident_total >= 3:
            signals.append("Repeated incidents detected across the emotional timeline.")

        if missing_total >= 1:
            signals.append("Missing-from-home indicators present within chronology.")

        if distress_total >= 5:
            signals.append(
                "Sustained emotional distress indicators identified over time."
            )

        if trigger_counter:
            trigger, count = trigger_counter.most_common(1)[0]
            if count >= 3:
                signals.append(
                    f"Recurring trigger identified: '{trigger}' ({count} mentions)."
                )

        if len(signals) >= 4:
            risk_level = "high"
        elif len(signals) >= 2:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "risk_level": risk_level,
            "signals": signals,
            "summary": (
                f"LifeEcho identified a current emotional risk profile of '{risk_level}'."
            ),
        }
