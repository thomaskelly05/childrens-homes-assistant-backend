from __future__ import annotations

import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_residential_routes import router
from schemas.orb_voice_realtime import validate_client_event
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store


@pytest.fixture
def voice_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "admin", "email": "admin@test"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    orb_voice_realtime_session_store._sessions.clear()


def test_orb_voice_session_status_not_configured_by_default(voice_client):
    response = voice_client.get("/orb/voice/session/status")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["realtime_enabled"] is False
    assert data["reason"] == "not_configured"
    brain = data.get("brain_metadata") or {}
    assert brain.get("brain") == "orb_residential_intelligence"
    assert brain.get("feature") == "voice"
    assert brain.get("standalone") is True
    assert brain.get("os_records_accessed") is False
    assert brain.get("live_record_access") is False


def test_orb_voice_session_status_enabled_when_openai_configured(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    response = voice_client.get("/orb/voice/session/status")
    assert response.status_code == 200
    data = response.json()
    assert data["realtime_enabled"] is True
    assert data["provider"] == "openai"
    assert data["requires_client_secret"] is True
    assert data["reason"] == "configured"


def test_orb_voice_session_returns_browser_fallback_by_default(voice_client):
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["provider"] == "browser_fallback"
    assert data["capabilities"]["latencyClass"] == "fallback"
    brain = data.get("brain_metadata") or {}
    assert brain.get("product") == "ORB Residential"
    assert brain.get("powered_by") == "IndiCare Intelligence"
    assert brain.get("feature") == "voice"
    assert data["selected_voice_profile"] == "orb_british_female"
    assert data["profile_label"] == "ORB British Female"
    assert data["provider_voice"] == "coral"
    assert "session_id" in data
    assert data.get("websocket_url") is None


def test_orb_voice_session_resolves_reflective_profile(voice_client):
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "reflective_practice", "voice_id": "orb_reflective"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["selected_voice_profile"] == "orb_reflective"
    assert data["provider_voice"] == "sage"


def test_orb_voice_realtime_session_not_configured_when_env_missing(voice_client):
    response = voice_client.post(
        "/orb/voice/realtime/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "not_configured"
    assert "Configure realtime voice" in (data.get("message") or "")


def test_orb_voice_realtime_session_openai_when_configured(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")

    async def fake_ephemeral(**_kwargs):
        return {
            "provider": "openai_realtime",
            "configured": True,
            "session": {
                "id": "sess_rt",
                "client_secret": {"value": "ek_rt", "expires_at": 999},
            },
            "model": "gpt-realtime",
            "voice": "coral",
            "fallback_text_mode": False,
        }

    monkeypatch.setattr(
        "routers.orb_voice_residential_routes.orb_realtime_provider_service.create_ephemeral_session",
        fake_ephemeral,
    )
    response = voice_client.post(
        "/orb/voice/realtime/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai_realtime"
    assert data["openai_session"]["client_secret"]["value"] == "ek_rt"
    assert "OPENAI_API_KEY" not in response.text


def test_orb_voice_session_openai_realtime_when_configured(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")

    async def fake_ephemeral(**_kwargs):
        return {
            "provider": "openai_realtime",
            "configured": True,
            "session": {
                "id": "sess_test",
                "client_secret": {"value": "ek_test", "expires_at": 999},
            },
            "model": "gpt-realtime",
            "voice": "coral",
            "fallback_text_mode": False,
        }

    monkeypatch.setattr(
        "routers.orb_voice_residential_routes.orb_realtime_provider_service.create_ephemeral_session",
        fake_ephemeral,
    )

    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female", "transport": "auto"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openai_realtime"
    assert data["capabilities"]["supportsStreamingStt"] is True
    assert data["capabilities"]["supportsStreamingTts"] is True
    assert data["capabilities"]["supportsDuplex"] is True
    assert data["selected_voice_profile"] == "orb_british_female"
    assert data["provider_voice"] == "coral"
    assert data.get("openai_session", {}).get("client_secret", {}).get("value") == "ek_test"


def test_orb_voice_session_returns_websocket_realtime_when_configured(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "websocket")
    monkeypatch.setenv("ORB_VOICE_SERVER_STT", "true")
    monkeypatch.setenv("ORB_VOICE_SERVER_TTS", "true")
    monkeypatch.setenv("ORB_VOICE_DEV_TEXT_SIMULATION", "true")

    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female", "transport": "websocket"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "websocket_realtime"
    assert data["status"] == "ready"
    assert data["websocket_url"] == f"/orb/voice/ws/{data['session_id']}"
    assert data["capabilities"]["supportsBargeIn"] is True


def test_orb_voice_speak_returns_browser_fallback_when_server_tts_missing(voice_client):
    response = voice_client.post(
        "/orb/voice/speak",
        json={"text": "Hello from ORB", "voice_id": "orb_british_female", "rate": 1.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "browser_fallback"
    assert data["text"] == "Hello from ORB"
    assert data["voice_id"] == "orb_british_female"
    assert data["selected_voice_profile"] == "orb_british_female"
    assert "message" in data
    assert data.get("audio_url") is None
    assert "provider_voice" not in data or data.get("provider_voice") is None


def test_orb_voice_transcribe_not_configured_without_text(voice_client):
    response = voice_client.post("/orb/voice/transcribe", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "not_configured"
    assert data["provider"] == "browser_fallback"


def test_orb_voice_transcribe_text_fallback(voice_client):
    response = voice_client.post("/orb/voice/transcribe", json={"text": "spoken note"})
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "browser_fallback"
    assert data["text"] == "spoken note"


def test_orb_voice_webrtc_offer_not_configured(voice_client):
    response = voice_client.post("/orb/voice/webrtc/offer/browser_test_session")
    assert response.status_code == 501
    detail = response.json()["detail"]
    assert detail["status"] == "not_configured"


def test_voice_client_event_schema_validates():
    event = validate_client_event({"type": "user.interrupt", "session_id": "orb_voice_abc"})
    assert event.type == "user.interrupt"


def test_voice_client_event_schema_rejects_unknown():
    with pytest.raises(ValueError, match="Unsupported client event"):
        validate_client_event({"type": "bogus.event"})


def test_orb_voice_ws_accepts_interrupt_event(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "websocket")
    monkeypatch.setenv("ORB_VOICE_SERVER_STT", "true")
    monkeypatch.setenv("ORB_VOICE_DEV_TEXT_SIMULATION", "true")
    monkeypatch.setattr(
        "services.orb_voice_realtime_ws_handler._websocket_user",
        lambda _ws: {"user_id": 1, "id": 1},
    )

    session = voice_client.post(
        "/orb/voice/session",
        json={"transport": "websocket"},
    ).json()
    session_id = session["session_id"]

    with voice_client.websocket_connect(f"/orb/voice/ws/{session_id}") as ws:
        ready = ws.receive_json()
        assert ready["type"] == "session.ready"
        ws.send_json({"type": "user.interrupt"})
        interrupted = ws.receive_json()
        assert interrupted["type"] == "interrupted"


def test_orb_voice_session_openai_does_not_expose_api_key(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")

    async def fake_ephemeral(**_kwargs):
        return {
            "provider": "openai_realtime",
            "configured": True,
            "session": {
                "id": "sess_test",
                "client_secret": {"value": "ek_test", "expires_at": 999},
                "api_key": "sk-should-not-leak",
            },
            "model": "gpt-realtime",
            "voice": "coral",
            "fallback_text_mode": False,
        }

    monkeypatch.setattr(
        "routers.orb_voice_residential_routes.orb_realtime_provider_service.create_ephemeral_session",
        fake_ephemeral,
    )

    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    body = response.json()
    dumped = response.text
    assert "sk-should-not-leak" not in dumped
    assert "OPENAI_API_KEY" not in dumped
    assert body["openai_session"]["client_secret"]["value"] == "ek_test"


def test_orb_voice_session_openai_disabled_when_realtime_flag_off(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "false")

    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    assert response.json()["provider"] == "browser_fallback"


def test_orb_voice_session_invalid_profile_falls_back_to_default(voice_client):
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "unknown_profile_xyz"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["selected_voice_profile"] == "orb_british_female"


def test_orb_voice_session_instructions_include_residential_guidance(voice_client, monkeypatch):
    monkeypatch.setenv("ORB_VOICE_REALTIME_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    captured: dict = {}

    async def fake_ephemeral(**kwargs):
        captured.update(kwargs)
        return {
            "provider": "openai_realtime",
            "configured": True,
            "session": {"client_secret": {"value": "ek_test", "expires_at": 999}},
            "model": "gpt-realtime",
            "voice": "sage",
            "fallback_text_mode": False,
        }

    monkeypatch.setattr(
        "routers.orb_voice_residential_routes.orb_realtime_provider_service.create_ephemeral_session",
        fake_ephemeral,
    )

    voice_client.post(
        "/orb/voice/session",
        json={"mode": "reflective_practice", "voice_id": "orb_reflective"},
    )
    instructions = captured.get("instructions") or ""
    assert "ORB Voice" in instructions
    assert "Reflective Practice" in instructions
    assert captured.get("voice") == "sage"
