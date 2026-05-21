from __future__ import annotations

from life_echo.schemas import EmotionalTone, LifeEchoEvent, LifeEchoEventType


class LifeEchoEscalationPredictionEngine:
    """Detects potential escalation trajectories from emotional timeline events."""

    DISTRESS_TONES = {
        EmotionalTone.anxious,
        EmotionalTone.angry,
        EmotionalTone.dysregulated,
        EmotionalTone.withdrawn,
    }

    @classmethod
    def predict(cls, events: list[LifeEchoEvent]) -> dict:
        if not events:
            return {
                "prediction": "unknown",
                "confidence": "low",
                "signals": [],
            }

        recent_events = events[-10:]

        distress_events = sum(
            1
            for event in recent_events
            if event.emotional_tone in cls.DISTRESS_TONES
        )

        incident_events = sum(
            1
            for event in recent_events
            if event.event_type
            in {
                LifeEchoEventType.incident,
                LifeEchoEventType.missing_episode,
                LifeEchoEventType.safeguarding,
            }
        )

        signals = []

        if distress_events >= 5:
            signals.append("Sustained distress indicators detected.")

        if incident_events >= 3:
            signals.append("Escalating incident frequency detected.")

        if len(signals) >= 2:
            prediction = "high_risk_of_escalation"
            confidence = "medium"
        elif signals:
            prediction = "monitor_closely"
            confidence = "low"
        else:
            prediction = "stable"
            confidence = "medium"

        return {
            "prediction": prediction,
            "confidence": confidence,
            "signals": signals,
        }
