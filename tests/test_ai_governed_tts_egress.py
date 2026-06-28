"""Tests for governed TTS egress (NR-1 Phase 2B)."""

from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from schemas.ai_tts import (
    FEATURE_ORB_PREMIUM_TTS,
    AiTtsGovernanceContext,
    AiTtsSynthesisRequest,
    AiTtsSynthesisResponse,
    TtsProviderName,
)
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_governed_egress import AiGovernedEgress, TtsEgressDecision
from services.ai_providers.fake_tts_governance_test_provider import FakeTtsGovernanceTestProvider
from services.ai_tts_provider_adapter_registry import AiTtsProviderAdapterRegistry


def _allowed_decision() -> AIPrivacyDecision:
    return AIPrivacyDecision(
        allowed=True,
        reason="external_ai_allowed_with_governance",
        mode="external_redacted",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )


def _denied_decision() -> AIPrivacyDecision:
    return AIPrivacyDecision(
        allowed=False,
        reason="external_ai_disabled",
        mode="local_safe_fallback",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )


def _governance(**overrides) -> AiTtsGovernanceContext:
    base = AiTtsGovernanceContext(
        feature=FEATURE_ORB_PREMIUM_TTS,
        surface="orb_residential",
        route="tests.test_ai_governed_tts_egress",
        source="manual_speak",
        text_len=19,
        redaction_applied=False,
        privacy_decision=_allowed_decision(),
    )
    return base.model_copy(update=overrides)


def _request(**overrides) -> AiTtsSynthesisRequest:
    base = {
        "text": "Service check only.",
        "provider": TtsProviderName.OPENAI,
        "model": "tts-1",
        "voice_id": "katherine",
        "voice_style": "calm_therapeutic",
        "audio_format": "mp3",
        "openai_voice": "nova",
    }
    base.update(overrides)
    return AiTtsSynthesisRequest(**base)


@pytest.fixture
def fake_tts_registry(monkeypatch):
    monkeypatch.setenv("AI_ALLOW_TEST_PROVIDER", "true")
    registry = AiTtsProviderAdapterRegistry()
    fake = FakeTtsGovernanceTestProvider()
    registry.register_test_adapter(TtsProviderName.MOCK.value, fake)
    registry.register_test_adapter("openai", fake)
    registry.register_test_adapter("elevenlabs", fake)
    return registry, fake


@pytest.fixture
def governed_tts_egress(fake_tts_registry):
    registry, _fake = fake_tts_registry
    return AiGovernedEgress(tts_adapter_registry=registry)


@pytest.mark.asyncio
async def test_openai_tts_goes_through_governed_egress(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    request = _request(provider=TtsProviderName.MOCK, model="mock-tts")
    response, egress = await governed_tts_egress.synthesize_speech(
        request,
        governance=_governance(),
    )
    assert response.audio_bytes == b"FAKEAUDIO"
    assert egress.allowed is True
    assert len(fake.synthesis_calls) == 1
    assert fake.synthesis_calls[0].text == "Service check only."


@pytest.mark.asyncio
async def test_elevenlabs_tts_goes_through_governed_egress(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    request = _request(
        provider=TtsProviderName.MOCK,
        model="mock-tts",
        elevenlabs_voice_id="voice-abc",
    )
    response, egress = await governed_tts_egress.synthesize_speech(
        request,
        governance=_governance(),
    )
    assert response.audio_bytes == b"FAKEAUDIO"
    assert egress.allowed is True
    assert fake.synthesis_calls[0].provider == TtsProviderName.MOCK


@pytest.mark.asyncio
async def test_missing_governance_context_rejected(governed_tts_egress):
    with pytest.raises(ValueError, match="tts_governance_context_required"):
        await governed_tts_egress.synthesize_speech(_request(), governance=None)


@pytest.mark.asyncio
async def test_privacy_denied_blocks_adapter(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    response, egress = await governed_tts_egress.synthesize_speech(
        _request(provider=TtsProviderName.MOCK, model="mock-tts"),
        governance=_governance(privacy_decision=_denied_decision()),
    )
    assert not response.audio_bytes
    assert egress.governance_blocked is True
    assert fake.synthesis_calls == []


@pytest.mark.asyncio
async def test_redacted_text_reaches_adapter(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    redacted = "[REDACTED] check only."
    await governed_tts_egress.synthesize_speech(
        _request(text=redacted, provider=TtsProviderName.MOCK, model="mock-tts"),
        governance=_governance(text_len=len(redacted), redaction_applied=True),
    )
    assert fake.synthesis_calls[0].text == redacted


@pytest.mark.asyncio
async def test_provider_errors_are_safe(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    fake.raise_on_synthesize = RuntimeError("sk-testsecret123 should not leak")
    response, egress = await governed_tts_egress.synthesize_speech(
        _request(provider=TtsProviderName.MOCK, model="mock-tts"),
        governance=_governance(),
    )
    assert not response.audio_bytes
    assert "sk-testsecret123" not in (response.error or "")
    assert egress.allowed is False


@pytest.mark.asyncio
async def test_invalid_feature_blocked(governed_tts_egress, fake_tts_registry):
    _registry, fake = fake_tts_registry
    bad_governance = AiTtsGovernanceContext.model_construct(
        feature="orb_model_router_chat",
        surface="orb_residential",
        route="tests.test_ai_governed_tts_egress",
        source="manual_speak",
        text_len=19,
        redaction_applied=False,
        privacy_decision=_allowed_decision(),
    )
    response, egress = await governed_tts_egress.synthesize_speech(
        _request(provider=TtsProviderName.MOCK, model="mock-tts"),
        governance=bad_governance,
    )
    assert not response.audio_bytes
    assert egress.governance_blocked is True
    assert egress.blocked_reason == "tts_feature_invalid"
    assert fake.synthesis_calls == []


@pytest.mark.asyncio
async def test_governed_tts_logs_exclude_spoken_text(governed_tts_egress, fake_tts_registry, caplog):
    _registry, fake = fake_tts_registry
    spoken = "Sensitive safeguarding detail should not appear in logs."
    await governed_tts_egress.synthesize_speech(
        _request(text=spoken, provider=TtsProviderName.MOCK, model="mock-tts"),
        governance=_governance(text_len=len(spoken)),
    )
    combined = "\n".join(record.getMessage() for record in caplog.records)
    assert spoken not in combined
    assert str(len(spoken)) in combined or "text_len" in combined


@pytest.mark.asyncio
async def test_elevenlabs_401_falls_back_to_openai_via_orchestration(monkeypatch):
    from services.orb_voice_tts_intent_service import build_tts_governance_context, gate_orb_voice_tts_request
    from services.orb_voice_tts_service import synthesize_spoken_reply

    with patch(
        "services.orb_voice_tts_intent_service.evaluate_external_call",
        return_value=_allowed_decision(),
    ):
        gate = gate_orb_voice_tts_request(
            source="manual_speak",
            text="Service check only.",
            route="tests.fallback",
        )
    governance = build_tts_governance_context(
        gate=gate,
        provider_id=None,
        home_id=None,
        user_id=1,
        route="tests.fallback",
    )

    calls: list[str] = []

    async def fake_egress(request, governance=None):
        calls.append(request.provider.value)
        if request.provider == TtsProviderName.ELEVENLABS:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type="audio/mpeg",
                provider=TtsProviderName.ELEVENLABS,
                model=request.model,
                voice_id=request.voice_id,
                latency_ms=5,
                audio_bytes_len=0,
                error="auth failed",
                error_code="auth_failed",
            ), TtsEgressDecision(allowed=False, blocked_reason="auth_failed")
        return AiTtsSynthesisResponse(
            audio_bytes=b"ID3openai",
            content_type="audio/mpeg",
            provider=TtsProviderName.OPENAI,
            model=request.model,
            voice_id=request.voice_id,
            latency_ms=5,
            audio_bytes_len=9,
        ), TtsEgressDecision(allowed=True)

    with patch.dict(
        os.environ,
        {
            "ORB_TTS_ENABLED": "true",
            "ORB_TTS_PROVIDER": "elevenlabs",
            "ORB_TTS_FALLBACK_PROVIDER": "openai",
            "ELEVENLABS_API_KEY": "test-key",
            "ELEVENLABS_VOICE_ID": "voice-abc",
            "OPENAI_API_KEY": "test-key",
        },
        clear=False,
    ), patch(
        "services.orb_voice_tts_service.ai_governed_egress.synthesize_speech",
        side_effect=fake_egress,
    ), patch(
        "services.orb_voice_tts_service._provider_configured",
        return_value=True,
    ), patch(
        "services.orb_voice_tts_service.ORB_TTS_ENABLED",
        True,
    ), patch(
        "services.orb_voice_tts_service._resolve_primary_tts_provider",
        return_value="elevenlabs",
    ), patch(
        "services.orb_voice_tts_service._fallback_provider",
        return_value="openai",
    ):
        result = await synthesize_spoken_reply(
            text=gate.redacted_text,
            governance=governance,
            voice_id="katherine",
            context="live_voice",
        )

    assert calls == ["elevenlabs", "openai"]
    assert result.provider == "openai"
    assert result.fallback_used is True


@pytest.mark.asyncio
async def test_elevenlabs_adapter_calls_provider_host(monkeypatch):
    from schemas.ai_tts import AiTtsSynthesisRequest, TtsProviderName
    from services.ai_providers.elevenlabs_tts_provider import elevenlabs_tts_provider

    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")

    class FakeResponse:
        content = b"ID3eleven-mp3"
        status_code = 200

        def raise_for_status(self):
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, **kwargs):
            assert "api.elevenlabs.io" in url
            assert kwargs["headers"]["xi-api-key"] == "test-eleven-key"
            assert kwargs["json"]["text"] == "Hello from ORB."
            return FakeResponse()

    with patch("services.ai_providers.elevenlabs_tts_provider.httpx.Client", FakeClient):
        response = elevenlabs_tts_provider.synthesize_speech(
            AiTtsSynthesisRequest(
                text="Hello from ORB.",
                provider=TtsProviderName.ELEVENLABS,
                model="eleven_multilingual_v2",
                voice_id="katherine",
                voice_style="calm_therapeutic",
                elevenlabs_voice_id="voice-abc123",
            )
        )

    assert response.audio_bytes.startswith(b"ID3")
    assert response.error is None


@pytest.mark.asyncio
async def test_openai_adapter_uses_sanitised_client(monkeypatch):
    from schemas.ai_tts import AiTtsSynthesisRequest, TtsProviderName
    from services.ai_providers.openai_tts_provider import openai_tts_provider

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    class FakeSpeech:
        def create(self, **kwargs):
            class FakeResponse:
                content = b"ID3fake-mp3"

            return FakeResponse()

    class FakeAudio:
        speech = FakeSpeech()

    class FakeOpenAI:
        def __init__(self, *args, **kwargs):
            self.audio = FakeAudio()

    with patch(
        "services.openai_header_sanitisation.create_sync_openai_client",
        return_value=FakeOpenAI(),
    ) as mock_factory:
        response = openai_tts_provider.synthesize_speech(
            AiTtsSynthesisRequest(
                text="Hello from ORB.",
                provider=TtsProviderName.OPENAI,
                model="tts-1",
                voice_id="katherine",
                voice_style="calm_therapeutic",
                openai_voice="nova",
            )
        )

    mock_factory.assert_called_once()
    assert response.audio_bytes.startswith(b"ID3")
    assert response.error is None


@pytest.mark.asyncio
async def test_fallback_does_not_bypass_governance(monkeypatch):
    from services.orb_voice_tts_intent_service import build_tts_governance_context, gate_orb_voice_tts_request
    from services.orb_voice_tts_service import synthesize_spoken_reply

    with patch(
        "services.orb_voice_tts_intent_service.evaluate_external_call",
        return_value=_allowed_decision(),
    ):
        gate = gate_orb_voice_tts_request(
            source="manual_speak",
            text="Service check only.",
            route="tests.fallback_governance",
        )
    governance = build_tts_governance_context(
        gate=gate,
        provider_id=None,
        home_id=None,
        user_id=1,
        route="tests.fallback_governance",
    )
    governance_calls = 0

    async def fake_egress(request, governance=None):
        nonlocal governance_calls
        governance_calls += 1
        assert governance is not None
        assert governance.source == "manual_speak"
        if request.provider == TtsProviderName.ELEVENLABS:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type="audio/mpeg",
                provider=TtsProviderName.ELEVENLABS,
                model=request.model,
                voice_id=request.voice_id,
                latency_ms=5,
                audio_bytes_len=0,
                error_code="auth_failed",
                error="failed",
            ), TtsEgressDecision(allowed=False)
        return AiTtsSynthesisResponse(
            audio_bytes=b"ok",
            content_type="audio/mpeg",
            provider=TtsProviderName.OPENAI,
            model=request.model,
            voice_id=request.voice_id,
            latency_ms=5,
            audio_bytes_len=2,
        ), TtsEgressDecision(allowed=True)

    with patch.dict(
        os.environ,
        {
            "ORB_TTS_ENABLED": "true",
            "ORB_TTS_PROVIDER": "elevenlabs",
            "ORB_TTS_FALLBACK_PROVIDER": "openai",
            "ELEVENLABS_API_KEY": "k",
            "ELEVENLABS_VOICE_ID": "v",
            "OPENAI_API_KEY": "k",
        },
        clear=False,
    ), patch(
        "services.orb_voice_tts_service.ai_governed_egress.synthesize_speech",
        side_effect=fake_egress,
    ), patch("services.orb_voice_tts_service._provider_configured", return_value=True), patch(
        "services.orb_voice_tts_service.ORB_TTS_ENABLED",
        True,
    ), patch(
        "services.orb_voice_tts_service._resolve_primary_tts_provider",
        return_value="elevenlabs",
    ), patch(
        "services.orb_voice_tts_service._fallback_provider",
        return_value="openai",
    ):
        await synthesize_spoken_reply(text=gate.redacted_text, governance=governance)

    assert governance_calls == 2

