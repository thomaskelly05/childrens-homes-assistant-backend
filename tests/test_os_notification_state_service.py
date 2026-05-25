from __future__ import annotations

import pytest

from schemas.os_notifications import OsNotificationActionRequest, OsNotificationItem
from schemas.recording_drafts import RecordingDraftCreate
from services.isn_digest_service import isn_digest_service
from services.os_notification_state_service import os_notification_state_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def reset_state(monkeypatch):
    os_notification_state_service._memory = {}
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    isn_digest_service._memory_alerts = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(os_notification_state_service, "_detect_storage_mode", lambda conn=None: "memory")


def test_apply_state_marks_unread(fake_state):
    user = fake_state["user"]
    item = OsNotificationItem(
        id="test:1",
        notification_key="test:1",
        type="generic",
        title="Test",
        safe_summary="Safe summary only",
        route="/notifications",
        source="system",
        created_at="2026-01-01T00:00:00Z",
        unread=True,
    )
    os_notification_state_service.mark_read("test:1", user, conn=None)
    merged = os_notification_state_service.apply_state([item], user, conn=None)
    assert merged[0].unread is False
    assert merged[0].status == "read"


def test_acknowledge_recording_alert_sync(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="State test",
            body="SECRET",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    alerts = recording_alert_service.list_alerts(user, conn=None)
    alert_id = alerts.items[0].id
    key = f"recording_alert:{alert_id}"
    result = os_notification_state_service.acknowledge(
        key,
        OsNotificationActionRequest(action="acknowledge"),
        user,
        conn=None,
    )
    assert result.success
    updated = recording_alert_service.get_alert(alert_id, user, conn=None)
    assert updated.status == "acknowledged"


def test_no_raw_body_fields_in_memory_state(fake_state):
    user = fake_state["user"]
    os_notification_state_service.set_state(
        "test:raw",
        OsNotificationActionRequest(action="mark_read"),
        user,
        conn=None,
    )
    stored = os_notification_state_service._memory.get("test:raw", {})
    assert "safe_summary" not in stored
    assert "body" not in stored
    assert "narrative" not in str(stored.get("metadata", {})).lower()


def test_isn_resolve_blocked_for_safeguarding_type(fake_state):
    user = fake_state["user"]
    result = os_notification_state_service.set_state(
        "isn:abc",
        OsNotificationActionRequest(
            action="resolve",
            metadata={"item_type": "isn_escalation_required"},
        ),
        user,
        source="isn",
        conn=None,
    )
    assert result.success is False
