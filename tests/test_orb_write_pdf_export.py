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


def test_pdf_export_includes_document_structure(dictate_client):
    body = (
        "## What happened\n\nYoung person settled after tea.\n\n"
        "---\n\n"
        "This document requires adult review before saving or exporting as a formal record. "
        "The adult remains responsible for the final record.\n\n"
        "Generated with ORB Residential, powered by IndiCare Intelligence"
    )
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Daily Record",
            "professional_note": body,
            "format": "pdf",
            "note_type": "daily_record",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("application/pdf")
    assert len(response.content) > 100


def test_pdf_export_excludes_brain_metadata(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Safeguarding Note",
            "professional_note": "Observable facts only.",
            "format": "pdf",
        },
    )
    assert response.status_code == 200
    assert not response.content.startswith(b"{")


def test_markdown_export_has_title_no_metadata(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/export",
        json={
            "title": "Manager Summary",
            "professional_note": "Shift overview.",
            "format": "markdown",
        },
    )
    data = response.json()["data"]
    assert "Manager Summary" in data["content"]
    assert "brain_metadata" not in data
