"""NR-1 Phase 2C: operational ORB POST /orb/realtime/session governance tests."""

from __future__ import annotations

import json
import logging
import os
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.permissions import require_assistant_access
from routers.orb_routes import router
from schemas.ai_realtime import (
    FEATURE_ORB_OPERATIONAL_REALTIME_SESSION,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from schemas.data_intelligence import ProviderDataIntelligenceSettings
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_governed_egress import RealtimeEgressDecision
from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service
from services.orb_operational_realtime_governance_service import (
    ORB_OPERATIONAL_PRODUCT_AREA,
    ORB_OPERATIONAL_REALTIME_LEGACY_ROUTE,
    ORB_OPERATIONAL_REALTIME_ROUTE,
    build_orb_operational_realtime_governance_context,
)
from services.orb_session_store import orb_session_store


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


def _success_response() -> AiRealtimeSessionResponse:
    return AiRealtimeSessionResponse(
        configured=True,
        provider=RealtimeProviderName.OPENAI,
        model="gpt-realtime",
        session={
            "id": "sess_operational",
            "client_secret": {"value": "ek_operational", "expires_at": 999},
        },
        voice="shimmer",
        fallback_text_mode=False,
    )


def _session_payload() -> dict:
    return {
        "context": {"workspace": "shift_operations", "home_id": 1},
        "provider": "openai_realtime",
    }


@pytest.fixture
def orb_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "admin", "email": "admin@test", "provider_id": 5, "home_id": 10, "allowed_home_ids": [10]}

    app.dependency_overrides[require_assistant_access] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    orb_session_store.reset_for_tests()


@pytest.fixture(autouse=True)
def reset_governance_events():
    indicare_ai_governance_event_service.reset_for_tests()
    yield
    indicare_ai_governance_event_service.reset_for_tests()


@pytest.fixture(autouse=True)
def reset_voice_sessions(monkeypatch):
    import services.orb_voice_session_service as voice_session_module
    from services.orb_voice_session_service import orb_voice_session_service

    orb_voice_session_service.sessions.clear()
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    monkeypatch.setattr(
        "services.orb_voice_session_service.orb_observability_service.record_event",
        lambda *args, **kwargs: None,
    )
    for method, impl in {
        "start_session": lambda **kwargs: None,
        "snapshot": lambda _session_id: {"scope": {"home_id": 10}},
        "end_session": lambda _session_id: None,
        "update_from_context": lambda **kwargs: None,
        "record_user_turn": lambda **kwargs: {"scope": {"home_id": 10}},
        "record_assistant_turn": lambda **kwargs: {"scope": {"home_id": 10}},
        "mark_interrupted": lambda **kwargs: {"scope": {"home_id": 10}},
        "prompt_context": lambda _session_id: {},
    }.items():
        monkeypatch.setattr(
            voice_session_module.orb_memory_service,
            method,
            impl,
            raising=False,
        )
    monkeypatch.setattr(
        "services.orb_voice_session_service.orb_realtime_provider_service.provider_available",
        lambda: True,
    )
    yield
    orb_voice_session_service.sessions.clear()


@pytest.fixture
def openai_env(monkeypatch):
    monkeypatch.setenv("ORB_VOICE_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")


def test_build_orb_operational_realtime_governance_context_maps_schema_values():
    instructions = "Speak calmly for operational ORB."
    governance = build_orb_operational_realtime_governance_context(
        instructions=instructions,
        current_user={"id": 1, "provider_id": 5, "home_id": 10},
        orb_session_id="orb_session_abc123",
        model="gpt-realtime",
    )
    assert governance.surface == "operational_orb"
    assert governance.feature == FEATURE_ORB_OPERATIONAL_REALTIME_SESSION
    assert governance.purpose == "orb_operational_conversational"
    assert governance.route == ORB_OPERATIONAL_REALTIME_ROUTE
    assert governance.user_id == 1
    assert governance.provider_id == 5
    assert governance.home_id == 10
    assert governance.instructions_len == len(instructions)
    assert governance.metadata["product_area"] == ORB_OPERATIONAL_PRODUCT_AREA
    assert governance.metadata["product_access"] == "assistant:access"
    assert governance.metadata["ai_provider"] == "openai"
    assert governance.metadata["ai_model"] == "gpt-realtime"


def test_orb_realtime_session_uses_governed_egress(orb_client, openai_env, monkeypatch):
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_operational_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    response = orb_client.post("/orb/realtime/session", json=_session_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    payload = data["data"]
    assert payload["provider"] == "openai_realtime"
    assert payload["provider_session"]["session"]["client_secret"]["value"] == "ek_operational"
    issue_mock.assert_awaited_once()
    governance = issue_mock.await_args.kwargs["governance"]
    assert governance.feature == FEATURE_ORB_OPERATIONAL_REALTIME_SESSION
    assert governance.route == ORB_OPERATIONAL_REALTIME_ROUTE
    assert governance.surface == "operational_orb"


def test_orb_session_start_uses_governed_egress(orb_client, openai_env, monkeypatch):
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    create_mock = AsyncMock(
        return_value={
            "provider": "openai_realtime",
            "configured": True,
            "session": {"client_secret": {"value": "ek_direct", "expires_at": 999}},
            "fallback_text_mode": False,
        }
    )
    monkeypatch.setattr(
        "services.orb_operational_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    monkeypatch.setattr(
        "services.orb_voice_session_service.orb_realtime_provider_service.create_ephemeral_session",
        create_mock,
    )
    response = orb_client.post("/orb/session/start", json=_session_payload())
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    payload = data["data"]
    assert payload["provider"] == "openai_realtime"
    assert payload["provider_session"]["session"]["client_secret"]["value"] == "ek_operational"
    issue_mock.assert_awaited_once()
    create_mock.assert_not_awaited()
    governance = issue_mock.await_args.kwargs["governance"]
    assert governance.feature == FEATURE_ORB_OPERATIONAL_REALTIME_SESSION
    assert governance.route == ORB_OPERATIONAL_REALTIME_LEGACY_ROUTE
    assert governance.surface == "operational_orb"


def test_session_start_allowed_governance_preserves_legacy_response_shape(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/session/start", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["session_id"]
    assert data["provider"] == "openai_realtime"
    assert data["provider_configured"] is True
    assert data["provider_session"]["session"]["client_secret"]["value"] == "ek_operational"
    assert data["realtime"]["transport"] == "webrtc"
    assert "mode_decision" in data
    assert "voice_profile" in data
    assert "preferences" in data


def test_session_start_blocked_external_ai_returns_no_client_secret(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/session/start", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["provider_session"].get("session") is None
    assert data["provider_session"]["fallback_text_mode"] is True
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_session_start_blocked_realtime_voice_setting_returns_no_client_secret(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/session/start", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["provider_session"].get("session") is None
    assert data["provider_session"]["fallback_text_mode"] is True
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_session_start_audit_event_contains_safe_metadata_only(orb_client, openai_env, monkeypatch):
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
        "services.orb_persona_policy.persona_instruction",
        return_value=secret_instructions,
    ):
        orb_client.post("/orb/session/start", json=_session_payload())

    events = indicare_ai_governance_event_service.get_recent_events()
    assert len(events) >= 1
    metadata = events[0].metadata or {}
    assert metadata["feature"] == FEATURE_ORB_OPERATIONAL_REALTIME_SESSION
    assert metadata["classification"] == "external_ai_realtime_session"
    assert metadata["modality"] == "realtime_session"
    assert metadata["route"] == ORB_OPERATIONAL_REALTIME_LEGACY_ROUTE
    assert "instructions_len" in metadata
    assert "SECRET CHILD CONTEXT" not in json.dumps(metadata)
    assert "instructions" not in metadata
    assert "client_secret" not in json.dumps(metadata)
    assert captured_instructions
    assert secret_instructions not in json.dumps(metadata)


def test_session_start_raw_instructions_and_client_secrets_not_logged(orb_client, openai_env, monkeypatch, caplog):
    secret_instructions = "SECRET CHILD CONTEXT MUST NOT APPEAR IN LOGS"
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_operational_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    with patch(
        "services.orb_persona_policy.persona_instruction",
        return_value=secret_instructions,
    ):
        with caplog.at_level(logging.INFO):
            orb_client.post("/orb/session/start", json=_session_payload())

    log_text = "\n".join(record.message for record in caplog.records)
    assert secret_instructions not in log_text
    assert "ek_operational" not in log_text


def test_assistant_access_dependency_still_required_for_session_start():
    app = FastAPI()
    app.include_router(router)

    async def deny_access():
        raise HTTPException(status_code=403, detail="assistant_access_required")

    app.dependency_overrides[require_assistant_access] = deny_access
    client = TestClient(app)
    with patch.dict(
        os.environ,
        {
            "ORB_VOICE_PROVIDER": "openai",
            "OPENAI_API_KEY": "test-key",
            "ORB_REALTIME_ENABLED": "true",
        },
        clear=False,
    ):
        response = client.post("/orb/session/start", json=_session_payload())
    assert response.status_code == 403


def test_allowed_governance_preserves_legacy_response_shape(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/realtime/session", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["session_id"]
    assert data["provider"] == "openai_realtime"
    assert data["provider_configured"] is True
    assert data["provider_session"]["session"]["client_secret"]["value"] == "ek_operational"
    assert data["realtime"]["transport"] == "webrtc"
    assert "mode_decision" in data
    assert "voice_profile" in data
    assert "preferences" in data


def test_blocked_external_ai_returns_no_client_secret(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/realtime/session", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["provider_session"].get("session") is None
    assert data["provider_session"]["fallback_text_mode"] is True
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_blocked_realtime_voice_setting_returns_no_client_secret(orb_client, openai_env, monkeypatch):
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
    response = orb_client.post("/orb/realtime/session", json=_session_payload())
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["provider_session"].get("session") is None
    assert data["provider_session"]["fallback_text_mode"] is True
    assert "client_secret" not in response.text
    assert adapter_called["value"] is False


def test_audit_event_contains_safe_metadata_only(orb_client, openai_env, monkeypatch):
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
        "services.orb_persona_policy.persona_instruction",
        return_value=secret_instructions,
    ):
        orb_client.post("/orb/realtime/session", json=_session_payload())

    events = indicare_ai_governance_event_service.get_recent_events()
    assert len(events) >= 1
    metadata = events[0].metadata or {}
    assert metadata["feature"] == FEATURE_ORB_OPERATIONAL_REALTIME_SESSION
    assert metadata["classification"] == "external_ai_realtime_session"
    assert metadata["modality"] == "realtime_session"
    assert metadata["route"] == ORB_OPERATIONAL_REALTIME_ROUTE
    assert "instructions_len" in metadata
    assert "SECRET CHILD CONTEXT" not in json.dumps(metadata)
    assert "instructions" not in metadata
    assert "client_secret" not in json.dumps(metadata)
    assert captured_instructions
    assert secret_instructions not in json.dumps(metadata)


def test_raw_instructions_and_client_secrets_not_logged(orb_client, openai_env, monkeypatch, caplog):
    secret_instructions = "SECRET CHILD CONTEXT MUST NOT APPEAR IN LOGS"
    issue_mock = AsyncMock(return_value=(_success_response(), _allowed_egress()))
    monkeypatch.setattr(
        "services.orb_operational_realtime_governance_service.ai_governed_egress.issue_realtime_session",
        issue_mock,
    )
    with patch(
        "services.orb_persona_policy.persona_instruction",
        return_value=secret_instructions,
    ):
        with caplog.at_level(logging.INFO):
            orb_client.post("/orb/realtime/session", json=_session_payload())

    log_text = "\n".join(record.message for record in caplog.records)
    assert secret_instructions not in log_text
    assert "ek_operational" not in log_text


def test_assistant_access_dependency_still_required_for_realtime_session():
    app = FastAPI()
    app.include_router(router)

    async def deny_access():
        raise HTTPException(status_code=403, detail="assistant_access_required")

    app.dependency_overrides[require_assistant_access] = deny_access
    client = TestClient(app)
    with patch.dict(
        os.environ,
        {
            "ORB_VOICE_PROVIDER": "openai",
            "OPENAI_API_KEY": "test-key",
            "ORB_REALTIME_ENABLED": "true",
        },
        clear=False,
    ):
        response = client.post("/orb/realtime/session", json=_session_payload())
    assert response.status_code == 403
