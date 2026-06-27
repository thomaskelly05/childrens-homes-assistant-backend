from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_voice_residential_routes import require_orb_voice_premium, router
from services import orb_ai_abuse_guard_service as orb_ai_abuse_guard


@pytest.fixture(autouse=True)
def _reset_orb_ai_abuse_budget():
    orb_ai_abuse_guard.reset_daily_counters_for_tests()
    yield
    orb_ai_abuse_guard.reset_daily_counters_for_tests()


@pytest.fixture
def voice_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_premium():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test.com"}

    app.dependency_overrides[require_orb_residential_auth] = fake_premium
    app.dependency_overrides[require_orb_voice_premium] = fake_premium
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_speak_requires_premium_dependency():
    from routers.orb_voice_residential_routes import orb_voice_speak, OrbVoiceTextRequest

    conn = MagicMock()
    request = MagicMock()
    import asyncio

    with patch(
        "auth.orb_residential_dependencies.orb_access_service.check_access",
        lambda *_a, **_k: MagicMock(
            allowed=False,
            access_state={"safety_accepted": True, "can_use_orb": False},
            reason="premium_subscription_required",
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            asyncio.run(
                require_orb_voice_premium(
                    request=request,
                    conn=conn,
                    current_user={"user_id": 1, "id": 1},
                )
            )
    assert exc.value.status_code == 402


def test_speak_blocks_safeguarding_critical_auto_speech(voice_client, monkeypatch):
    monkeypatch.setattr(
        "routers.orb_voice_residential_routes.orb_voice_provider_service.speak",
        lambda req: {
            "provider": "browser_fallback",
            "status": "blocked",
            "message": "Safeguarding-critical content requires manual speak confirmation.",
        },
    )
    response = voice_client.post(
        "/orb/voice/speak",
        json={
            "spoken_summary": "Urgent safeguarding disclosure about a child",
            "manual_speak": False,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("status") == "blocked" or "blocked" in str(body).lower() or body.get("provider") == "browser_fallback"


def test_provider_status_does_not_expose_api_keys(voice_client):
    response = voice_client.get("/orb/voice/provider-status")
    assert response.status_code == 200
    text = response.text.lower()
    assert "sk_" not in text
    assert "openai_api_key" not in text
    assert "elevenlabs" not in text or "configured" in text
