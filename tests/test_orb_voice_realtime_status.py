"""ORB Voice realtime beta status scaffolding."""

from __future__ import annotations

from services.orb_voice_realtime_beta_service import (
    realtime_beta_status_payload,
    realtime_beta_token_payload,
)


def test_realtime_status_returns_fallback_when_not_configured(monkeypatch):
    monkeypatch.setattr(
        "services.orb_voice_realtime_beta_service._openai_realtime_configured",
        lambda: False,
    )
    payload = realtime_beta_status_payload()
    assert payload["available"] is False
    assert payload["reason"] == "not_configured"
    assert payload["fallback"] == "voice_v2"
    assert "hybridSpeech" in payload


def test_realtime_token_never_exposes_secrets_when_unconfigured(monkeypatch):
    monkeypatch.setattr(
        "services.orb_voice_realtime_beta_service._openai_realtime_configured",
        lambda: False,
    )
    payload = realtime_beta_token_payload(user_id=42)
    assert payload["ok"] is False
    assert payload["fallback"] == "voice_v2"
    assert "api_key" not in payload


def test_realtime_status_configured_points_to_session_endpoint(monkeypatch):
    monkeypatch.setattr(
        "services.orb_voice_realtime_beta_service._openai_realtime_configured",
        lambda: True,
    )
    payload = realtime_beta_status_payload()
    assert payload["available"] is True
    assert payload["transport"] == "openai_realtime"
    token = realtime_beta_token_payload(user_id=1)
    assert token["ok"] is True
    assert token["useSessionEndpoint"] == "/orb/voice/realtime/session"
