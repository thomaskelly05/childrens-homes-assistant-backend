from __future__ import annotations

import asyncio
from unittest.mock import patch

import pytest

from db.connection import DatabaseUnavailableError
from routers import recording_alert_routes
from schemas.recording_alerts import RecordingAlertBadgeSummary
from services.os_cache_service import os_cache_service


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def memory_alerts(monkeypatch):
    from services.recording_alert_service import recording_alert_service

    recording_alert_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    os_cache_service.clear()
    yield
    os_cache_service.clear()


def test_recording_badge_returns_counts(fake_state):
    user = fake_state["user"]
    from services.recording_alert_service import recording_alert_service

    badge = RecordingAlertBadgeSummary(total_open=3, urgent=1, tone="attention")
    with patch.object(recording_alert_service, "build_badge_summary", return_value=badge):
        result = recording_alert_service.build_badge_summary(user, conn=None)
    assert result.total_open == 3
    assert result.urgent == 1


def test_recording_badge_cache_hit_route(fake_state):
    user = {**fake_state["user"], "role": "manager"}
    badge = RecordingAlertBadgeSummary(total_open=2, urgent=1, tone="attention")
    with patch.object(
        recording_alert_routes.recording_alert_service,
        "build_badge_summary",
        return_value=badge,
    ) as build:
        _run(recording_alert_routes.recording_alerts_badge_summary(current_user=user, conn=None))
        _run(recording_alert_routes.recording_alerts_badge_summary(current_user=user, conn=None))
    assert build.call_count == 1


def test_recording_badge_db_unavailable_fallback(fake_state):
    user = {**fake_state["user"], "role": "manager"}
    with patch.object(
        recording_alert_routes.recording_alert_service,
        "build_badge_summary",
        side_effect=DatabaseUnavailableError("busy"),
    ):
        response = _run(recording_alert_routes.recording_alerts_badge_summary(current_user=user, conn=None))
    assert response["data"]["degraded"] is True
    assert response["data"]["total_open"] == 0
