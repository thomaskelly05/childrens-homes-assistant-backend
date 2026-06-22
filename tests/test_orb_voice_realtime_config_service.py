"""Canonical ORB Voice realtime environment resolver."""

from __future__ import annotations

import pytest

from services.orb_voice_realtime_config_service import (
    is_openai_realtime_available,
    public_realtime_status_payload,
    resolve_orb_voice_realtime_config,
)


def test_realtime_disabled_returns_fallback(monkeypatch):
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "false")
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    cfg = resolve_orb_voice_realtime_config()
    assert cfg["enabled"] is False
    assert cfg["mode"] == "fallback"
    assert cfg["reason"] == "disabled"
    status = public_realtime_status_payload()
    assert status["available"] is False
    assert status["provider"] == "none"
    assert status["mode"] == "fallback"


def test_missing_api_key_returns_fallback_reason(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    cfg = resolve_orb_voice_realtime_config()
    assert cfg["reason"] == "missing_api_key"
    assert is_openai_realtime_available() is False
    status = public_realtime_status_payload()
    assert status["available"] is False
    assert status["reason"] == "missing_api_key"


def test_enabled_openai_returns_webrtc_config(monkeypatch):
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_MODEL", "gpt-realtime-test")
    monkeypatch.setenv("ORB_REALTIME_TRANSCRIPTION_MODEL", "whisper-test")
    cfg = resolve_orb_voice_realtime_config()
    assert cfg["enabled"] is True
    assert cfg["provider"] == "openai"
    assert cfg["mode"] == "webrtc"
    assert cfg["model"] == "gpt-realtime-test"
    assert cfg["transcription_model"] == "whisper-test"
    assert is_openai_realtime_available() is True
    status = public_realtime_status_payload()
    assert status["available"] is True
    assert status["provider"] == "openai"
    assert status["mode"] == "webrtc"
    assert status["model"] == "gpt-realtime-test"
    assert status["transcriptionModel"] == "whisper-test"
    assert "api_key" not in status
    assert "OPENAI_API_KEY" not in str(status)
