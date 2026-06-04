"""ORB Voice provider orchestration — browser default, optional premium TTS server-side only."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

from schemas.data_protection import DataClassification
from services.ai_privacy_decision_service import AIPrivacyDecisionRequest, ai_privacy_decision_service
from services.orb_voice_profiles import normalise_profile_id, resolve_voice_profile_for_session
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)

logger = logging.getLogger("indicare.orb_voice_provider")


@dataclass
class OrbVoiceSpeakRequest:
    spoken_summary: str
    voice_profile: str | None = None
    expert_depth: str | None = None
    privacy_mode: bool = False
    low_sensory_mode: bool = False
    manual_speak: bool = False
    rate: float = 1.0
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int | None = None


class OrbVoiceProviderService:
    def _env_premium_provider(self) -> str:
        raw = os.getenv("ORB_PREMIUM_TTS_PROVIDER", "disabled").strip().lower()
        if raw in {"browser", "elevenlabs", "disabled"}:
            return raw
        return "disabled"

    def _env_premium_enabled(self) -> bool:
        return os.getenv("ORB_PREMIUM_TTS_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}

    def _elevenlabs_configured(self) -> bool:
        return bool(os.getenv("ELEVENLABS_API_KEY", "").strip())

    def provider_status(
        self,
        *,
        provider_id: int | None = None,
        home_id: int | None = None,
    ) -> dict[str, Any]:
        settings = provider_data_intelligence_settings_service.get_effective_settings(
            provider_id=provider_id,
            home_id=home_id,
        )
        env_provider = self._env_premium_provider()
        env_enabled = self._env_premium_enabled()
        premium_configured = env_enabled and env_provider == "elevenlabs" and self._elevenlabs_configured()
        premium_enabled_by_provider = bool(settings.premium_tts_enabled and settings.external_ai_enabled)
        return {
            "browser_speech": True,
            "premium_configured": premium_configured,
            "premium_enabled_by_provider": premium_enabled_by_provider,
            "premium_available": premium_configured and premium_enabled_by_provider,
            "premium_provider": env_provider if premium_configured else "disabled",
        }

    def _should_use_text_only(self, request: OrbVoiceSpeakRequest, expert_depth: str) -> bool:
        if request.privacy_mode or request.low_sensory_mode:
            return not request.manual_speak
        if expert_depth == "safeguarding_critical":
            return not request.manual_speak
        return False

    def _privacy_allows_external_tts(
        self,
        request: OrbVoiceSpeakRequest,
        expert_depth: str,
    ) -> tuple[bool, str | None]:
        decision = ai_privacy_decision_service.decide(
            AIPrivacyDecisionRequest(
                provider_id=request.provider_id,
                home_id=request.home_id,
                user_id=request.user_id,
                feature="orb_premium_tts",
                data_classification=DataClassification.INTERNAL_OPERATIONAL,
                metadata={"expert_depth": expert_depth, "manual_speak": request.manual_speak},
            )
        )
        if not decision.allowed:
            return False, decision.reason or "external_processing_blocked"
        return True, None

    def speak(self, request: OrbVoiceSpeakRequest) -> dict[str, Any]:
        text = (request.spoken_summary or "").strip()
        if not text:
            raise ValueError("spoken_summary is required")

        profile_id = normalise_profile_id(request.voice_profile)
        resolved = resolve_voice_profile_for_session(profile_id)
        expert_depth = (request.expert_depth or "general_light").strip().lower()
        status = self.provider_status(provider_id=request.provider_id, home_id=request.home_id)

        if self._should_use_text_only(request, expert_depth):
            return {
                "provider": "text_only",
                "text": text,
                "voice_profile": profile_id,
                "selected_voice_profile": profile_id,
                "profile_label": resolved.get("profile_label"),
                "rate": request.rate,
                "audio_url": None,
                "fallback_to_browser": False,
                "message": "Text-only for privacy or safeguarding. Use Speak again when appropriate.",
                "premium_available": status["premium_available"],
            }

        settings = provider_data_intelligence_settings_service.get_effective_settings(
            provider_id=request.provider_id,
            home_id=request.home_id,
        )
        if not settings.transcript_storage and not request.manual_speak:
            logger.info(
                "orb_voice_speak_no_transcript_storage",
                extra={"user_id": request.user_id, "profile_id": profile_id},
            )

        premium_ok = status["premium_available"]
        premium_block_reason: str | None = None
        if premium_ok:
            allowed, premium_block_reason = self._privacy_allows_external_tts(request, expert_depth)
            if allowed:
                audio = self._synthesize_premium(text, profile_id)
                if audio:
                    logger.info(
                        "orb_voice_premium_tts_used",
                        extra={
                            "user_id": request.user_id,
                            "profile_id": profile_id,
                            "expert_depth": expert_depth,
                            "chars": len(text),
                        },
                    )
                    return {
                        "provider": "premium_tts",
                        "text": text,
                        "voice_profile": profile_id,
                        "selected_voice_profile": profile_id,
                        "profile_label": resolved.get("profile_label"),
                        "rate": request.rate,
                        "audio_url": audio,
                        "fallback_to_browser": False,
                        "premium_available": True,
                        "message": "Premium voice audio ready.",
                    }

        return {
            "provider": "browser_speech",
            "text": text,
            "voice_profile": profile_id,
            "selected_voice_profile": profile_id,
            "profile_label": resolved.get("profile_label"),
            "provider_voice": resolved.get("provider_voice"),
            "rate": request.rate,
            "audio_url": None,
            "fallback_to_browser": True,
            "premium_available": status["premium_available"],
            "message": "Use browser Speech Synthesis with the returned text.",
            "block_reason": premium_block_reason,
        }

    def _synthesize_premium(self, text: str, profile_id: str) -> str | None:
        """Reserved hook for ElevenLabs or other server TTS — returns audio URL when wired."""
        provider = self._env_premium_provider()
        if provider != "elevenlabs" or not self._elevenlabs_configured():
            return None
        # Intentionally not calling external APIs in this pass — architecture hook only.
        _ = os.getenv("ELEVENLABS_DEFAULT_VOICE_ID", "").strip() or profile_id
        return None


orb_voice_provider_service = OrbVoiceProviderService()
