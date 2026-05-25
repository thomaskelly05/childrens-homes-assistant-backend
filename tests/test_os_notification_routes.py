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
    assert any("preferences" in p for p in paths)
    assert any("escalations" in p for p in paths)


def test_preferences_health_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.notification_preferences_health(
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert result["data"]["service"] == "os_notification_preference_service"


def test_preferences_get_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.get_notification_preferences(
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert "preferences" in result["data"]


def test_escalation_check_route(fake_state):
    user = fake_state["user"]
    from schemas.os_notification_preferences import NotificationEscalationCheckRequest

    result = asyncio.run(
        os_notification_routes.run_notification_escalation_check(
            payload=NotificationEscalationCheckRequest(dry_run=True),
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert "candidates" in result["data"]
    assert "recommendations" in result["data"]


def test_escalation_rules_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.list_notification_escalation_rules(
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert len(result["data"]) >= 1


def test_escalation_runs_route(fake_state):
    user = fake_state["user"]
    asyncio.run(
        os_notification_routes.run_notification_escalation_check(
            payload=None,
            current_user=user,
            conn=None,
        )
    )
    result = asyncio.run(
        os_notification_routes.list_notification_escalation_runs(
            home_id=None,
            limit=10,
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True
    assert result["metadata_only"] is True


def test_last_escalation_run_route(fake_state):
    user = fake_state["user"]
    result = asyncio.run(
        os_notification_routes.get_last_notification_escalation_run(
            current_user=user,
            conn=None,
        )
    )
    assert result["success"] is True


def test_analytics_routes(fake_state):
    user = fake_state["user"]
    health = asyncio.run(
        os_notification_routes.notification_analytics_health(current_user=user, conn=None)
    )
    assert health["success"] is True
    metrics = asyncio.run(
        os_notification_routes.notification_response_metrics(
            home_id=None,
            source=None,
            category=None,
            current_user=user,
            conn=None,
        )
    )
    assert metrics["success"] is True
    assert "urgent_unacknowledged" in metrics["data"]
    gov = asyncio.run(
        os_notification_routes.notification_governance_summary(
            home_id=None,
            current_user=user,
            conn=None,
        )
    )
    assert gov["success"] is True
    auto = asyncio.run(
        os_notification_routes.notification_automation_health(current_user=user, conn=None)
    )
    assert auto["success"] is True
    assert auto["data"]["scheduler_configured"] is False


def test_new_routes_registered():
    paths = [getattr(r, "path", "") for r in os_notification_routes.router.routes]
    assert any("escalations/runs" in p for p in paths)
    assert any("escalations/last-run" in p for p in paths)
    assert any("analytics/health" in p for p in paths)
    assert any("analytics/governance-summary" in p for p in paths)
    assert any("automation/health" in p for p in paths)
