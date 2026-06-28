"""NR-1 Phase 2C: ORB Voice realtime session route governance tests."""

from __future__ import annotations

import json
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_residential_routes import require_orb_voice_premium, router
from schemas.ai_realtime import (
    FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION,
    FEATURE_ORB_REALTIME_VOICE_SESSION,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from services.ai_governed_egress import RealtimeEgressDecision
from schemas.data_intelligence import ProviderDataIntelligenceSettings
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service
from services.orb_voice_realtime_governance_service import (
    ORB_VOICE_PRODUCT_AREA,
    build_orb_voice_realtime_governance_context,
)
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store


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


def _allowed_egress() -> RealtimeEgressDecision:
    return RealtimeEgressDecision(allowed=True)


def _blocked_egress(*, reason: str) -> RealtimeEgressDecision:
    return RealtimeEgressDecision(
        allowed=False,
        blocked_reason=reason,
        governance_blocked=True,
    )


def _success_response() -> AiRealtimeSessionResponse:
    return AiRealtimeSessionResponse(
        configured=True,
        provider=RealtimeProviderName.OPENAI,
        model="gpt-realtime",
        session={
            "id": "sess_rt",
            "client_secret": {"value": "ek_rt", "expires_at": 999},
        },
        voice="coral",
        fallback_text_mode=False,
    )


@pytest.fixture
def voice_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "admin", "email": "admin@test", "provider_id": 5, "home_id": 10}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_orb_product_bootstrap_access] = fake_auth
    app.dependency_overrides[require_orb_voice_premium] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    orb_voice_realtime_session_store._sessions.clear()


@pytest.fixture(autouse=True)
def reset_governance_events():
    indicare_ai_governance_event_service.reset_for_tests()
    yield
    indicare_ai_governance_event_service.reset_for_tests()


@pytest.fixture
def openai_env(monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")


def test_build_orb_voice_realtime_governance_context_maps_schema_values():
    instructions = "Speak calmly for ORB Voice."
    governance = build_orb_voice_realtime_governance_context(
        feature=FEATURE_ORB_REALTIME_VOICE_SESSION,
        purpose="orb_voice_conversational",
        route="POST /orb/voice/realtime/session",
        instructions=instructions,
        current_user={"id": 1, "provider_id": 5, "home_id": 10},
        orb_session_id="openai_abc123",
        model="gpt-realtime",
    )
    assert governance.surface == "standalone_orb"
    assert governance.feature == FEATURE_ORB_REALTIME_VOICE_SESSION
    assert governance.purpose == "orb_voice_conversational"
    assert governance.user_id == 1
    assert governance.provider_id == 5
    assert governance.home_id == 10
    assert governance.instructions_len == len(instructions)
    assert governance.metadata["product_area"] == ORB_VOICE_PRODUCT_AREA
    assert governance.metadata["product_access"] == "voice_workflows"
    assert governance.metadata["ai_provider"] == "openai"
    assert governance.metadata["ai_model"] == "gpt-realtime"


def test_orb_voice_realtime_session_uses_governed_egress(voice_client, openai_env, monkeypatch):
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_voice_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    response = voice_client.post(
        "/orb/voice/realtime/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai_realtime"
    assert data["openai_session"]["client_secret"]["value"] == "ek_rt"
    issue_mock.assert_awaited_once()
    _request, kwargs = issue_mock.await_args
    assert kwargs["governance"].feature == FEATURE_ORB_REALTIME_VOICE_SESSION
    assert kwargs["governance"].route == "POST /orb/voice/session"


def test_orb_voice_session_uses_governed_egress(voice_client, openai_env, monkeypatch):
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_voice_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female", "transport": "auto"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai_realtime"
    assert data["openai_session"]["client_secret"]["value"] == "ek_rt"
    issue_mock.assert_awaited_once()
    assert issue_mock.await_args.kwargs["governance"].route == "POST /orb/voice/session"


def test_orb_voice_transcribe_realtime_session_uses_governed_egress(voice_client, openai_env, monkeypatch):
    issue_mock = AsyncMock(
        return_value=(
            AiRealtimeSessionResponse(
                configured=True,
                provider=RealtimeProviderName.OPENAI,
                model="gpt-realtime",
                session={"client_secret": {"value": "ek_tx", "expires_at": 999}},
                fallback_text_mode=False,
            ),
            _allowed_egress(),
        )
    )
    monkeypatch.setattr(
        "services.orb_voice_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    response = voice_client.post("/orb/voice/transcribe/realtime/session")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True
    assert data["openai_session"]["client_secret"]["value"] == "ek_tx"
    issue_mock.assert_awaited_once()
    governance = issue_mock.await_args.kwargs["governance"]
    assert governance.feature == FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION
    assert governance.purpose == "orb_voice_transcription"
    assert governance.route == "POST /orb/voice/transcribe/realtime/session"
    assert issue_mock.await_args.args[0].transcription_only is True


def test_allowed_governance_preserves_legacy_response_shape(voice_client, openai_env, monkeypatch):
    monkeypatch.setattr(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        lambda **_kwargs: _settings(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.evaluate_external_call",
        lambda **_kwargs: _allowed_decision(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.ai_governed_egress._realtime_registry.get",
        lambda _provider: type(
            "Adapter",
            (),
            {
                "is_available": staticmethod(lambda: True),
                "issue_session": staticmethod(
                    AsyncMock(return_value=_success_response())
                ),
            },
        )(),
    )
    response = voice_client.post(
        "/orb/voice/realtime/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai_realtime"
    assert data["status"] == "ready"
    assert data["openai_session"]["client_secret"]["value"] == "ek_rt"
    assert data["selected_voice_profile"] == "orb_british_female"
    assert "session_id" in data


def test_blocked_external_ai_returns_no_client_secret(voice_client, openai_env, monkeypatch):
    adapter_called = {"value": False}

    class _Adapter:
        def is_available(self):
            return True

        async def issue_session(self, _request):
            adapter_called["value"] = True
            return _success_response()

    monkeypatch.setattr(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        lambda **_kwargs: _settings(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.evaluate_external_call",
        lambda **_kwargs: _denied_decision(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.ai_governed_egress._realtime_registry.get",
        lambda _provider: _Adapter(),
    )
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "browser_fallback"
    assert data.get("openai_session") is None
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_blocked_realtime_voice_setting_returns_no_client_secret(voice_client, openai_env, monkeypatch):
    adapter_called = {"value": False}

    class _Adapter:
        def is_available(self):
            return True

        async def issue_session(self, _request):
            adapter_called["value"] = True
            return _success_response()

    monkeypatch.setattr(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        lambda **_kwargs: _settings(realtime_voice_enabled=False),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.evaluate_external_call",
        lambda **_kwargs: _allowed_decision(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.ai_governed_egress._realtime_registry.get",
        lambda _provider: _Adapter(),
    )
    response = voice_client.post(
        "/orb/voice/realtime/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "browser_fallback"
    assert data.get("openai_session") is None
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_transcribe_realtime_blocked_external_ai_returns_no_client_secret(voice_client, openai_env, monkeypatch):
    adapter_called = {"value": False}

    class _Adapter:
        def is_available(self):
            return True

        async def issue_session(self, _request):
            adapter_called["value"] = True
            return _success_response()

    monkeypatch.setattr(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        lambda **_kwargs: _settings(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.evaluate_external_call",
        lambda **_kwargs: _denied_decision(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.ai_governed_egress._realtime_registry.get",
        lambda _provider: _Adapter(),
    )
    response = voice_client.post("/orb/voice/transcribe/realtime/session")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is False
    assert data.get("openai_session") is None
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_audit_event_contains_safe_metadata_only(voice_client, openai_env, monkeypatch):
    secret_instructions = "SECRET CHILD CONTEXT MUST NOT PERSIST IN AUDIT"
    captured_instructions: list[str] = []

    class _Adapter:
        def is_available(self):
            return True

        async def issue_session(self, request):
            captured_instructions.append(request.instructions)
            return _success_response()

    monkeypatch.setattr(
        "services.ai_governed_egress.provider_data_intelligence_settings_service.get_effective_settings",
        lambda **_kwargs: _settings(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.evaluate_external_call",
        lambda **_kwargs: _allowed_decision(),
    )
    monkeypatch.setattr(
        "services.ai_governed_egress.ai_governed_egress._realtime_registry.get",
        lambda _provider: _Adapter(),
    )
    with patch(
        "services.orb_voice_profiles.build_residential_voice_instructions",
        return_value=secret_instructions,
    ):
        voice_client.post(
            "/orb/voice/session",
            json={"mode": "conversational", "voice_id": "orb_british_female"},
        )

    events = indicare_ai_governance_event_service.get_recent_events()
    assert len(events) >= 1
    metadata = events[0].metadata or {}
    assert metadata["feature"] == FEATURE_ORB_REALTIME_VOICE_SESSION
    assert metadata["classification"] == "external_ai_realtime_session"
    assert metadata["modality"] == "realtime_session"
    assert "SECRET CHILD CONTEXT" not in json.dumps(metadata)
    assert "instructions" not in metadata
    assert "client_secret" not in metadata
    assert captured_instructions
    assert secret_instructions not in json.dumps(metadata)


def test_raw_instructions_not_logged(voice_client, openai_env, monkeypatch, caplog):
    import logging

    secret_instructions = "RAW INSTRUCTIONS MUST NOT APPEAR IN LOGS"
    caplog.set_level(logging.INFO)

    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_voice_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    with patch(
        "services.orb_voice_profiles.build_residential_voice_instructions",
        return_value=secret_instructions,
    ):
        voice_client.post(
            "/orb/voice/session",
            json={"mode": "conversational", "voice_id": "orb_british_female"},
        )

    log_text = "\n".join(record.message for record in caplog.records)
    assert secret_instructions not in log_text
    assert "ek_rt" not in log_text


def test_premium_dependency_still_required_for_realtime_session():
    app = FastAPI()
    app.include_router(router)

    async def deny_premium():
        from fastapi import HTTPException

        raise HTTPException(status_code=402, detail="premium_required")

    app.dependency_overrides[require_orb_residential_auth] = lambda: {"id": 1}
    app.dependency_overrides[require_orb_product_bootstrap_access] = lambda: {"id": 1}
    app.dependency_overrides[require_orb_voice_premium] = deny_premium
    client = TestClient(app)
    with patch.dict(
        os.environ,
        {
            "ORB_VOICE_REALTIME_PROVIDER": "openai",
            "OPENAI_API_KEY": "test-key",
            "ORB_REALTIME_ENABLED": "true",
        },
        clear=False,
    ):
        response = client.post(
            "/orb/voice/realtime/session",
            json={"mode": "conversational", "voice_id": "orb_british_female"},
        )
    assert response.status_code == 402
