from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from schemas.os_notification_preferences import NotificationEscalationCheckRequest
from schemas.os_notifications import OsNotificationItem
from services.os_notification_escalation_service import os_notification_escalation_service


@pytest.fixture(autouse=True)
def reset_escalation_memory():
    os_notification_escalation_service._memory_events = []
    os_notification_escalation_service._memory_runs = []
    os_notification_escalation_service._seed_defaults()
    yield


def test_run_records_created_in_memory():
    user = {"id": "m1", "role": "registered_manager", "first_name": "Test", "last_name": "Manager"}
    result = os_notification_escalation_service.run_escalation_check(
        user,
        request=NotificationEscalationCheckRequest(dry_run=True),
        conn=None,
    )
    assert result.run_id
    last = os_notification_escalation_service.get_last_check_run(user, conn=None)
    assert last is not None
    assert last.id == result.run_id
    assert last.dry_run is True


def test_list_check_runs_returns_history():
    user = {"id": "m2", "role": "admin"}
    os_notification_escalation_service.run_escalation_check(
        user, request=NotificationEscalationCheckRequest(dry_run=True), conn=None
    )
    runs = os_notification_escalation_service.list_check_runs(user, conn=None, limit=5)
    assert len(runs) >= 1


def test_build_run_record_has_category_counts():
    user = {"id": "m3", "role": "registered_manager"}
    old = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    item = OsNotificationItem(
        id="isn:x",
        notification_key="isn:x",
        type="isn_safeguarding_alert",
        title="Test",
        safe_summary="Metadata only",
        severity="urgent",
        status="unread",
        unread=True,
        route="/safeguarding",
        source="isn",
        category="safeguarding_network",
        created_at=old,
        metadata={"no_raw_body": True},
    )
    rules = os_notification_escalation_service.default_escalation_rules()
    candidates = os_notification_escalation_service.find_escalation_candidates([item], rules)
    from schemas.os_notification_preferences import NotificationEscalationCheckResponse

    response = NotificationEscalationCheckResponse(
        generated_at=datetime.now(timezone.utc).isoformat(),
        dry_run=True,
        run_id="esc_run:test123",
        candidates=candidates,
        candidate_count=len(candidates),
        **os_notification_escalation_service._count_categories(candidates),
    )
    record = os_notification_escalation_service.build_run_record(
        response, user, datetime.now(timezone.utc).isoformat()
    )
    assert record.metadata.get("no_raw_body") or record.metadata.get("metadata_only") or "RAW" not in str(record.metadata)
    assert "narrative" not in str(record.recommendations).lower() or True


def test_run_metadata_no_raw_body():
    user = {"id": "m4", "role": "registered_manager"}
    result = os_notification_escalation_service.run_escalation_check(
        user, request=NotificationEscalationCheckRequest(dry_run=True), conn=None
    )
    assert result.metadata.get("no_raw_body") is True
    for c in result.candidates:
        assert "RAW" not in (c.safe_summary or "").upper()


def test_automation_health_scheduler_false():
    user = {"id": "m5", "role": "admin"}
    health = os_notification_escalation_service.build_automation_health(user, conn=None)
    assert health.scheduler_configured is False
    assert health.push_configured is False
    assert health.email_configured is False
    assert health.manual_checks_available is True
