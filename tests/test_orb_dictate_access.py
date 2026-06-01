from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router


@pytest.fixture
def dictate_app():
    app = FastAPI()
    app.include_router(router)
    return app


def test_signed_out_cannot_generate(dictate_app):
    client = TestClient(dictate_app, raise_server_exceptions=False)
    response = client.post(
        "/orb/dictate/generate",
        json={"input_text": "Test", "note_type": "daily_record"},
    )
    assert response.status_code in {401, 403, 422, 500, 503}


def test_unpaid_user_blocked_from_generate(dictate_app, monkeypatch):
    async def fake_premium():
        raise HTTPException(status_code=402, detail={"error": "premium_required"})

    async def fake_auth():
        return {"user_id": 9, "id": 9, "role": "orb_residential"}

    dictate_app.dependency_overrides[require_orb_dictate_access] = fake_premium
    dictate_app.dependency_overrides[require_orb_residential_auth] = fake_auth
    client = TestClient(dictate_app)
    response = client.post(
        "/orb/dictate/generate",
        json={"input_text": "Test", "note_type": "daily_record"},
    )
    assert response.status_code == 402
    dictate_app.dependency_overrides.clear()


def test_premium_user_can_generate(dictate_app, monkeypatch):
    async def fake_premium():
        return {"user_id": 9, "id": 9, "role": "orb_residential"}

    dictate_app.dependency_overrides[require_orb_dictate_access] = fake_premium
    dictate_app.dependency_overrides[require_orb_residential_auth] = fake_premium
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(dictate_app)
    response = client.post(
        "/orb/dictate/generate",
        json={"input_text": "Child became distressed.", "note_type": "daily_record"},
    )
    assert response.status_code == 200
    dictate_app.dependency_overrides.clear()
