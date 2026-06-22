"""ORB Voice realtime beta status scaffolding."""

from __future__ import annotations

from services.orb_voice_realtime_beta_service import (
    realtime_beta_status_payload,
    realtime_beta_token_payload,
)


def test_realtime_status_returns_fallback_when_not_configured(monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "browser_fallback")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    payload = realtime_beta_status_payload()
    assert payload["available"] is False
    assert payload["reason"] == "not_configured"
    assert payload["fallback"] == "voice_v2"
    assert "hybridSpeech" in payload
    assert payload["provider"] == "none"
    assert payload["mode"] == "fallback"


def test_realtime_token_never_exposes_secrets_when_unconfigured(monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "browser_fallback")
    payload = realtime_beta_token_payload(user_id=42)
    assert payload["ok"] is False
    assert payload["fallback"] == "voice_v2"
    assert "api_key" not in payload


def test_realtime_status_configured_points_to_session_endpoint(monkeypatch):
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    payload = realtime_beta_status_payload()
    assert payload["available"] is True
    assert payload["provider"] == "openai"
    assert payload["mode"] == "webrtc"
    assert "super-secret" not in str(payload)
    token = realtime_beta_token_payload(user_id=1)
    assert token["ok"] is True
    assert token["useSessionEndpoint"] == "/orb/voice/realtime/session"
