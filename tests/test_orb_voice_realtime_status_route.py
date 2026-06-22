"""ORB Voice /orb/voice/realtime/status route contract."""

from __future__ import annotations

from services.orb_voice_realtime_beta_service import realtime_beta_status_payload


def test_status_route_payload_never_includes_secrets(monkeypatch):
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "super-secret-key")
    payload = realtime_beta_status_payload()
    serialised = str(payload)
    assert "super-secret-key" not in serialised
    assert "api_key" not in payload
    assert payload["fallback"] == "voice_v2"


def test_status_route_fallback_when_not_configured(monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "browser_fallback")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    payload = realtime_beta_status_payload()
    assert payload["available"] is False
    assert payload["provider"] == "none"
    assert payload["mode"] == "fallback"
    assert payload["reason"] == "not_configured"
