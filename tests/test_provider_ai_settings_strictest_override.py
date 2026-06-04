from __future__ import annotations

import pytest

from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


def _provider_row(**kwargs):
    base = {
        "provider_id": 1,
        "home_id": None,
        "external_ai_enabled": True,
        "redaction_mode": "strict",
        "allowed_ai_features": ["metadata", "orb_chat_stream", "dictate"],
        "prompt_storage": False,
        "transcript_storage": False,
        "realtime_voice_enabled": True,
        "report_ai_drafting_enabled": True,
        "premium_tts_enabled": False,
        "data_retention_days": 365,
        "local_policy_sources_enabled": True,
    }
    base.update(kwargs)
    return base


def _home_row(**kwargs):
    base = {
        "provider_id": 1,
        "home_id": 5,
        "external_ai_enabled": False,
        "redaction_mode": "strict",
        "allowed_ai_features": ["metadata", "orb_chat_stream"],
        "prompt_storage": False,
        "transcript_storage": False,
        "realtime_voice_enabled": False,
        "report_ai_drafting_enabled": False,
        "premium_tts_enabled": False,
        "data_retention_days": 90,
        "local_policy_sources_enabled": False,
    }
    base.update(kwargs)
    return base


@pytest.fixture()
def _patch_fetch(monkeypatch):
    def _apply(provider_row, home_row):
        monkeypatch.setattr(
            provider_data_intelligence_settings_service,
            "_fetch_settings_rows",
            lambda _pid, _hid: (provider_row, home_row),
        )

    return _apply


def test_home_cannot_enable_external_ai_when_provider_disabled(_patch_fetch):
    _patch_fetch(
        _provider_row(external_ai_enabled=False),
        _home_row(external_ai_enabled=True),
    )
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1, home_id=5)
    assert effective.external_ai_enabled is False


def test_home_can_disable_external_ai_when_provider_enabled(_patch_fetch):
    _patch_fetch(_provider_row(external_ai_enabled=True), _home_row(external_ai_enabled=False))
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1, home_id=5)
    assert effective.external_ai_enabled is False


def test_home_cannot_weaken_redaction(_patch_fetch):
    _patch_fetch(_provider_row(redaction_mode="strict"), _home_row(redaction_mode="off"))
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1, home_id=5)
    assert effective.redaction_mode == "strict"


def test_home_stricter_retention(_patch_fetch):
    _patch_fetch(_provider_row(data_retention_days=365), _home_row(data_retention_days=90))
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1, home_id=5)
    assert effective.data_retention_days == 90


def test_home_cannot_enable_prompt_storage_when_provider_disabled(_patch_fetch):
    _patch_fetch(_provider_row(prompt_storage=False), _home_row(prompt_storage=True))
    effective = provider_data_intelligence_settings_service.get_effective_settings(provider_id=1, home_id=5)
    assert effective.prompt_storage is False
