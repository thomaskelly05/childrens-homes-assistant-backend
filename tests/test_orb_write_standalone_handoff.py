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


def test_finalise_handoff_fields_for_write(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/finalise",
        json={
            "input_text": "Daily record rough notes.",
            "note_type": "daily_record",
            "template_id": "daily",
            "transcript": "Daily record rough notes.",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["professional_note"]
    assert data["review_required_statement"]
    assert "brain_metadata" not in data


def test_analyze_for_standalone_write(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/analyze",
        json={
            "input_text": "Incident in the lounge — staff de-escalated.",
            "note_type": "incident_record",
            "record_type_id": "incident_report",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "safeguarding_concerns" in data
    assert "brain_metadata" not in data


def test_generate_for_standalone_write(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Key work session with young person about school.",
            "note_type": "keywork_summary",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["professional_note"]
    assert data["standalone_boundary"]
