from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from schemas.os_notifications import OsNotificationFeedResponse, OsNotificationItem
from services.os_notification_analytics_service import os_notification_analytics_service
from services.os_notification_escalation_service import os_notification_escalation_service


@pytest.fixture(autouse=True)
def reset_memory():
    os_notification_escalation_service._memory_runs = []
    yield


def _urgent_item() -> OsNotificationItem:
    return OsNotificationItem(
        id="isn:1",
        notification_key="isn:1",
        type="isn_safeguarding_alert",
        title="Urgent",
        safe_summary="Safe summary only",
        severity="urgent",
        status="unread",
        unread=True,
        route="/safeguarding",
        source="isn",
        category="safeguarding_network",
        created_at="2026-05-25T08:00:00+00:00",
        metadata={"no_raw_body": True},
    )


def test_response_metrics_counts():
    user = {"id": "u1", "role": "registered_manager"}
    feed = OsNotificationFeedResponse(
        items=[_urgent_item()],
        unread_count=1,
        urgent_count=1,
        generated_at="2026-05-25T12:00:00+00:00",
        categories={},
        privacy_notice="",
        limitations=[],
        available=True,
    )
    with patch(
        "services.os_notification_analytics_service.os_notification_adapter_service.build_feed",
        return_value=feed,
    ):
        metrics = os_notification_analytics_service.build_response_metrics(user, conn=None)
    assert metrics.urgent_unacknowledged >= 1
    assert metrics.safeguarding_unacknowledged >= 1


def test_governance_summary_structure():
    user = {"id": "u2", "role": "admin"}
    with patch(
        "services.os_notification_analytics_service.os_notification_adapter_service.build_feed",
        return_value=OsNotificationFeedResponse(
            items=[],
            unread_count=0,
            urgent_count=0,
            generated_at="2026-05-25T12:00:00+00:00",
            categories={},
            privacy_notice="",
            limitations=[],
            available=True,
        ),
    ):
        summary = os_notification_analytics_service.build_governance_summary(user, conn=None)
    assert summary.urgent_override_active is True
    assert summary.push_configured is False
    assert summary.email_configured is False
    assert summary.metadata.get("no_raw_body") is True


def test_automation_health_flags():
    user = {"id": "u3", "role": "registered_manager"}
    health = os_notification_analytics_service.build_automation_health(user, conn=None)
    assert health.scheduler_configured is False
    assert health.push_configured is False
    assert health.email_configured is False


def test_degraded_when_feed_fails():
    user = {"id": "u4", "role": "admin"}
    with patch(
        "services.os_notification_analytics_service.os_notification_adapter_service.build_feed",
        side_effect=RuntimeError("unavailable"),
    ):
        metrics = os_notification_analytics_service.build_response_metrics(user, conn=None)
    assert metrics.metadata.get("degraded") is True
