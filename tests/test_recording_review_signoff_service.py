from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_review import RecordingReviewActionRequest
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import recording_review_service
from services.recording_review_signoff_service import (
    UNSUPPORTED_FORMAL_ROUTE,
    recording_review_signoff_service,
)
from services.signed_off_lifecycle_service import signed_off_lifecycle_service


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


def test_unsupported_formal_route_honest_warning(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Complaint",
            body="Concern",
            recording_type="complaint",
            child_id=1,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    result = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id, user, conn=MagicMock()
    )
    assert result is not None
    assert result.success is True
    assert result.formal_record_created is False
    assert any(UNSUPPORTED_FORMAL_ROUTE in w for w in result.lifecycle_warnings)


def test_safeguarding_blocks_signoff(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Disclosure",
            body="Sensitive",
            recording_type="disclosure",
            child_id=2,
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    result = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id,
        user,
        action=RecordingReviewActionRequest(decision="approve"),
        conn=MagicMock(),
    )
    assert result is not None
    assert result.sign_off_status == "blocked_safeguarding_review"
    assert result.review_status == "approved"
    assert not result.formal_record_created


def test_supported_approve_runs_lifecycle(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily",
            body="Great progress at school today",
            recording_type="daily-note",
            child_id=4,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 88, "workflow": {}},
    )
    result = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id, user, conn=MagicMock()
    )
    assert result is not None
    assert result.formal_record_created is True
    assert result.linked_archive_record_id
    assert result.linked_chronology_id
    assert result.sign_off_completed is True


def test_duplicate_approval_does_not_duplicate_archive(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily",
            body="Repeat sign-off",
            recording_type="daily-note",
            child_id=1,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 99, "workflow": {}},
    )
    first = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id, user, conn=MagicMock()
    )
    second = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id, user, conn=MagicMock()
    )
    assert first and second
    assert first.linked_archive_record_id == second.linked_archive_record_id
    assert second.sign_off_status == "already_signed_off"


def test_lifeecho_suggestion_on_positive_note(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Achievement",
            body="Young person achieved a personal goal and was proud",
            recording_type="daily-note",
            child_id=3,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 70, "workflow": {}},
    )
    result = recording_review_signoff_service.approve_and_sign_off_review(
        draft.id, user, conn=MagicMock()
    )
    assert result is not None
    assert result.formal_record_created is True
    assert isinstance(result.lifeecho_suggestion_ids, list)


def test_run_lifecycle_after_review_approval_uses_review_path(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Note",
            body="Content",
            recording_type="daily-note",
            child_id=2,
        ),
        user,
    )
    draft = draft.model_copy(update={"review_status": "approved", "manager_review_required": True})
    called = []

    def _spy(d, fr, cu, *, conn=None):
        called.append("review")
        return signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
            d, fr, cu, conn=conn
        )

    monkeypatch.setattr(signed_off_lifecycle_service, "run_lifecycle_for_review", _spy)
    from schemas.recording_submission import RecordingSubmissionResponse

    formal = RecordingSubmissionResponse(
        draft_id=draft.id,
        formal_record_created=True,
        linked_record_id="12",
    )
    recording_review_signoff_service.run_lifecycle_after_review_approval(
        draft, formal, user, conn=MagicMock()
    )
    assert called == ["review"]
