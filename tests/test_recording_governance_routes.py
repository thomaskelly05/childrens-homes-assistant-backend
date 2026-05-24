from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.recording_governance_routes as governance_routes
from schemas.recording_drafts import RecordingDraftCreate
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import recording_review_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    recording_review_service._memory_events = []
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_review_service, "_detect_storage_mode", lambda: "memory")


def test_health_route(fake_state):
    result = asyncio.run(
        governance_routes.recording_governance_health(current_user=fake_state["user"], conn=None)
    )
    assert result["success"] is True
    assert result["operational_only"] is True
    assert result["standalone_access"] is False
    assert result["metadata_only"] is True


def test_dashboard_route(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Review",
            body="hidden",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    result = asyncio.run(
        governance_routes.recording_governance_dashboard(current_user=user, conn=None)
    )
    assert result["success"] is True
    assert "summary_cards" in result["data"]
    assert "body" not in str(result["data"])


def test_alerts_quality_backlog_form_usage(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="Note", body="x", recording_type="daily-note"),
        user,
    )
    for handler in (
        governance_routes.recording_governance_alerts,
        governance_routes.recording_governance_quality,
        governance_routes.recording_governance_backlog,
        governance_routes.recording_governance_form_usage,
    ):
        result = asyncio.run(handler(current_user=user, conn=None))
        assert result["success"] is True


def test_items_route(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(title="Item", body="secret", recording_type="incident"),
        user,
    )
    result = asyncio.run(
        governance_routes.recording_governance_items(
            current_user=user, conn=None, limit=50, offset=0
        )
    )
    assert result["success"] is True
    assert "secret" not in str(result["data"])


def test_auth_required_for_non_manager(monkeypatch, fake_state):
    staff = {**fake_state["user"], "role": "support_worker"}
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            governance_routes.recording_governance_dashboard(current_user=staff, conn=None)
        )
    assert exc.value.status_code == 403
