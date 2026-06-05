from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router
from schemas.orb_dictate import OrbDictateAnalyzeRequest
from services.orb_dictate_service import STANDALONE_BOUNDARY, analyze_dictate_session


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


def test_analyze_response_has_standalone_boundary():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(input_text="Session transcript only.", note_type="daily_record")
    )
    assert result.standalone_boundary == STANDALONE_BOUNDARY
    assert "IndiCare OS" in result.standalone_boundary


def test_analyze_api_no_child_profile_fields(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/analyze",
        json={"input_text": "Staff debrief notes.", "note_type": "staff_debrief"},
    )
    data = response.json()["data"]
    assert "child_profile_id" not in data
    assert "child_id" not in data
    assert "biometric" not in str(data).lower()


def test_generate_still_requires_consent_for_meetings(dictate_client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Team meeting.",
            "note_type": "team_meeting",
            "mode": "team_meeting",
            "consent_confirmed": False,
        },
    )
    assert response.status_code == 400
