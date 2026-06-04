from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_residential_routes import router

ROOT = Path(__file__).resolve().parents[1]


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


def test_voice_provider_status_route():
    routes = (ROOT / "routers/orb_voice_residential_routes.py").read_text(encoding="utf-8")
    assert "/provider-status" in routes
    assert "orb_voice_provider_service" in routes


def test_voice_speak_accepts_spoken_summary(voice_client):
    response = voice_client.post(
        "/orb/voice/speak",
        json={
            "spoken_summary": "Short calm summary for staff.",
            "voice_profile": "calm_female",
            "expert_depth": "general_light",
            "rate": 1.0,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "Short calm summary for staff."
    assert data["provider"] in {"browser_fallback", "browser_speech", "text_only", "premium_tts"}


def test_voice_speak_legacy_text_field(voice_client):
    response = voice_client.post(
        "/orb/voice/speak",
        json={"text": "Legacy text field", "voice_id": "orb_british_female"},
    )
    assert response.status_code == 200
    assert response.json()["text"] == "Legacy text field"


def test_settings_panel_premium_status_markup():
    panel = (ROOT / "frontend-next/components/orb-standalone/orb-voice-settings-panel.tsx").read_text(
        encoding="utf-8"
    )
    assert "data-orb-voice-premium-status" in panel
    assert "data-orb-voice-profile-select" in panel
    assert "Privacy mode" in panel
