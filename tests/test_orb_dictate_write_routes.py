from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router
from schemas.orb_dictate import OrbDictateAnalyzeRequest, OrbDictateFinaliseRequest
from services.orb_dictate_service import analyze_dictate_session, finalise_dictate_document


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


def test_dictate_analyze_returns_quality_checks(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/analyze",
        json={
            "input_text": "Child settled after tea. Staff offered calm voice.",
            "note_type": "daily_record",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["detected_record_type"]
    assert "quality_checks" in data
    assert data["standalone_boundary"]
    assert "brain_metadata" not in data


def test_dictate_analyze_service():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Tom Kelly, Registered Manager, speaking. We reviewed the plan.",
            note_type="daily_record",
        )
    )
    assert result.detected_record_type
    assert result.child_voice_check
    assert result.standalone_boundary


def test_dictate_finalise_returns_review_statement(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/finalise",
        json={
            "input_text": "Child became distressed at tea. Staff offered space.",
            "note_type": "daily_record",
            "template_id": "daily_record",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["professional_note"]
    assert "review" in data["review_required_statement"].lower()
    assert data["standalone_boundary"]
    assert "IndiCare OS" in data["standalone_boundary"]


def test_dictate_finalise_service_no_os_save(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = finalise_dictate_document(
        OrbDictateFinaliseRequest(
            input_text="Child settled after tea. Staff offered calm support.",
            note_type="daily_record",
            template_id="daily_record",
        )
    )
    assert result.professional_note
    assert result.review_required_statement
    assert "adult" in result.review_required_statement.lower()
