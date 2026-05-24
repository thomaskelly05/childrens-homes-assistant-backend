from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_review import RecordingReviewActionRequest, RecordingReviewQueueFilters
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import recording_review_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    recording_draft_service._memory = {}
    recording_review_service._memory_events = []
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_review_service, "_detect_storage_mode", lambda: "memory")


def test_lists_awaiting_review(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Safeguarding",
            body="Concern",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    queue = recording_review_service.list_review_queue(
        user, RecordingReviewQueueFilters(), conn=None
    )
    assert queue.total >= 1
    assert any(item.draft_id == draft.id for item in queue.items)


def test_builds_priority_urgent_for_safeguarding(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Concern",
            body="Details",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
            safeguarding_sensitive=True,
        ),
        user,
    )
    assert recording_review_service.build_review_priority(draft) == "urgent"


def test_approve_sets_status(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Restraint",
            body="Details",
            recording_type="physical-intervention",
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    record = recording_draft_service.get_draft(draft.id, user)
    assert record is not None
    result = recording_review_service.approve_draft(
        record,
        RecordingReviewActionRequest(decision="approve", comments="Reviewed"),
        user,
    )
    assert result.success is True
    assert result.review_status == "approved"
    refreshed = recording_draft_service.get_draft(draft.id, user)
    assert refreshed is not None
    assert refreshed.review_status == "approved"


def test_request_changes(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Med error",
            body="Wrong dose",
            recording_type="medication-error",
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    record = recording_draft_service.get_draft(draft.id, user)
    assert record is not None
    result = recording_review_service.request_changes(
        record,
        RecordingReviewActionRequest(decision="request_changes", comments="Add times"),
        user,
    )
    assert result.review_status == "changes_requested"


def test_safeguarding_escalation(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Disclosure",
            body="Text",
            recording_type="disclosure",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    record = recording_draft_service.get_draft(draft.id, user)
    assert record is not None
    result = recording_review_service.mark_safeguarding_escalation(
        record,
        RecordingReviewActionRequest(decision="mark_safeguarding_escalation"),
        user,
    )
    assert result.review_status == "safeguarding_escalation_required"


def test_creator_cannot_self_approve_high_risk(fake_state):
    staff_user = {
        **fake_state["user"],
        "role": "staff",
        "id": 999,
        "user_id": 999,
    }
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Own draft",
            body="Body",
            recording_type="safeguarding-concern",
            manager_review_required=True,
            safeguarding_review_required=True,
        ),
        staff_user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, staff_user)
    result = recording_review_service.apply_review_action(
        draft.id,
        RecordingReviewActionRequest(decision="approve"),
        staff_user,
    )
    assert result is not None
    assert result.success is False


def test_audit_event_created(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Incident",
            body="Body",
            recording_type="incident",
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    record = recording_draft_service.get_draft(draft.id, user)
    assert record is not None
    recording_review_service.approve_draft(
        record,
        RecordingReviewActionRequest(decision="approve"),
        user,
    )
    assert len(recording_review_service._memory_events) >= 1


def test_access_denied_unrelated_user(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Private",
            body="Body",
            recording_type="incident",
            home_id=99,
            manager_review_required=True,
        ),
        user,
    )
    other = {**user, "id": 8888, "user_id": 8888, "home_id": 1, "role": "staff"}
    detail = recording_review_service.get_review_detail(draft.id, other, conn=None)
    assert detail is None


def test_submit_after_approval_when_approved(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily",
            body="Calm day",
            recording_type="daily-note",
            child_id=7,
            manager_review_required=True,
        ),
        user,
    )
    recording_draft_service.mark_ready_for_review(draft.id, user)
    record = recording_draft_service.get_draft(draft.id, user)
    assert record is not None
    recording_review_service.approve_draft(
        record,
        RecordingReviewActionRequest(decision="approve"),
        user,
    )
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 55, "workflow": {}},
    )
    refreshed = recording_draft_service.get_draft(draft.id, user)
    assert refreshed is not None
    result = recording_review_service.submit_after_approval(
        refreshed,
        RecordingReviewActionRequest(decision="submit_after_approval", confirm_reviewed=True),
        user,
        conn=object(),
    )
    assert result.formal_record_created is True
