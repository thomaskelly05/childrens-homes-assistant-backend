from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.sccif_alignment_routes as alignment_routes
from schemas.recording_drafts import RecordingDraftCreate
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_health_route(fake_state):
    result = asyncio.run(
        alignment_routes.sccif_alignment_health(current_user=fake_state["user"], conn=None)
    )
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert result["standalone_access"] is False
    assert "disclaimer" in result["data"]


def test_dashboard_route(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="T", body="secret", recording_type="daily-note"),
        user,
    )
    result = asyncio.run(
        alignment_routes.sccif_alignment_dashboard(current_user=user, conn=None, limit=50)
    )
    assert result["success"] is True
    assert "evidence_items" in result["data"]
    assert "secret" not in str(result["data"])


def test_judgements_route(fake_state):
    result = asyncio.run(
        alignment_routes.sccif_alignment_judgements(current_user=fake_state["user"], conn=None)
    )
    assert len(result["data"]["judgement_areas"]) == 3


def test_quality_standards_route(fake_state):
    result = asyncio.run(
        alignment_routes.sccif_alignment_quality_standards(
            current_user=fake_state["user"], conn=None
        )
    )
    assert len(result["data"]["quality_standards"]) == 9


def test_evidence_and_gaps_routes(fake_state):
    user = fake_state["user"]
    evidence = asyncio.run(
        alignment_routes.sccif_alignment_evidence(current_user=user, conn=None, limit=50)
    )
    gaps = asyncio.run(alignment_routes.sccif_alignment_gaps(current_user=user, conn=None))
    assert evidence["success"] is True
    assert gaps["success"] is True


def test_auth_required_for_non_manager(fake_state):
    user = {**fake_state["user"], "role": "carer"}
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            alignment_routes.sccif_alignment_dashboard(current_user=user, conn=None, limit=50)
        )
    assert exc.value.status_code == 403
