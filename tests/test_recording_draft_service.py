from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate, RecordingDraftListRequest, RecordingDraftSubmitRequest, RecordingDraftUpdate
from services.recording_draft_service import FORMAL_SUBMIT_WARNING, recording_draft_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    svc = recording_draft_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def _user(user_id: str = "42", role: str = "staff", home_id: int = 1):
    return {
        "id": user_id,
        "email": "staff@example.com",
        "role": role,
        "home_id": home_id,
        "first_name": "Test",
        "last_name": "User",
    }


def test_create_update_list_get_draft(fake_state):
    user = fake_state["user"]
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily note",
            body="Child had a calm evening.",
            recording_type="daily-note",
            context_type="child",
            child_id=7,
            child_name="Alex",
        ),
        user,
    )
    assert created.id
    assert created.status == "draft"

    updated = recording_draft_service.update_draft(
        created.id,
        RecordingDraftUpdate(body="Child had a calm evening with keyworker support."),
        user,
    )
    assert updated
    assert "keyworker" in updated.body

    listed = recording_draft_service.list_drafts(user, RecordingDraftListRequest())
    assert listed.total == 1
    assert listed.items[0].id == created.id

    fetched = recording_draft_service.get_draft(created.id, user)
    assert fetched
    assert fetched.title == "Daily note"


def test_archive_delete_ready_submit(fake_state):
    user = fake_state["user"]
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Incident",
            body="Restraint used after de-escalation.",
            recording_type="incident",
            manager_review_required=True,
            safeguarding_review_required=True,
        ),
        user,
    )
    assert created.manager_review_required is True
    assert created.review_status == "safeguarding_review_required"

    ready = recording_draft_service.mark_ready_for_review(created.id, user)
    assert ready
    assert ready.status == "ready_for_review"
    assert ready.review_status in {"awaiting_review", "safeguarding_review_required"}
    assert (ready.metadata or {}).get("review_priority")

    submitted = recording_draft_service.submit_draft(
        created.id,
        RecordingDraftSubmitRequest(submitted_to="draft_workspace"),
        user,
    )
    assert submitted
    assert submitted.formal_record_created is False
    assert submitted.draft.status == "submitted"
    warning_lower = submitted.warning.lower()
    assert (
        "not wired" in warning_lower
        or "review" in warning_lower
        or "young person" in warning_lower
        or "database" in warning_lower
    )

    archived = recording_draft_service.archive_draft(created.id, user)
    assert archived
    assert archived.status == "archived"

    deleted = recording_draft_service.delete_draft(created.id, user)
    assert deleted
    assert deleted.status == "deleted"


def test_access_denied_for_non_owner(fake_state):
    owner = fake_state["user"]
    other = _user(user_id="99", role="staff", home_id=2)
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(title="Private", body="Details", recording_type="daily-note"),
        owner,
    )
    assert recording_draft_service.get_draft(created.id, other) is None


def test_manager_can_access_home_draft(fake_state):
    owner = _user(user_id="10", role="staff", home_id=3)
    manager = _user(user_id="11", role="registered_manager", home_id=3)
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Handover",
            body="Shift notes",
            recording_type="handover",
            home_id=3,
        ),
        owner,
    )
    assert recording_draft_service.get_draft(created.id, manager)


def test_db_fallback_uses_memory(monkeypatch, fake_state):
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    created = recording_draft_service.create_draft(
        RecordingDraftCreate(title="Fallback", body="Text", recording_type="daily-note"),
        fake_state["user"],
        conn=None,
    )
    assert created.id in recording_draft_service._memory
