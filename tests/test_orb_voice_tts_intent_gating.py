"""NR-1 Phase 2A — ORB Voice TTS intent gating and privacy decision."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_tts_routes import require_orb_voice_premium, router as tts_router
from routers.orb_voice_v2_routes import require_orb_voice_premium as require_v2_premium, router as v2_router
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.orb_voice_tts_intent_service import (
    SETTINGS_PREVIEW_TEST_PHRASE,
    OrbVoiceTtsGateError,
    gate_orb_voice_tts_request,
    validate_tts_source_rules,
)


@pytest.fixture
def tts_client():
    app = FastAPI()
    app.include_router(tts_router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test.com"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_orb_voice_premium] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def v2_client():
    app = FastAPI()
    app.include_router(v2_router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test.com"}

    def fake_db():
        yield MagicMock()

    from db.connection import get_db

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_v2_premium] = fake_auth
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def _allowed_decision() -> AIPrivacyDecision:
    return AIPrivacyDecision(
        allowed=True,
        reason="external_ai_allowed_with_governance",
        mode="external_redacted",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )


def test_validate_tts_source_rejects_unknown_source():
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        validate_tts_source_rules(
            source="typed_chat",
            text="Service check only.",
            context="summary",
            expert_depth="general_light",
        )
    assert exc.value.code == "tts_source_invalid"


def test_gate_requires_source():
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        gate_orb_voice_tts_request(
            source=None,
            text="Service check only.",
            route="tests.gate",
        )
    assert exc.value.code == "tts_source_required"


def test_gate_voice_mode_requires_live_voice_context():
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        validate_tts_source_rules(
            source="voice_mode",
            text="Service check only.",
            context="summary",
            expert_depth="general_light",
        )
    assert exc.value.code == "tts_voice_mode_context_invalid"


def test_gate_settings_preview_rejects_non_preview_text():
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        validate_tts_source_rules(
            source="settings_preview",
            text="Ordinary typed chat should not be spoken.",
            context="summary",
            expert_depth="general_light",
        )
    assert exc.value.code == "tts_settings_preview_invalid"


def test_gate_blocks_safeguarding_critical_voice_mode():
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        validate_tts_source_rules(
            source="voice_mode",
            text="Service check only.",
            context="live_voice",
            expert_depth="safeguarding_critical",
        )
    assert exc.value.code == "tts_safeguarding_blocked"


@patch("services.orb_voice_tts_intent_service.evaluate_external_call", return_value=_allowed_decision())
def test_gate_manual_speak_allowed(_mock_eval):
    gate = gate_orb_voice_tts_request(
        source="manual_speak",
        text="Service check only.",
        context="summary",
        route="tests.gate",
    )
    assert gate.source == "manual_speak"
    assert gate.text_len == len("Service check only.")


@patch("services.orb_voice_tts_intent_service.evaluate_external_call")
def test_gate_blocks_when_privacy_decision_denies(mock_eval):
    mock_eval.return_value = AIPrivacyDecision(
        allowed=False,
        reason="external_ai_disabled",
        mode="local_safe_fallback",
        redaction_mode="strict",
        classification=DataClassification.INTERNAL_OPERATIONAL,
    )
    with pytest.raises(OrbVoiceTtsGateError) as exc:
        gate_orb_voice_tts_request(
            source="manual_speak",
            text="Service check only.",
            route="tests.gate",
        )
    assert exc.value.code == "external_ai_disabled"


def test_tts_post_missing_source_returns_422(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    response = tts_client.post(
        "/orb/voice/tts",
        json={"text": "Service check only.", "voice_style": "calm_therapeutic"},
    )
    assert response.status_code == 422


def test_tts_post_invalid_source_returns_422(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    response = tts_client.post(
        "/orb/voice/tts",
        json={
            "text": "Service check only.",
            "source": "typed_chat",
            "voice_style": "calm_therapeutic",
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["error"] == "tts_source_invalid"


@patch("routers.orb_voice_tts_routes.is_configured", return_value=True)
@patch("routers.orb_voice_tts_routes.synthesize_spoken_reply")
@patch("routers.orb_voice_tts_routes.gate_orb_voice_tts_request")
def test_tts_post_manual_speak_allowed_when_gated(
    mock_gate,
    mock_synth,
    _mock_configured,
    tts_client,
    monkeypatch,
):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    mock_gate.return_value = MagicMock(
        source="manual_speak",
        text_len=19,
        redacted_text="Service check only.",
        redaction_applied=False,
        decision=_allowed_decision(),
    )
    mock_synth.return_value = MagicMock(
        audio_bytes=b"ID3fake",
        content_type="audio/mpeg",
        voice_id="orb_british_female",
        voice_style="calm_therapeutic",
        provider="openai",
        voice_name="nova",
        fallback_used=False,
    )

    response = tts_client.post(
        "/orb/voice/tts",
        json={
            "text": "Service check only.",
            "source": "manual_speak",
            "voice_style": "calm_therapeutic",
        },
    )
    assert response.status_code == 200
    mock_gate.assert_called_once()
    mock_synth.assert_called_once()


@patch("routers.orb_voice_tts_routes.synthesize_spoken_reply")
@patch("routers.orb_voice_tts_routes.gate_orb_voice_tts_request")
def test_tts_post_blocked_by_privacy_skips_provider(
    mock_gate,
    mock_synth,
    tts_client,
    monkeypatch,
):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    mock_gate.side_effect = OrbVoiceTtsGateError(
        "external_ai_disabled",
        "External TTS is blocked by privacy policy.",
        status_code=403,
    )

    response = tts_client.post(
        "/orb/voice/tts",
        json={
            "text": "Service check only.",
            "source": "manual_speak",
            "voice_style": "calm_therapeutic",
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "external_ai_disabled"
    mock_synth.assert_not_called()


@patch("routers.orb_voice_v2_routes.voice_v2_speak", new_callable=AsyncMock)
@patch("routers.orb_voice_v2_routes.gate_orb_voice_tts_request")
def test_v2_speak_voice_mode_allowed(mock_gate, mock_speak, v2_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    mock_gate.return_value = MagicMock(
        source="voice_mode",
        text_len=19,
        redacted_text="Service check only.",
        redaction_applied=False,
        decision=_allowed_decision(),
    )
    mock_speak.return_value = {
        "audio_bytes": b"ID3fake",
        "content_type": "audio/mpeg",
        "provider": "openai",
        "voiceName": "Katherine",
        "fallbackUsed": False,
    }

    response = v2_client.post(
        "/orb/voice/v2/speak",
        json={
            "text": "Service check only.",
            "source": "voice_mode",
            "context": "live_voice",
        },
    )
    assert response.status_code == 200
    mock_gate.assert_called_once()
    mock_speak.assert_called_once()


def test_tts_post_settings_preview_allowed_with_test_phrase(tts_client, monkeypatch):
    monkeypatch.setattr("services.orb_voice_tts_service.ORB_TTS_ENABLED", True)
    monkeypatch.setenv("ORB_TTS_PROVIDER", "openai")
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

    with patch("services.orb_voice_tts_intent_service.evaluate_external_call", return_value=_allowed_decision()), patch(
        "routers.orb_voice_tts_routes.is_configured", return_value=True
    ), patch("services.openai_header_sanitisation.create_sync_openai_client") as mock_client_factory:
        mock_client_factory.return_value = FakeOpenAI()
        response = tts_client.post(
            "/orb/voice/tts",
            json={
                "text": SETTINGS_PREVIEW_TEST_PHRASE,
                "source": "settings_preview",
                "voice_style": "calm_therapeutic",
            },
        )

    assert response.status_code == 200


@patch("routers.orb_voice_tts_routes.is_configured", return_value=True)
def test_tts_gate_logs_exclude_spoken_text(_mock_configured, tts_client, monkeypatch, caplog):
    monkeypatch.setattr("services.orb_voice_tts_service.ORB_TTS_ENABLED", True)
    monkeypatch.setenv("ORB_TTS_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    spoken = "Sensitive safeguarding detail should not appear in logs."

    with patch("services.orb_voice_tts_intent_service.evaluate_external_call", return_value=_allowed_decision()), patch(
        "routers.orb_voice_tts_routes.synthesize_spoken_reply",
        return_value=MagicMock(
            audio_bytes=b"ID3fake",
            content_type="audio/mpeg",
            voice_id="orb_british_female",
            voice_style="calm_therapeutic",
            provider="openai",
            voice_name="nova",
            fallback_used=False,
        ),
    ):
        response = tts_client.post(
            "/orb/voice/tts",
            json={
                "text": spoken,
                "source": "manual_speak",
                "voice_style": "calm_therapeutic",
            },
        )

    assert response.status_code == 200
    combined_logs = "\n".join(record.getMessage() for record in caplog.records)
    assert spoken not in combined_logs


def test_rate_limit_rules_include_tts_routes():
    from services.security_rate_limit_service import RATE_LIMIT_RULES

    orb_voice_rule = next(rule for rule in RATE_LIMIT_RULES if rule.name == "orb_voice")
    assert orb_voice_rule.path_matcher("POST", "/orb/voice/tts")
    assert orb_voice_rule.path_matcher("POST", "/orb/voice/v2/speak")
