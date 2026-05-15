from __future__ import annotations

from typing import Any


DEFAULT_ORB_INTERACTION_PREFERENCES = {
    "preferred_response_length": "concise",
    "caption_preference": "off",
    "voice_caption_mode": "voice_first",
    "reduced_motion": False,
    "high_contrast": False,
    "pacing_preference": "steady",
    "interaction_style": "calm_practical",
    "prefers_brief_answers": True,
    "prefers_step_by_step": False,
}


class OrbInteractionPreferenceService:
    def normalise(self, preferences: dict[str, Any] | None = None) -> dict[str, Any]:
        merged = {**DEFAULT_ORB_INTERACTION_PREFERENCES, **(preferences or {})}
        if merged.get("prefers_brief_answers"):
            merged["preferred_response_length"] = "brief"
        if merged.get("reduced_motion"):
            merged["voice_caption_mode"] = "caption_supported"
        return merged

    def response_instruction(self, preferences: dict[str, Any] | None = None) -> str:
        prefs = self.normalise(preferences)
        if prefs.get("prefers_step_by_step"):
            return "Keep this step-by-step and practical."
        if prefs.get("preferred_response_length") == "brief":
            return "I'll keep this brief."
        return "I'll keep this calm and concise."


orb_interaction_preference_service = OrbInteractionPreferenceService()

