from __future__ import annotations

from typing import Any


class OrbEmotionalStateService:
    def assess(self, *, signals: dict[str, Any] | None = None, recent_failures: int = 0, workflow: str | None = None) -> dict[str, Any]:
        data = signals or {}
        high_intensity = workflow in {"safeguarding", "crisis_escalation"} or bool(data.get("high_intensity_workflow"))
        repeated_help = int(data.get("help_requests") or 0) >= 2
        overload = bool(data.get("overload") or data.get("confusion") or recent_failures >= 2 or repeated_help)
        return {
            "overload_detected": overload,
            "high_intensity_workflow": high_intensity,
            "clinical_inference": False,
            "recommended_pacing": "slow" if overload or high_intensity else "steady",
            "recommended_response_length": "short" if overload or high_intensity else "concise",
            "safe_phrase": "Let's take this one step at a time." if overload else "I can stay with the task.",
        }


orb_emotional_state_service = OrbEmotionalStateService()

