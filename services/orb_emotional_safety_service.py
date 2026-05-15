from __future__ import annotations

from typing import Any


TRIGGER_TERMS = ("overwhelmed", "confused", "again", "stuck", "help me", "too much", "can't do this")


class OrbEmotionalSafetyService:
    """Adjusts interaction style without diagnosing or replacing professional action."""

    def evaluate(self, *, text: str = "", signals: dict[str, Any] | None = None) -> dict[str, Any]:
        lower = text.lower()
        data = signals or {}
        triggered = any(term in lower for term in TRIGGER_TERMS) or int(data.get("failed_attempts") or 0) >= 2
        high_intensity = bool(data.get("safeguarding") or data.get("crisis_escalation"))
        active = triggered or high_intensity
        return {
            "active": active,
            "diagnosis_made": False,
            "ui_adjustments": {
                "response_length": "short" if active else "concise",
                "motion": "reduced" if active else "standard",
                "visual_intensity": "soft" if active else "ambient",
                "pacing": "slower" if active else "steady",
                "step_by_step": active,
            },
            "safe_phrase": "I'll keep this short." if active else "I can stay with the task.",
            "grounding_available": True,
            "grounding_forced": False,
        }


orb_emotional_safety_service = OrbEmotionalSafetyService()

