from __future__ import annotations

from typing import Any


VOICE_PROFILES = {
    "calm_reflective": {"pace": "steady", "brevity": "concise", "warmth": "soft"},
    "safeguarding_cautious": {"pace": "slow", "brevity": "short", "warmth": "contained"},
    "nighttime_handover": {"pace": "slow", "brevity": "brief", "warmth": "low_stimulation"},
    "child_present": {"pace": "steady", "brevity": "brief", "warmth": "privacy_sensitive"},
    "management_review": {"pace": "steady", "brevity": "concise", "warmth": "professional"},
    "inspection_preparation": {"pace": "measured", "brevity": "concise", "warmth": "evidence_led"},
    "general_assistant": {"pace": "steady", "brevity": "concise", "warmth": "friendly"},
    "emotional_safety": {"pace": "slow", "brevity": "short", "warmth": "grounded"},
}


class OrbVoiceOrchestrationService:
    def plan(self, *, profile: str = "calm_reflective", realtime_configured: bool = False, context: dict[str, Any] | None = None) -> dict[str, Any]:
        selected = VOICE_PROFILES.get(profile, VOICE_PROFILES["calm_reflective"])
        child_present = bool((context or {}).get("child_present"))
        return {
            "voice_profile": "british_female_calm",
            "emotional_speech_profile": profile,
            "provider_route": "openai_realtime_ephemeral" if realtime_configured else "caption_text_fallback",
            "browser_api_key_exposure": False,
            "raw_audio_logs": False,
            "barge_in": realtime_configured,
            "click_to_interrupt": True,
            "filler_suppression": True,
            "speech_chunk_pacing": selected["pace"],
            "response_brevity": "brief" if child_present else selected["brevity"],
            "acknowledgement_timing_ms": 350,
            "silence_timeout_ms": 1400 if selected["pace"] == "slow" else 1000,
        }


orb_voice_orchestration_service = OrbVoiceOrchestrationService()

