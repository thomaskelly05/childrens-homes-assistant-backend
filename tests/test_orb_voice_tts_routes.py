from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_tts_routes import require_orb_voice_premium, router


@pytest.fixture
def tts_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test.com"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_orb_voice_premium] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_tts_routes_are_registered_on_app():
    from app import app as fastapi_app

    paths = {getattr(route, "path", None) for route in fastapi_app.routes}
    assert "/orb/voice/tts/status" in paths
    assert "/orb/voice/tts" in paths


def test_tts_status_returns_200_when_disabled(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "false")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["configured"] is False
    assert body["provider"] == "openai"


def test_tts_status_returns_200_when_configured(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("ORB_TTS_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["configured"] is True


def test_tts_post_returns_503_when_disabled(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "false")
    response = tts_client.post(
        "/orb/voice/tts",
        json={"text": "Hello from ORB.", "voice_style": "calm_therapeutic"},
    )
    assert response.status_code == 503
    assert response.json()["detail"]["error"] == "tts_disabled"


def test_tts_post_returns_audio_when_configured(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
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

    with patch("services.orb_voice_tts_service.OpenAI", FakeOpenAI):
        response = tts_client.post(
            "/orb/voice/tts",
            json={"text": "Hello from ORB.", "voice_style": "calm_therapeutic"},
        )

    assert response.status_code == 200
    assert response.content.startswith(b"ID3")
    assert response.headers["content-type"].startswith("audio/")
