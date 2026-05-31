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
    assert "session_id" in data
    assert data.get("websocket_url") is None


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
    assert "message" in data
    assert data.get("audio_url") is None


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
