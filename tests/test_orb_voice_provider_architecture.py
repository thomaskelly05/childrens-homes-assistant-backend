from __future__ import annotations

import pytest

from services.orb_voice_provider_service import OrbVoiceSpeakRequest, orb_voice_provider_service


def test_provider_status_defaults_browser():
    status = orb_voice_provider_service.provider_status(provider_id=1)
    assert status["browser_speech"] is True
    assert status["premium_available"] is False


def test_speak_returns_browser_fallback_without_premium(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.setenv("ORB_PREMIUM_TTS_ENABLED", "false")
    result = orb_voice_provider_service.speak(
        OrbVoiceSpeakRequest(
            spoken_summary="Hello from ORB",
            voice_profile="calm_female",
            expert_depth="general_light",
            provider_id=1,
        )
    )
    assert result["provider"] == "browser_speech"
    assert result["text"] == "Hello from ORB"
    assert result.get("audio_url") is None
    assert result.get("fallback_to_browser") is True


def test_safeguarding_critical_text_only_without_manual_speak():
    result = orb_voice_provider_service.speak(
        OrbVoiceSpeakRequest(
            spoken_summary="Escalation steps are on screen.",
            voice_profile="calm_female",
            expert_depth="safeguarding_critical",
            manual_speak=False,
        )
    )
    assert result["provider"] == "text_only"
    assert result.get("audio_url") is None


def test_frontend_provider_never_exposes_api_key():
    from pathlib import Path

    src = (Path(__file__).resolve().parents[1] / "frontend-next" / "lib/orb/voice/orb-voice-provider.ts").read_text(
        encoding="utf-8"
    )
    assert "ELEVENLABS" not in src
    assert "API_KEY" not in src
