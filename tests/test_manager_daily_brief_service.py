from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.manager_daily_brief_service import manager_daily_brief_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_mode(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_build_brief_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW BRIEF BODY MUST NOT APPEAR"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Brief test",
            body=secret,
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    brief = manager_daily_brief_service.build_brief(user, conn=None)
    dumped = brief.model_dump_json()
    assert secret not in dumped
    assert brief.recording_summary
    assert brief.review_summary
    assert brief.safeguarding_summary
    assert brief.recommendations
    assert brief.privacy_notice
    assert any(s.id == "recording_alerts" for s in brief.sections)
    assert any(s.id == "reviews" for s in brief.sections)
    assert any(s.id == "handover" for s in brief.sections)
    assert brief.metadata.get("no_raw_body") is True


def test_mark_reviewed_hides_brief_reminder(fake_state):
    user = fake_state["user"]
    assert not manager_daily_brief_service.is_reviewed_today(user)
    manager_daily_brief_service.mark_reviewed(user)
    assert manager_daily_brief_service.is_reviewed_today(user)
    brief = manager_daily_brief_service.build_brief(user, conn=None)
    assert brief.reviewed is True
