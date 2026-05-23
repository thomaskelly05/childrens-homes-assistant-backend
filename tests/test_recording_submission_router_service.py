from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate, RecordingDraftSubmitRequest
from schemas.recording_submission import RecordingSubmissionRequest
from services.recording_draft_service import recording_draft_service
from services.recording_submission_router_service import recording_submission_router_service


@pytest.fixture(autouse=True)
def memory_drafts(monkeypatch):
    svc = recording_draft_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_submits_supported_draft_when_service_mocked(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Daily",
            body="Calm day",
            recording_type="daily-note",
            child_id=7,
        ),
        user,
    )
    mock_conn = MagicMock()
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        lambda conn, **kwargs: {"id": 101, "workflow": {"chronology_event_id": 202}},
    )

    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=True),
        user,
        conn=mock_conn,
    )
    assert result
    assert result.submitted is True
    assert result.formal_record_created is True
    assert result.linked_record_id == "101"
    assert result.linked_chronology_id == "202"


def test_draft_only_when_unsupported(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Room",
            body="Search notes",
            recording_type="room-search",
        ),
        user,
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id),
        user,
        conn=None,
    )
    assert result
    assert result.submitted is True
    assert result.formal_record_created is False
    assert any("not wired" in w.lower() for w in result.warnings)


def test_review_required_blocks_high_risk_formal_creation(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Safeguarding",
            body="Concern noted",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    create_called = {"count": 0}

    def _create(*args, **kwargs):
        create_called["count"] += 1
        return {"id": 1}

    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonDailyNotesService.create_daily_note",
        _create,
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=False),
        user,
        conn=MagicMock(),
    )
    assert result
    assert result.formal_record_created is False
    assert any("review" in w.lower() for w in result.warnings)
    assert create_called["count"] == 0


def test_honest_warnings_no_fake_formal(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(title="X", body="Y", recording_type="complaint-concern"),
        user,
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id),
        user,
        conn=None,
    )
    assert result.formal_record_created is False
    assert result.linked_record_id is None
    assert result.linked_chronology_id is None


def test_keywork_creates_formal_when_mocked(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Keywork session",
            body="Worked on goals",
            recording_type="keywork",
            child_id=7,
        ),
        user,
    )
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonKeyworkService.create_keywork",
        lambda conn, **kwargs: {"id": 88, "workflow": {"chronology_event_id": 89}},
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=True),
        user,
        conn=MagicMock(),
    )
    assert result.formal_record_created is True
    assert result.linked_record_id == "88"


def test_route_to_existing_workflow_no_formal(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(title="Handover", body="Shift notes", recording_type="handover"),
        user,
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id),
        user,
        conn=MagicMock(),
    )
    assert result.formal_record_created is False
    assert result.target_status == "route_to_existing_workflow"
    assert any("not wired" in w.lower() for w in result.warnings)


def test_missing_blocked_without_review(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Missing",
            body="Left property",
            recording_type="missing",
            child_id=7,
            home_id=1,
            manager_review_required=True,
        ),
        user,
    )
    create_called = {"count": 0}

    def _create(*args, **kwargs):
        create_called["count"] += 1
        return type("R", (), {"id": "me-1"})()

    monkeypatch.setattr(
        "services.recording_submission_router_service.MissingEpisodeService",
        lambda: type("S", (), {"create": _create})(),
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=False),
        user,
        conn=MagicMock(),
    )
    assert result.formal_record_created is False
    assert create_called["count"] == 0


def test_incident_without_child_no_formal(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Incident",
            body="Details",
            recording_type="incident",
            manager_review_required=True,
        ),
        user,
    )
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonIncidentsService.create_incident",
        lambda *a, **k: {"id": 50, "workflow": {}},
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id, confirm_reviewed=True),
        user,
        conn=MagicMock(),
    )
    assert result.formal_record_created is False
