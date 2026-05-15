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
    "tone_preference": "calm_british",
    "verbosity_preference": "brief",
    "sensory_profile": "ambient",
    "interruption_style": "gentle_repair",
    "concise_mode": True,
    "reflective_mode": False,
    "emotional_safety_preferred": False,
    "prefers_brief_answers": True,
    "prefers_step_by_step": False,
}


class OrbInteractionPreferenceService:
    def normalise(self, preferences: dict[str, Any] | None = None) -> dict[str, Any]:
        merged = {**DEFAULT_ORB_INTERACTION_PREFERENCES, **(preferences or {})}
        if merged.get("prefers_brief_answers") or merged.get("concise_mode"):
            merged["preferred_response_length"] = "brief"
            merged["verbosity_preference"] = "brief"
        if merged.get("reflective_mode"):
            merged["preferred_response_length"] = "balanced"
            merged["verbosity_preference"] = "reflective"
        if merged.get("reduced_motion"):
            merged["voice_caption_mode"] = "caption_supported"
            merged["sensory_profile"] = "reduced_stimulation"
        if merged.get("caption_preference") == "on":
            merged["voice_caption_mode"] = "caption_supported"
        return merged

    def response_instruction(self, preferences: dict[str, Any] | None = None) -> str:
        prefs = self.normalise(preferences)
        if (prefs.get("emotional_safety_preferred") or prefs.get("sensory_profile") == "reduced_stimulation") and prefs.get("prefers_step_by_step"):
            return "I'll keep this short, low stimulation and step-by-step."
        if prefs.get("emotional_safety_preferred") or prefs.get("sensory_profile") == "reduced_stimulation":
            return "I'll keep this short and low stimulation."
        if prefs.get("prefers_step_by_step"):
            return "Keep this step-by-step and practical."
        if prefs.get("reflective_mode"):
            return "I'll keep this reflective, but still practical."
        if prefs.get("preferred_response_length") == "brief":
            return "I'll keep this brief."
        return "I'll keep this calm and concise."


orb_interaction_preference_service = OrbInteractionPreferenceService()

