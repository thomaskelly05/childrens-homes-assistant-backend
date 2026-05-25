from __future__ import annotations

from datetime import datetime, timezone

import pytest

from schemas.os_notifications import OsNotificationItem
from services.os_notification_preference_service import os_notification_preference_service


@pytest.fixture(autouse=True)
def reset_memory():
    os_notification_preference_service._memory_rules = {}
    yield
    os_notification_preference_service._memory_rules = {}


def test_default_rules_manager_role():
    rules = os_notification_preference_service.build_default_rules_for_role("registered_manager")
    sources = {r.category for r in rules}
    assert "safeguarding_network" in sources
    assert "recording" in sources
    assert all(r.urgent_override for r in rules)


def test_default_rules_support_worker_limited():
    rules = os_notification_preference_service.build_default_rules_for_role("support_worker")
    gov = next((r for r in rules if r.category == "governance"), None)
    brief = next((r for r in rules if r.category == "daily_brief"), None)
    assert gov is not None and gov.enabled is False
    assert brief is not None and brief.enabled is False


def test_apply_preferences_hides_low_priority():
    prefs = os_notification_preference_service.build_default_rules_for_role("registered_manager")
    for p in prefs:
        if p.category == "governance":
            p.enabled = False
            p.min_severity = "urgent"
    item = OsNotificationItem(
        id="governance:1",
        type="governance_notice",
        title="Governance",
        safe_summary="Privacy flags",
        severity="medium",
        route="/record/governance",
        source="governance",
        category="governance",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    assert os_notification_preference_service.should_show_item(item, prefs) is False


def test_urgent_safeguarding_override_still_shows():
    prefs = os_notification_preference_service.build_default_rules_for_role("registered_manager")
    for p in prefs:
        if p.category == "safeguarding_network":
            p.enabled = False
    item = OsNotificationItem(
        id="isn:1",
        type="isn_safeguarding_alert",
        title="ISN alert",
        safe_summary="Metadata only",
        severity="urgent",
        route="/safeguarding",
        source="isn",
        category="safeguarding_network",
        created_at=datetime.now(timezone.utc).isoformat(),
        metadata={"no_raw_body": True},
    )
    assert os_notification_preference_service.is_urgent_safeguarding_item(item)
    assert os_notification_preference_service.should_show_item(item, prefs) is True


def test_no_raw_body_in_preference_metadata():
    user = {"id": "u1", "role": "manager"}
    rules = os_notification_preference_service.build_default_rules_for_role("manager")
    from schemas.os_notification_preferences import NotificationPreferenceUpdateRequest

    os_notification_preference_service.update_preferences(
        user,
        NotificationPreferenceUpdateRequest(rules=rules[:2]),
        conn=None,
    )
    stored = os_notification_preference_service._memory_rules.get("user:u1", [])
    assert all(s.get("metadata", {}).get("no_raw_body") for s in stored)
