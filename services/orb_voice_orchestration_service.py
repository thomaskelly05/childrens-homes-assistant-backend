from __future__ import annotations

from typing import Any


VOICE_PROFILES: dict[str, dict[str, str | int]] = {
    "british_female_calm": {"pace": "steady", "brevity": "concise", "warmth": "calm_human", "acknowledgement_ms": 180},
    "calm_reflective": {"pace": "steady", "brevity": "balanced", "warmth": "soft", "acknowledgement_ms": 220},
    "safeguarding_cautious": {"pace": "slow", "brevity": "short", "warmth": "contained", "acknowledgement_ms": 160},
    "nighttime_handover": {"pace": "slow", "brevity": "brief", "warmth": "low_stimulation", "acknowledgement_ms": 220},
    "child_present": {"pace": "steady", "brevity": "brief", "warmth": "privacy_sensitive", "acknowledgement_ms": 140},
    "management_review": {"pace": "steady", "brevity": "concise", "warmth": "professional", "acknowledgement_ms": 180},
    "inspection_preparation": {"pace": "measured", "brevity": "concise", "warmth": "evidence_led", "acknowledgement_ms": 180},
    "general_assistant": {"pace": "steady", "brevity": "concise", "warmth": "friendly", "acknowledgement_ms": 180},
    "emotional_safety": {"pace": "slow", "brevity": "short", "warmth": "grounded", "acknowledgement_ms": 140},
}

ENVIRONMENT_PROFILE = {
    "night_shift": "nighttime_handover",
    "quiet_hours": "nighttime_handover",
    "handover": "nighttime_handover",
    "child_present": "child_present",
    "safeguarding": "safeguarding_cautious",
    "crisis_escalation": "safeguarding_cautious",
    "inspection": "inspection_preparation",
    "inspection_prep": "inspection_preparation",
    "manager_review": "management_review",
    "document_writing": "calm_reflective",
    "reflective_writing": "calm_reflective",
    "emotional_overload": "emotional_safety",
    "mobile": "general_assistant",
    "mobile_quick_support": "general_assistant",
}


class OrbVoiceOrchestrationService:
    def plan(self, *, profile: str = "british_female_calm", realtime_configured: bool = False, context: dict[str, Any] | None = None) -> dict[str, Any]:
        selected = VOICE_PROFILES.get(profile, VOICE_PROFILES["british_female_calm"])
        child_present = bool((context or {}).get("child_present"))
        acknowledgement_ms = int(selected["acknowledgement_ms"])
        return {
            "voice_profile": "british_female_calm",
            "tone_profile": "calm_concise_human",
            "product_name": "ORB powered by IndiCare",
            "emotional_speech_profile": profile,
            "provider_route": "openai_realtime_ephemeral" if realtime_configured else "caption_text_fallback",
            "browser_api_key_exposure": False,
            "raw_audio_logs": False,
            "barge_in": realtime_configured,
            "click_to_interrupt": True,
            "filler_suppression": True,
            "speech_chunk_pacing": selected["pace"],
            "response_brevity": "brief" if child_present else selected["brevity"],
            "acknowledgement_timing_ms": acknowledgement_ms,
            "acknowledgement_style": "soft_pulse_then_natural_pause",
            "micro_acknowledgements": ["Mm-hm.", "I’ve got that.", "One second."],
            "interruption_recovery": "hold_unfinished_thought_and_follow_new_intent",
            "mute_transition": "soft_fade",
            "silence_timeout_ms": 1400 if selected["pace"] == "slow" else 1000,
        }

    def profile_for_environment(self, *, environment_mode: str = "general", emotional_safety: bool = False, reflective: bool = False) -> str:
        if emotional_safety:
            return "emotional_safety"
        if reflective:
            return "calm_reflective"
        return ENVIRONMENT_PROFILE.get(environment_mode, "british_female_calm")


orb_voice_orchestration_service = OrbVoiceOrchestrationService()

