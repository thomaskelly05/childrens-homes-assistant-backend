from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.isn_digest_service import isn_digest_service
from services.manager_daily_brief_service import manager_daily_brief_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_mode(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    isn_digest_service._memory_alerts = {}
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
    handover_section = next(s for s in brief.sections if s.id == "handover")
    assert handover_section.route == "/handover"
    assert any(i.route == "/handover" for i in handover_section.items)
    assert handover_section.metadata.get("handover_reviews_route") == "/handover/reviews"
    assert any(s.id == "isn_safeguarding_network" for s in brief.sections)
    assert any(s.id == "notification_oversight" for s in brief.sections)
    assert brief.isn_summary is not None
    assert brief.metadata.get("no_raw_body") is True


def test_notification_oversight_section(fake_state):
    user = fake_state["user"]
    section = manager_daily_brief_service.build_notification_oversight_section(user, conn=None)
    dumped = section.model_dump_json()
    assert "RAW" not in dumped.upper() or "raw" not in section.summary.lower()
    assert section.id == "notification_oversight"
    assert section.metadata.get("no_raw_body") is True
    assert "/notifications/settings" in section.route


def test_isn_section_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW ISN BRIEF NARRATIVE"
    isn_digest_service.seed_memory_alert(title=secret)
    section = manager_daily_brief_service.build_isn_section(user, conn=None)
    dumped = section.model_dump_json()
    assert secret not in dumped
    assert section.metadata.get("metadata_only") is True
    for item in section.items:
        assert item.metadata.get("no_raw_body") is True


def test_mark_reviewed_hides_brief_reminder(fake_state):
    user = fake_state["user"]
    assert not manager_daily_brief_service.is_reviewed_today(user)
    manager_daily_brief_service.mark_reviewed(user)
    assert manager_daily_brief_service.is_reviewed_today(user)
    brief = manager_daily_brief_service.build_brief(user, conn=None)
    assert brief.reviewed is True


def test_mark_reviewed_persists_in_memory(fake_state):
    user = fake_state["user"]
    manager_daily_brief_service.mark_reviewed(user, conn=None)
    key = manager_daily_brief_service._review_key(user)
    assert key in manager_daily_brief_service._reviewed
