from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_submission import RecordingSubmissionRequest
from services.child_archive_service import child_archive_service
from services.recording_draft_service import recording_draft_service
from services.recording_submission_router_service import recording_submission_router_service


@pytest.fixture(autouse=True)
def reset_services(monkeypatch):
    recording_draft_service._memory = {}
    child_archive_service._memory = {}
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(child_archive_service, "_detect_storage_mode", lambda: "memory")
    from services.plan_impact_suggestion_service import plan_impact_suggestion_service
    from services.lifeecho_memory_service import lifeecho_memory_service

    plan_impact_suggestion_service._memory = {}
    lifeecho_memory_service._suggestions = {}
    monkeypatch.setattr(plan_impact_suggestion_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(lifeecho_memory_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(
        "services.signed_off_lifecycle_service.child_archive_service._detect_storage_mode",
        lambda: "memory",
    )


def test_submission_links_archive_and_chronology(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Calm day",
            body="Achievement at school",
            recording_type="daily-note",
            child_id=4,
        ),
        user,
    )
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 50, "workflow": {}},
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=True),
        user,
        conn=MagicMock(),
    )
    assert result
    assert result.linked_archive_record_id
    assert result.formal_record_created
