from __future__ import annotations

from unittest.mock import patch

import pytest

from schemas.os_notifications import OsNotificationFeedResponse, OsNotificationItem
from schemas.recording_alerts import RecordingAlertListResponse
from services.os_cache_service import os_cache_service
from services.os_notification_adapter_service import os_notification_adapter_service
from services.os_notification_state_service import os_notification_state_service
from schemas.os_notifications import OsNotificationActionRequest


@pytest.fixture(autouse=True)
def clear_feed_cache():
    os_cache_service.clear()
    yield
    os_cache_service.clear()


def _feed() -> OsNotificationFeedResponse:
    return OsNotificationFeedResponse(
        items=[
            OsNotificationItem(
                id="test:1",
                notification_key="test:1",
                type="governance_notice",
                title="Test",
                safe_summary="Metadata only",
                route="/notifications",
                source="test",
                category="governance",
                created_at="2026-01-01T00:00:00Z",
            )
        ],
        unread_count=1,
        generated_at="2026-01-01T00:00:00Z",
    )


def test_notification_feed_cache_hit(fake_state):
    user = fake_state["user"]
    with patch.object(os_notification_adapter_service, "build_feed", return_value=_feed()) as build:
        os_notification_adapter_service.build_feed_cached(user, limit=10, conn=None)
        _, lookup2 = os_notification_adapter_service.build_feed_cached(user, limit=10, conn=None)
    assert build.call_count == 1
    assert lookup2.status == "hit"


def test_notification_action_invalidates_cache(fake_state):
    user = fake_state["user"]
    os_notification_adapter_service.build_feed_cached(user, limit=10, conn=None)
    key = os_notification_adapter_service._feed_cache_key(user, limit=10, unread_only=False)
    assert os_cache_service.get(key).hit is True

    with (
        patch.object(os_notification_state_service, "_persist_state", return_value={"status": "read", "unread": False}),
        patch.object(os_notification_state_service, "record_audit", return_value=None),
    ):
        os_notification_state_service.set_state(
            "test:1",
            OsNotificationActionRequest(action="mark_read"),
            user,
            conn=None,
        )

    assert os_cache_service.get(key).hit is False


def test_notification_feed_skips_optional_sources_for_small_limit(fake_state):
    user = {**fake_state["user"], "role": "manager"}
    with (
        patch("services.os_notification_adapter_service._is_manager_view", return_value=True),
        patch(
            "services.os_notification_adapter_service.recording_alert_service.list_alerts",
            return_value=RecordingAlertListResponse(items=[]),
        ),
        patch(
            "services.os_notification_adapter_service.isn_notification_adapter_service.build_os_items",
            return_value=[],
        ),
        patch.object(os_notification_adapter_service, "_daily_brief_item", return_value=None),
        patch(
            "services.os_notification_adapter_service.is_pool_under_pressure",
            return_value=True,
        ),
    ):
        feed = os_notification_adapter_service.build_feed(user, limit=10, conn=None)
    assert any("Optional" in line or "pool" in line.lower() for line in (feed.limitations or []))
