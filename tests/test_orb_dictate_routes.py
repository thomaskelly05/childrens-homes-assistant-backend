from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router
from services.orb_dictate_service import generate_dictate_note
from schemas.orb_dictate import OrbDictateGenerateRequest


@pytest.fixture
def dictate_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_dictate_templates_returns_note_types(dictate_client):
    response = dictate_client.get("/orb/dictate/templates")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert isinstance(data, list)
    assert len(data) >= 8
    assert any(item["note_type"] == "incident_record" for item in data)
    assert "standalone_boundary" in body


def test_dictate_generate_without_openai(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Child became distressed at tea. Staff offered space and calm voice.",
            "note_type": "daily_record",
            "include_child_voice": True,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["note_type"] == "daily_record"
    assert data["professional_note"]
    assert data["quality_checks"]["recording_quality"] in {"good", "needs_review"}
    assert "IndiCare OS" in data["standalone_boundary"]


def test_dictate_generate_requires_consent_for_conversation(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Team debrief about missing episode.",
            "note_type": "staff_debrief",
            "source": "dictation",
            "conversation_consent_confirmed": False,
        },
    )
    assert response.status_code == 400


def test_dictate_save_returns_standalone_boundary(dictate_client, monkeypatch):
    from schemas.orb_saved_outputs import OrbSavedOutputRecord

    def fake_create(payload):
        return OrbSavedOutputRecord(
            id="out_test",
            title=payload.title,
            type=payload.type,
        )

    monkeypatch.setattr(
        "services.orb_dictate_service.orb_saved_output_service.create_output",
        fake_create,
    )
    monkeypatch.setattr(
        "services.orb_dictate_service._user_can_access_os_ai_notes",
        lambda _user: False,
    )
    response = dictate_client.post(
        "/orb/dictate/save",
        json={
            "title": "Test daily record",
            "note_type": "daily_record",
            "professional_note": "Draft note for review.",
            "summary": "Summary",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["saved_output_id"] == "out_test"
    assert "not" in data["standalone_boundary"].lower() or "IndiCare" in data["standalone_boundary"]


def test_generate_includes_quality_checks():
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text='Child said "I don\'t want to go upstairs." Staff supported with calm voice.',
            note_type="incident_record",
        )
    )
    assert result.quality_checks.child_voice in {"present", "weak", "missing"}
    assert result.governance_notice


def test_dictate_transcribe_text(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/transcribe",
        json={"text": "Rough shift notes here."},
    )
    assert response.status_code == 200
    assert response.json()["data"]["transcript"] == "Rough shift notes here."
