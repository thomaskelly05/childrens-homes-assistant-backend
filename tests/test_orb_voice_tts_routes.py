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
    assert body["ok"] is True
    assert body["enabled"] is True
    assert body["configured"] is True
    assert body["provider"] == "openai"
    assert body["default_voice_id"] == "orb_british_female"
    assert body["default_style"] == "calm_therapeutic"


def test_tts_status_shows_elevenlabs_when_configured(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("ORB_TTS_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ORB_TTS_FALLBACK_PROVIDER", "openai")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "elevenlabs"
    assert body["configured"] is True
    assert body["fallback_provider"] == "openai"
    assert "voice-abc123" not in response.text
    assert "test-eleven-key" not in response.text


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
    assert response.headers.get("X-ORB-TTS-Provider") == "openai"


def test_tts_post_uses_elevenlabs_when_selected(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("ORB_TTS_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
    monkeypatch.setenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")

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

    with patch("services.orb_voice_tts_service.httpx.Client", FakeClient):
        response = tts_client.post(
            "/orb/voice/tts",
            json={"text": "Hello from ORB.", "voice_style": "calm_therapeutic"},
        )

    assert response.status_code == 200
    assert response.content.startswith(b"ID3")
    assert response.headers.get("X-ORB-TTS-Provider") == "elevenlabs"


def test_tts_status_prefers_elevenlabs_when_provider_unset(tts_client, monkeypatch):
    monkeypatch.delenv("ORB_TTS_PROVIDER", raising=False)
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "elevenlabs"
    assert body["katherineConfigured"] is True
    assert body["preferredProvider"] == "elevenlabs"


def test_tts_post_returns_503_when_provider_disabled(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "false")
    response = tts_client.post(
        "/orb/voice/tts",
        json={"text": "Hello from ORB.", "voice_style": "calm_therapeutic"},
    )
    assert response.status_code == 503


def test_tts_logs_do_not_include_full_text(tts_client, monkeypatch, caplog):
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

    spoken = "Sensitive safeguarding detail should not appear in logs."
    with patch("services.orb_voice_tts_service.OpenAI", FakeOpenAI):
        response = tts_client.post(
            "/orb/voice/tts",
            json={"text": spoken, "voice_style": "calm_therapeutic"},
        )

    assert response.status_code == 200
    combined_logs = "\n".join(record.getMessage() for record in caplog.records)
    assert spoken not in combined_logs


def test_tts_status_reports_katherine_ready_when_elevenlabs_configured(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.delenv("ORB_TTS_PROVIDER", raising=False)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["katherineReady"] is True
    assert body["ttsProviderEffective"] == "elevenlabs"
    assert body.get("fallbackReason") is None
    assert "voice-abc123" not in response.text


def test_tts_status_reports_forced_openai_fallback_reason(tts_client, monkeypatch):
    monkeypatch.setenv("ORB_TTS_ENABLED", "true")
    monkeypatch.setenv("ORB_TTS_PROVIDER", "openai")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-eleven-key")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-abc123")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    response = tts_client.get("/orb/voice/tts/status")
    assert response.status_code == 200
    body = response.json()
    assert body["katherineReady"] is False
    assert body["ttsProviderForced"] == "openai"
    assert body["fallbackReason"] == "provider_forced_openai"

