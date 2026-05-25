from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from schemas.os_notifications import OsNotificationItem
from schemas.os_notification_preferences import NotificationEscalationCheckRequest
from services.os_notification_escalation_service import os_notification_escalation_service


@pytest.fixture(autouse=True)
def reset_escalation_memory():
    os_notification_escalation_service._memory_events = []
    os_notification_escalation_service._seed_defaults()
    yield


def _item(**kwargs) -> OsNotificationItem:
    defaults = {
        "id": "isn:test",
        "notification_key": "isn:test",
        "type": "isn_safeguarding_alert",
        "title": "Test",
        "safe_summary": "Safe metadata summary only",
        "severity": "urgent",
        "status": "unread",
        "unread": True,
        "route": "/safeguarding",
        "source": "isn",
        "category": "safeguarding_network",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        "metadata": {"no_raw_body": True},
    }
    defaults.update(kwargs)
    return OsNotificationItem(**defaults)


def test_default_escalation_rules_exist():
    rules = os_notification_escalation_service.default_escalation_rules()
    assert len(rules) >= 5
    names = {r.name for r in rules}
    assert any("ISN" in n for n in names)
    assert any("recording" in n.lower() for n in names)


def test_urgent_isn_candidate_after_threshold():
    rules = os_notification_escalation_service.default_escalation_rules()
    item = _item(severity="urgent", source="isn")
    candidates = os_notification_escalation_service.find_escalation_candidates([item], rules)
    isn_candidates = [c for c in candidates if c.source == "isn"]
    assert len(isn_candidates) >= 1
    assert "RAW" not in isn_candidates[0].safe_summary.upper()


def test_recording_alert_candidate():
    rules = os_notification_escalation_service.default_escalation_rules()
    old = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    item = _item(
        id="recording_alert:1",
        notification_key="recording_alert:1",
        type="recording_alert_urgent",
        source="recording_alert",
        category="recording",
        severity="urgent",
        created_at=old,
        metadata={"alert_type": "high_risk_review_due", "no_raw_body": True},
    )
    candidates = os_notification_escalation_service.find_escalation_candidates([item], rules)
    rec = [c for c in candidates if c.source == "recording_alert"]
    assert len(rec) >= 1


def test_daily_brief_candidate_when_forced():
    rules = os_notification_escalation_service.default_escalation_rules()
    rule = next(r for r in rules if (r.metadata or {}).get("check_type") == "daily_brief_unreviewed")
    rule = rule.model_copy(update={"metadata": {**(rule.metadata or {}), "force": True}})
    rules = [rule if r.id == rule.id else r for r in rules]
    old = (datetime.now(timezone.utc) - timedelta(hours=13)).isoformat()
    item = _item(
        id="manager_daily_brief:today",
        notification_key="manager_daily_brief:today",
        type="manager_daily_brief_reminder",
        source="manager_daily_brief",
        category="daily_brief",
        severity="medium",
        created_at=old,
    )
    candidates = os_notification_escalation_service.find_escalation_candidates([item], rules)
    assert any(c.notification_key == "manager_daily_brief:today" for c in candidates)


def test_dry_run_does_not_create_events():
    user = {"id": "m1", "role": "registered_manager"}
    item = _item()
    rules = os_notification_escalation_service.default_escalation_rules()
    candidates = os_notification_escalation_service.find_escalation_candidates([item], rules)
    before = len(os_notification_escalation_service._memory_events)
    for c in candidates[:1]:
        pass
    result = os_notification_escalation_service.run_escalation_check(
        user,
        request=NotificationEscalationCheckRequest(dry_run=True),
        conn=None,
    )
    assert result.dry_run is True
    assert len(result.created_notifications) == 0


def test_check_returns_recommendations():
    user = {"id": "m1", "role": "registered_manager"}
    result = os_notification_escalation_service.run_escalation_check(
        user,
        request=NotificationEscalationCheckRequest(dry_run=True),
        conn=None,
    )
    assert result.recommendations
    assert any("oversight" in r.lower() or "candidate" in r.lower() for r in result.recommendations)


def test_acknowledged_not_escalated():
    rules = os_notification_escalation_service.default_escalation_rules()
    item = _item(status="acknowledged", unread=False)
    assert os_notification_escalation_service.is_candidate_unresolved(item) is False
