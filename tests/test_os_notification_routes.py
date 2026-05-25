from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from routers import os_notification_routes
from schemas.recording_drafts import RecordingDraftCreate
from services.os_notification_state_service import os_notification_state_service
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


REPO_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def memory_mode(monkeypatch):
    os_notification_state_service._memory = {}
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(os_notification_state_service, "_detect_storage_mode", lambda conn=None: "memory")


def test_operational_feed_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.operational_notification_feed(
            unread_only=False,
            limit=30,
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert result["metadata_only"] is True
    assert "items" in result["data"]


def test_operational_summary_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.operational_notification_summary(
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert "unread_count" in result["data"]


def test_notification_action_route(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Route test",
            body="X",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    recording_alert_service.generate_alerts(user, conn=None)
    alert_id = recording_alert_service.list_alerts(user, conn=None).items[0].id
    from schemas.os_notifications import OsNotificationActionRequest

    result = asyncio.run(
        os_notification_routes.operational_notification_action(
            notification_key=f"recording_alert:{alert_id}",
            action=OsNotificationActionRequest(action="mark_read"),
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert result["data"]["success"] is True


def test_routes_registered():
    paths = [getattr(r, "path", "") for r in os_notification_routes.router.routes]
    assert any("operational-feed" in p for p in paths)
    assert any("operational-summary" in p for p in paths)
    assert any("mark-all-read" in p for p in paths)
    assert any("action" in p for p in paths)
