from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_residential_routes import router


@pytest.fixture
def voice_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "role": "admin", "email": "admin@test"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_orb_voice_session_returns_browser_fallback_by_default(voice_client):
    response = voice_client.post(
        "/orb/voice/session",
        json={"mode": "conversational", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["provider"] == "browser_fallback"
    assert "session_id" in data


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
