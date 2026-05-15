from __future__ import annotations

from typing import Any


class OrbEmotionalStateService:
    def assess(self, *, signals: dict[str, Any] | None = None, recent_failures: int = 0, workflow: str | None = None) -> dict[str, Any]:
        data = signals or {}
        high_intensity = workflow in {"safeguarding", "crisis_escalation", "emotional_overload"} or bool(data.get("high_intensity_workflow"))
        repeated_help = int(data.get("help_requests") or 0) >= 2
        sensory_load = bool(data.get("sensory_overload") or data.get("low_light") or data.get("child_nearby"))
        overload = bool(data.get("overload") or data.get("confusion") or sensory_load or recent_failures >= 2 or repeated_help)
        indicators = []
        if sensory_load:
            indicators.append("reduced_stimulation")
        if recent_failures >= 2:
            indicators.append("recent_retries")
        if repeated_help:
            indicators.append("repeated_help_requests")
        if high_intensity:
            indicators.append("high_intensity_workflow")
        return {
            "overload_detected": overload,
            "high_intensity_workflow": high_intensity,
            "clinical_inference": False,
            "non_clinical_indicators": indicators,
            "recommended_pacing": "slow" if overload or high_intensity else "steady",
            "recommended_response_length": "short" if overload or high_intensity else "concise",
            "cognitive_load": "reduced" if overload else "normal",
            "recommended_caption_density": "simplified" if overload else "standard",
            "safe_phrase": "Let's take this one step at a time." if overload else "I can stay with the task.",
            "memory_phrase": "I'll keep things calmer while this is heavy." if overload else None,
        }


orb_emotional_state_service = OrbEmotionalStateService()

