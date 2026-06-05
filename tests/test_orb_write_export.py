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


def test_export_pdf_returns_binary(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Daily Record",
            "professional_note": "Child settled after tea.\n\nReview required before use.",
            "format": "pdf",
            "note_type": "daily_record",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/pdf")
    assert len(response.content) > 100


def test_export_pdf_content_excludes_ui_metadata(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Incident Report",
            "professional_note": "Observable facts only.",
            "format": "pdf",
        },
    )
    assert response.status_code == 200
    # PDF is binary; ensure we did not return JSON brain metadata
    assert not response.content.startswith(b"{")


def test_export_markdown_includes_title(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Handover",
            "professional_note": "Shift summary.",
            "format": "markdown",
        },
    )
    data = response.json()["data"]
    assert data["format"] == "markdown"
    assert "Handover" in data["content"]
    assert "brain_metadata" not in data
