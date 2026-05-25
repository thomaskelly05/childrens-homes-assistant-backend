from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.child_archive_service import child_archive_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def reset_archive(monkeypatch):
    child_archive_service._memory = {}
    recording_draft_service._memory = {}
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_signed_off_creates_archive(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Great day",
            body="Played football",
            recording_type="daily-note",
            child_id=3,
        ),
        user,
    )
    formal = {"id": 99, "workflow": {}}
    archive = child_archive_service.create_from_signed_off_record(draft, formal, user, conn=None)
    assert archive is not None
    assert archive.source_id == "99"
    assert archive.status == "signed_off"
    assert "football" not in archive.safe_summary or "Played" in archive.safe_summary


def test_draft_without_formal_not_archived(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(title="Draft only", body="secret", recording_type="daily-note", child_id=3),
        user,
    )
    assert child_archive_service.create_from_signed_off_record(draft, None, user, conn=None) is None


def test_archive_filter_by_child(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(title="Note", body="Calm", recording_type="daily-note", child_id=5),
        user,
    )
    child_archive_service.create_from_signed_off_record(draft, {"id": 1}, user, conn=None)
    from schemas.child_archive import ChildArchiveFilter

    listed = child_archive_service.list_archive(ChildArchiveFilter(child_id=5), user, conn=None)
    assert listed.total >= 1
    assert all(r.child_id == 5 for r in listed.records)


def test_safeguarding_safe_summary(fake_state):
    from schemas.recording_drafts import RecordingDraftUpdate

    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Concern",
            body="Raw narrative must not appear",
            recording_type="safeguarding-concern",
            child_id=2,
            safeguarding_sensitive=True,
            safeguarding_review_required=True,
        ),
        user,
    )
    draft = recording_draft_service.update_draft(
        draft.id,
        RecordingDraftUpdate(review_status="approved"),
        user,
        conn=None,
    )
    archive = child_archive_service.create_from_signed_off_record(draft, {"id": 8}, user, conn=None)
    assert archive
    assert "Raw narrative" not in archive.safe_summary
