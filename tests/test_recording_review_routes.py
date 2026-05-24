from __future__ import annotations

import asyncio

import pytest

import routers.recording_review_routes as review_routes
from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_review import RecordingReviewActionRequest
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import recording_review_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    recording_review_service._memory_events = []
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_review_service, "_detect_storage_mode", lambda: "memory")


def test_health_route(fake_state):
    result = asyncio.run(review_routes.recording_reviews_health(current_user=fake_state["user"], conn=None))
    assert result["success"] is True
    assert result["operational_only"] is True
    assert result["standalone_access"] is False


def test_queue_route(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Review me",
            body="Body",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    result = asyncio.run(
        review_routes.recording_reviews_queue(
            limit=20, offset=0, current_user=user, conn=None
        )
    )
    assert result["success"] is True
    assert result["data"]["total"] >= 1


def test_summary_route(fake_state):
    result = asyncio.run(
        review_routes.recording_reviews_summary(current_user=fake_state["user"], conn=None)
    )
    assert result["success"] is True
    assert "awaiting_review" in result["data"]


def test_detail_and_action(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Med",
            body="Error",
            recording_type="medication-error",
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    detail = asyncio.run(
        review_routes.get_recording_review_detail(draft.id, current_user=user, conn=None)
    )
    assert detail["data"]["draft"]["id"] == draft.id

    action = asyncio.run(
        review_routes.apply_recording_review_action(
            draft.id,
            RecordingReviewActionRequest(decision="approve", comments="OK"),
            current_user=user,
            conn=None,
        )
    )
    assert action["data"]["review_status"] == "approved"
