"""NR-1 Phase 2C: governed realtime session egress foundation tests."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from schemas.ai_realtime import (
    FEATURE_ORB_DICTATE_REALTIME_SESSION,
    FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION,
    FEATURE_ORB_REALTIME_VOICE_SESSION,
    AiRealtimeGovernanceContext,
    AiRealtimeSessionRequest,
    RealtimeProviderName,
)
from schemas.data_intelligence import ProviderDataIntelligenceSettings
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_governed_egress import AiGovernedEgress, RealtimeEgressDecision
from services.ai_providers.fake_realtime_governance_test_provider import FakeRealtimeGovernanceTestProvider
from services.ai_realtime_provider_adapter_registry import AiRealtimeProviderAdapterRegistry
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service


def _allowed_decision() -> AIPrivacyDecision:
    return AIPrivacyDecision(
        allowed=True,
        reason="external_ai_allowed_with_governance",
        mode="external_redacted",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )


def _denied_decision(*, reason: str = "external_ai_disabled") -> AIPrivacyDecision:
    return AIPrivacyDecision(
        allowed=False,
        reason=reason,
        mode="local_safe_fallback",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )


def _settings(**overrides) -> ProviderDataIntelligenceSettings:
    base = ProviderDataIntelligenceSettings(
        external_ai_enabled=True,
        realtime_voice_enabled=True,
    )
    return base.model_copy(update=overrides)


def _governance(**overrides) -> AiRealtimeGovernanceContext:
    instructions = overrides.pop("instructions", "Speak calmly and do not store raw child details.")
    base = {
        "feature": FEATURE_ORB_REALTIME_VOICE_SESSION,
        "surface": "orb_voice",
        "route": "/orb/voice/realtime/session",
        "purpose": "orb_voice_conversational",
        "user_id": 1,
        "home_id": 10,
        "provider_id": 5,
        "instructions_len": len(instructions),
        "privacy_decision": _allowed_decision(),
    }
    base.update(overrides)
    return AiRealtimeGovernanceContext(**base)


def _request(**overrides) -> AiRealtimeSessionRequest:
    base = {
        "provider": RealtimeProviderName.MOCK,
        "model": "mock-realtime",
        "instructions": "Speak calmly and do not store raw child details.",
        "purpose": "orb_voice_conversational",
        "voice": "marin",
    }
    base.update(overrides)
    return AiRealtimeSessionRequest(**base)


@pytest.fixture
def fake_realtime_registry(monkeypatch):
    monkeypatch.setenv("AI_ALLOW_TEST_PROVIDER", "true")
    registry = AiRealtimeProviderAdapterRegistry()
    fake = FakeRealtimeGovernanceTestProvider()
    registry.register_test_adapter(RealtimeProviderName.MOCK.value, fake)
    return registry, fake


@pytest.fixture
def governed_realtime_egress(fake_realtime_registry):
    registry, _fake = fake_realtime_registry
    return AiGovernedEgress(realtime_adapter_registry=registry)


@pytest.fixture(autouse=True)
def reset_governance_events():
    indicare_ai_governance_event_service.reset_for_tests()
    yield
    indicare_ai_governance_event_service.reset_for_tests()


@pytest.mark.asyncio
async def test_issue_realtime_session_succeeds_when_governance_allows(
    governed_realtime_egress,
    fake_realtime_registry,
):
    _registry, fake = fake_realtime_registry
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ):
        response, egress = await governed_realtime_egress.issue_realtime_session(
            _request(),
            governance=_governance(),
        )

    assert isinstance(egress, RealtimeEgressDecision)
    assert egress.allowed is True
    assert response.configured is True
    assert response.session is not None
    assert response.session["client_secret"]["value"] == "ek_fake_test"
    assert response.model == "mock-realtime"
    assert response.provider == RealtimeProviderName.MOCK
    assert egress.instructions_len == len(_request().instructions)
    assert len(fake.session_calls) == 1


@pytest.mark.asyncio
async def test_issue_realtime_session_blocked_when_external_ai_disabled(
    governed_realtime_egress,
    fake_realtime_registry,
):
    _registry, fake = fake_realtime_registry
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ):
        response, egress = await governed_realtime_egress.issue_realtime_session(
            _request(),
            governance=_governance(privacy_decision=_denied_decision()),
        )

    assert egress.allowed is False
    assert egress.blocked_reason == "external_ai_disabled"
    assert response.fallback_text_mode is True
    assert fake.session_calls == []
    events = indicare_ai_governance_event_service.get_recent_events()
    assert len(events) == 1
    assert events[0].metadata.get("allowed") is False
    assert events[0].metadata.get("blocked_reason") == "external_ai_disabled"
    assert "Speak calmly" not in json.dumps(events[0].metadata or {})


@pytest.mark.asyncio
async def test_issue_realtime_session_blocked_when_realtime_voice_disabled(
    governed_realtime_egress,
    fake_realtime_registry,
):
    _registry, fake = fake_realtime_registry
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(realtime_voice_enabled=False),
    ):
        response, egress = await governed_realtime_egress.issue_realtime_session(
            _request(),
            governance=_governance(),
        )

    assert egress.allowed is False
    assert egress.blocked_reason == "realtime_voice_disabled"
    assert response.fallback_text_mode is True
    assert fake.session_calls == []
    events = indicare_ai_governance_event_service.get_recent_events()
    assert events[0].metadata.get("blocked_reason") == "realtime_voice_disabled"


@pytest.mark.asyncio
async def test_issue_realtime_session_audit_event_contains_safe_metadata_only(
    governed_realtime_egress,
):
    secret_instructions = "SECRET CHILD CONTEXT MUST NOT PERSIST"
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ):
        await governed_realtime_egress.issue_realtime_session(
            _request(instructions=secret_instructions),
            governance=_governance(
                feature=FEATURE_ORB_DICTATE_REALTIME_SESSION,
                surface="orb_dictate",
                purpose="orb_dictate_transcription",
                instructions=secret_instructions,
            ),
        )

    events = indicare_ai_governance_event_service.get_recent_events()
    assert len(events) == 1
    metadata = events[0].metadata or {}
    assert metadata["feature"] == FEATURE_ORB_DICTATE_REALTIME_SESSION
    assert metadata["governance_surface"] == "orb_dictate"
    assert events[0].surface == "standalone_orb"
    assert metadata["classification"] == "external_ai_realtime_session"
    assert metadata["modality"] == "realtime_session"
    assert metadata["instructions_len"] == len(secret_instructions)
    assert "SECRET CHILD CONTEXT" not in json.dumps(metadata)
    assert "instructions" not in metadata
    assert "client_secret" not in metadata
    assert "transcript" not in metadata
    assert "audio" not in metadata


@pytest.mark.asyncio
async def test_issue_realtime_session_provider_errors_are_sanitised(
    governed_realtime_egress,
    fake_realtime_registry,
):
    _registry, fake = fake_realtime_registry
    fake.raise_on_issue = RuntimeError("Bearer sk-live-secret leaked in provider error")
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ):
        response, egress = await governed_realtime_egress.issue_realtime_session(
            _request(),
            governance=_governance(),
        )

    assert egress.allowed is False
    assert "sk-live-secret" not in (response.error or "")
    assert "Bearer" not in (response.error or "")
    events = indicare_ai_governance_event_service.get_recent_events()
    assert "sk-live-secret" not in json.dumps(events[0].metadata or {})


@pytest.mark.asyncio
async def test_issue_realtime_session_redacts_instructions_before_provider_call(
    governed_realtime_egress,
    fake_realtime_registry,
):
    _registry, fake = fake_realtime_registry
    raw = "Contact parent@example.com about the child."
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ), patch(
        "services.ai_governed_egress.redact_plain_text",
        return_value=("Contact [REDACTED_EMAIL] about the child.", True),
    ):
        await governed_realtime_egress.issue_realtime_session(
            _request(instructions=raw),
            governance=_governance(instructions=raw),
        )

    assert fake.session_calls
    assert fake.session_calls[0].instructions == "Contact [REDACTED_EMAIL] about the child."
    assert raw not in fake.session_calls[0].instructions


@pytest.mark.asyncio
async def test_transcription_session_feature_allowed_when_realtime_voice_enabled(
    governed_realtime_egress,
):
    with patch(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        return_value=_settings(),
    ):
        response, egress = await governed_realtime_egress.issue_realtime_session(
            _request(
                purpose="orb_voice_transcription",
                voice=None,
                transcription_only=True,
            ),
            governance=_governance(
                feature=FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION,
                surface="orb_voice_transcribe",
                purpose="orb_voice_transcription",
            ),
        )

    assert egress.allowed is True
    assert response.configured is True


@pytest.mark.asyncio
async def test_missing_governance_context_rejected(governed_realtime_egress):
    with pytest.raises(ValueError, match="realtime_governance_context_required"):
        await governed_realtime_egress.issue_realtime_session(_request(), governance=None)
