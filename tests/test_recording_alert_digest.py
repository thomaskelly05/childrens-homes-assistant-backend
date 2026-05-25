from __future__ import annotations

import pytest

from schemas.recording_drafts import RecordingDraftCreate
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_alerts(monkeypatch):
    recording_alert_service._memory = {}
    recording_alert_service._last_check_run = None
    recording_alert_service._check_runs = []
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_build_digest_metadata_only(fake_state):
    user = fake_state["user"]
    secret = "RAW DIGEST BODY MUST NOT APPEAR"
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Digest test",
            body=secret,
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
            privacy_flags=["identifier:phone"],
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    digest = recording_alert_service.build_digest(user, conn=None)
    dumped = digest.model_dump_json()
    assert secret not in dumped
    assert digest.privacy_notice
    assert digest.total_open >= 1
    assert digest.recommendations
    assert digest.routes.alerts == "/record/alerts"


def test_build_badge_summary_lightweight(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Badge",
            body="SECRET",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    badge = recording_alert_service.build_badge_summary(user, conn=None)
    assert badge.total_open >= 1
    assert badge.route == "/record/alerts"
    assert badge.tone in ("neutral", "attention", "urgent")


def test_run_checks_returns_run_metadata(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Check run",
            body="SECRET",
            recording_type="incident",
            privacy_flags=["x"],
        ),
        user,
    )
    run = recording_alert_service.run_alert_checks(user, conn=None)
    assert run.run_id
    assert run.completed_at
    assert run.generated >= 0
    assert run.metadata.get("no_raw_body") is True


def test_last_check_present_after_run(fake_state):
    user = fake_state["user"]
    recording_alert_service.run_alert_checks(user, conn=None)
    last = recording_alert_service.get_last_check(user, conn=None)
    assert last is not None
    assert last.run_id


def test_digest_recommendations_generated(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Rec",
            body="SECRET",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
            privacy_flags=["id"],
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    listed = recording_alert_service.list_alerts(user, conn=None)
    recs = recording_alert_service.build_digest_recommendations(
        listed.items, recording_alert_service.build_alert_summary(listed.items)
    )
    assert any("safeguarding" in r.lower() for r in recs)
    assert any("ORB" in r for r in recs)
