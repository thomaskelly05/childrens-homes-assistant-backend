from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from routers.orb_voice_residential_routes import router


@pytest.fixture
def voice_status_client():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_unauthenticated_voice_status_returns_401(voice_status_client):
    async def deny():
        raise HTTPException(status_code=401, detail={"error": "not_authenticated"})

    voice_status_client.app.dependency_overrides[require_orb_product_bootstrap_access] = deny
    response = voice_status_client.get("/orb/voice/session/status")
    assert response.status_code == 401


def test_active_voice_status_returns_200(voice_status_client):
    async def active():
        return {"user_id": 1, "id": 1}

    voice_status_client.app.dependency_overrides[require_orb_product_bootstrap_access] = active
    response = voice_status_client.get("/orb/voice/session/status")
    assert response.status_code == 200
    assert "realtime_enabled" in response.json()
