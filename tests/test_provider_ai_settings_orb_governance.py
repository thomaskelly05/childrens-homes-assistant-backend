from __future__ import annotations

import pytest

from services.ai_privacy_decision_service import AIPrivacyDecisionRequest, ai_privacy_decision_service
from services.ai_usage_audit_service import ai_usage_audit_service
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    monkeypatch.setattr(ai_usage_audit_service, "record", lambda _a: None)


def test_orb_governance_reads_effective_settings(monkeypatch):
    monkeypatch.setattr(
        provider_data_intelligence_settings_service,
        "_fetch_settings_rows",
        lambda *_a, **_k: (
            {
                "provider_id": 1,
                "home_id": None,
                "external_ai_enabled": False,
                "redaction_mode": "strict",
                "allowed_ai_features": ["metadata", "orb_chat_stream"],
                "prompt_storage": False,
                "transcript_storage": False,
                "realtime_voice_enabled": False,
                "report_ai_drafting_enabled": False,
                "premium_tts_enabled": False,
                "data_retention_days": None,
                "local_policy_sources_enabled": False,
            },
            None,
        ),
    )
    decision = ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(provider_id=1, home_id=1, feature="orb_chat_stream")
    )
    assert decision.allowed is False
    assert decision.reason == "external_ai_disabled"
