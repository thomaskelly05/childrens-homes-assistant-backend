from __future__ import annotations

import pytest

from schemas.child_archive import ChildArchiveRecord
from schemas.recording_drafts import RecordingDraftCreate
from services.lifeecho_memory_service import lifeecho_memory_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory(monkeypatch):
    lifeecho_memory_service._memories = {}
    lifeecho_memory_service._suggestions = {}
    monkeypatch.setattr(lifeecho_memory_service, "_detect_storage_mode", lambda: "memory")


def test_positive_daily_note_suggestion(fake_state):
    user = fake_state["user"]
    archive = ChildArchiveRecord(
        id="a1",
        child_id=1,
        title="Great day",
        safe_summary="Enjoyed football and smiled a lot",
        source_type="daily-note",
        source_id="1",
    )
    suggestion = lifeecho_memory_service.suggest_from_archive(archive, user, conn=None)
    assert suggestion is not None
    assert suggestion.status == "suggested"


def test_safeguarding_not_suggested(fake_state):
    user = fake_state["user"]
    archive = ChildArchiveRecord(
        id="a2",
        child_id=1,
        title="Concern",
        safe_summary="Safeguarding placeholder",
        source_type="safeguarding-concern",
        source_id="2",
        safeguarding_sensitive=True,
    )
    assert lifeecho_memory_service.suggest_from_archive(archive, user, conn=None) is None


def test_incident_not_auto_lifeecho(fake_state):
    user = fake_state["user"]
    draft = recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Incident",
            body="Distressing",
            recording_type="incident",
            child_id=1,
            safeguarding_sensitive=True,
        ),
        user,
    )
    assert lifeecho_memory_service.suggest_from_draft(draft, None, user, conn=None) is None
