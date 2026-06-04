from __future__ import annotations

import os

import pytest

from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    for key in (
        "AI_EXTERNAL_PROCESSING_ENABLED",
        "AI_REDACTION_MODE",
        "AI_STORE_PROMPTS",
        "AI_STORE_TRANSCRIPTS",
        "ORB_REALTIME_VOICE_ENABLED",
        "REPORT_AI_DRAFTING_ENABLED",
    ):
        monkeypatch.delenv(key, raising=False)


def test_env_defaults_external_ai_off():
    settings = provider_data_intelligence_settings_service.env_defaults()
    assert settings.external_ai_enabled is False
    assert settings.prompt_storage is False
    assert settings.transcript_storage is False
    assert settings.premium_tts_enabled is False
    assert settings.redaction_mode == "strict"


def test_env_defaults_respect_external_ai_flag(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    settings = provider_data_intelligence_settings_service.env_defaults()
    assert settings.external_ai_enabled is True
    assert "report_drafting" in settings.allowed_ai_features


def test_db_failure_fails_safe(monkeypatch):
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("db down")),
    )
    settings = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1)
    assert settings.external_ai_enabled is False
    assert settings.redaction_mode == "strict"
    assert settings.prompt_storage is False
    assert settings.transcript_storage is False


def test_db_failure_allows_env_external_when_explicit(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("db down")),
    )
    settings = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1)
    assert settings.external_ai_enabled is True
    assert settings.redaction_mode == "strict"
    assert settings.prompt_storage is False


def test_provider_db_overrides_env(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    provider_row = {
        "provider_id": 9,
        "home_id": None,
        "external_ai_enabled": True,
        "redaction_mode": "balanced",
        "allowed_ai_features": ["metadata", "orb_chat_stream", "dictate"],
        "prompt_storage": False,
        "transcript_storage": False,
        "realtime_voice_enabled": False,
        "report_ai_drafting_enabled": True,
        "premium_tts_enabled": False,
        "data_retention_days": None,
        "local_policy_sources_enabled": False,
    }
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda _pid, _hid: (provider_row, None),
    )
    bundle = provider_data_intelligence_settings_service.get_effective_bundle(provider_id=9)
    assert bundle.effective.external_ai_enabled is True
    assert bundle.effective.redaction_mode == "balanced"
    assert bundle.sources["external_ai_enabled"] == "provider"


def test_restricted_features_filtered():
    settings = provider_data_intelligence_settings_service.from_record(
        {"allowed_ai_features": ["metadata", "safeguarding_decision", "orb_chat_stream"]}
    )
    assert "safeguarding_decision" not in settings.allowed_ai_features
    assert "metadata" in settings.allowed_ai_features
