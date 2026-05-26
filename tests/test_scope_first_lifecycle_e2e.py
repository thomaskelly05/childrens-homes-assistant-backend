"""Scope-first signed-off record lifecycle regression coverage."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from schemas.recording_submission import RecordingSubmissionRequest
from services.child_archive_service import child_archive_service
from services.recording_draft_service import recording_draft_service
from services.recording_submission_router_service import recording_submission_router_service
from services.signed_off_lifecycle_service import MANAGER_REVIEW_ARCHIVE_BLOCK

REPO = Path(__file__).resolve().parents[1]


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


def test_draft_submission_does_not_archive(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Unsupported",
            body="Body",
            recording_type="complaint",
            child_id=1,
        ),
        user,
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id),
        user,
        conn=MagicMock(),
    )
    assert result
    assert result.submitted
    assert not result.formal_record_created
    assert not result.linked_archive_record_id


def test_formal_daily_note_submission_links_lifecycle(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Calm day",
            body="Achievement",
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
    assert result.linked_archive_record_id
    assert result.linked_chronology_id
    assert result.formal_record_created


def test_review_blocked_submission_warns_archive(fake_state, monkeypatch):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Incident",
            body="Serious",
            recording_type="incident",
            child_id=2,
            manager_review_required=True,
        ),
        user,
    )
    monkeypatch.setattr(
        "services.recording_submission_router_service.YoungPersonIncidentsService.create_incident",
        lambda conn, **kwargs: {"id": 9, "workflow": {}},
    )
    result = recording_submission_router_service.submit_draft(
        draft.id,
        RecordingSubmissionRequest(draft_id=draft.id),
        user,
        conn=MagicMock(),
    )
    assert any(MANAGER_REVIEW_ARCHIVE_BLOCK in w for w in result.warnings)
    assert not result.linked_archive_record_id


def test_scope_routes_use_assistant_orb():
    text = (REPO / "frontend-next" / "lib" / "navigation" / "scope-routes.ts").read_text(encoding="utf-8")
    assert "/assistant/orb" in text
    assert 'href="/orb"' not in text


def test_no_os_young_people_browser_paths_in_workspace():
    normaliser = REPO / "frontend-next" / "lib" / "young-people" / "child-workspace-normaliser.ts"
    assert "/os/young-people" not in normaliser.read_text(encoding="utf-8")


def test_submission_result_ui_shows_lifecycle_ids():
    ui = (REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-submission-result.tsx").read_text(
        encoding="utf-8"
    )
    assert "recording-submission-archive" in ui
    assert "recording-submission-plan-impacts" in ui
    assert "recording-submission-lifeecho" in ui


def test_audit_doc_exists():
    assert (REPO / "docs" / "scope-first-lifecycle-hardening-audit.md").is_file()
