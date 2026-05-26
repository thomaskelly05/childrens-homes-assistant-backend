from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate, RecordingDraftRecord
from services.child_archive_service import child_archive_service
from services.lifeecho_memory_service import lifeecho_memory_service
from services.plan_impact_suggestion_service import plan_impact_suggestion_service
from services.recording_draft_service import recording_draft_service
from services.signed_off_lifecycle_service import (
    DRAFT_NOT_ARCHIVED,
    FORMAL_ROUTE_MISSING,
    MANAGER_REVIEW_ARCHIVE_BLOCK,
    signed_off_lifecycle_service,
)


@pytest.fixture(autouse=True)
def reset_memory(monkeypatch):
    recording_draft_service._memory = {}
    child_archive_service._memory = {}
    plan_impact_suggestion_service._memory = {}
    lifeecho_memory_service._suggestions = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(plan_impact_suggestion_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(lifeecho_memory_service, "_detect_storage_mode", lambda: "memory")


def test_skip_without_formal_id_never_archives(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Draft only",
            body="Not submitted formally",
            recording_type="daily-note",
            child_id=2,
        ),
        user,
    )
    result = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, None, user, conn=MagicMock()
    )
    assert result["skipped"] is True
    assert FORMAL_ROUTE_MISSING in result["warnings"][0]


def test_review_pending_blocks_archive(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Needs review",
            body="Content",
            recording_type="incident",
            child_id=2,
            manager_review_required=True,
        ),
        user,
    )
    draft = draft.model_copy(
        update={
            "review_status": "manager_review_required",
            "manager_review_required": True,
        }
    )
    result = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 99}, user, conn=MagicMock()
    )
    assert result["skipped"] is True
    assert MANAGER_REVIEW_ARCHIVE_BLOCK in result["warnings"][0]


def test_formal_daily_note_full_lifecycle(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Great day",
            body="Achievement at school",
            recording_type="daily-note",
            child_id=4,
        ),
        user,
    )
    draft = draft.model_copy(update={"review_status": "approved", "status": "submitted"})
    result = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 50}, user, conn=MagicMock()
    )
    assert result["archive_record_id"]
    assert result["chronology_event_id"]
    assert not result["skipped"]


def test_duplicate_archive_reuses_source(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Note",
            body="Repeat",
            recording_type="daily-note",
            child_id=1,
        ),
        user,
    )
    draft = draft.model_copy(update={"review_status": "approved", "status": "submitted"})
    first = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 77}, user, conn=MagicMock()
    )
    second = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 77}, user, conn=MagicMock()
    )
    assert first["archive_record_id"] == second["archive_record_id"]


def test_health_appointment_plan_impact(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="GP visit",
            body="Routine check",
            recording_type="health-appointment",
            child_id=3,
        ),
        user,
    )
    draft = draft.model_copy(update={"review_status": "approved", "status": "submitted"})
    result = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 12}, user, conn=MagicMock()
    )
    assert result["plan_impact_ids"]


def test_safeguarding_no_lifeecho(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Concern",
            body="Sensitive",
            recording_type="safeguarding-concern",
            child_id=1,
            safeguarding_sensitive=True,
        ),
        user,
    )
    draft = draft.model_copy(
        update={
            "review_status": "approved",
            "status": "submitted",
            "manager_review_required": False,
            "safeguarding_review_required": False,
        }
    )
    result = signed_off_lifecycle_service.run_lifecycle_for_signed_off_record(
        draft, {"id": 5}, user, conn=MagicMock()
    )
    assert result["archive_record_id"]
    assert not result["lifeecho_suggestion_ids"]
