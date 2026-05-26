from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_review import RecordingReviewActionRequest
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import recording_review_service


@pytest.fixture(autouse=True)
def memory_stores(monkeypatch):
    recording_draft_service._memory = {}
    recording_review_service._memory_events = []
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_review_service, "_detect_storage_mode", lambda: "memory")
    from services.child_archive_service import child_archive_service
    from services.plan_impact_suggestion_service import plan_impact_suggestion_service
    from services.lifeecho_memory_service import lifeecho_memory_service

    child_archive_service._memory = {}
    plan_impact_suggestion_service._memory = {}
    lifeecho_memory_service._suggestions = {}
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(plan_impact_suggestion_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(lifeecho_memory_service, "_detect_storage_mode", lambda: "memory")


def test_apply_approve_action_returns_lifecycle_ids(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily",
            body="Calm and positive day",
            recording_type="daily-note",
            child_id=5,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 42, "workflow": {}},
    )
    result = recording_review_service.apply_review_action(
        draft.id,
        RecordingReviewActionRequest(decision="approve", comments="Signed off"),
        user,
        conn=MagicMock(),
    )
    assert result is not None
    assert result.success is True
    assert result.formal_record_created is True
    assert result.linked_archive_record_id
    assert result.linked_chronology_id
    assert result.sign_off_completed is True


def test_draft_awaiting_review_not_archived_on_approve_without_formal(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Template",
            body="Body",
            recording_type="complaint",
            child_id=1,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    result = recording_review_service.apply_review_action(
        draft.id,
        RecordingReviewActionRequest(decision="approve"),
        user,
        conn=MagicMock(),
    )
    assert result is not None
    assert not result.linked_archive_record_id
