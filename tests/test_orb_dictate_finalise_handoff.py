from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router


@pytest.fixture
def dictate_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_orb_dictate_access] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_finalise_includes_timestamp_and_template(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/finalise",
        json={
            "input_text": "Key work session notes.",
            "note_type": "keywork_summary",
            "template_id": "keywork",
            "transcript": "Key work session notes.",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["timestamp"]
    assert data["template_id"] == "keywork"
    assert data["transcript"] == "Key work session notes."


def test_finalise_does_not_return_brain_metadata(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/finalise",
        json={"input_text": "Daily log content.", "note_type": "daily_record"},
    )
    data = response.json()["data"]
    assert "brain_metadata" not in data
    assert "os_records_accessed" not in data
