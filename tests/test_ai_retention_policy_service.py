from __future__ import annotations

from datetime import datetime, timedelta, timezone

from services.ai_retention_policy_service import ai_retention_policy_service


def test_retention_for_surface_standalone():
    policy = ai_retention_policy_service.retention_for_surface("standalone_orb")
    assert policy.user_controlled is True


def test_retention_for_raw_data_class():
    policy = ai_retention_policy_service.retention_for_data_class("child_record_raw")
    assert policy.ephemeral is True
    assert "Do not persist" in policy.notice


def test_should_expire_temp_context():
    old = datetime.now(timezone.utc) - timedelta(hours=30)
    assert ai_retention_policy_service.should_expire_temp_context(old) is True
    recent = datetime.now(timezone.utc) - timedelta(minutes=5)
    assert ai_retention_policy_service.should_expire_temp_context(recent) is False


def test_retention_notice_combines_surface_and_classes():
    notice = ai_retention_policy_service.retention_notice(
        "operational_orb", ["safeguarding_raw"]
    )
    assert "operational" in notice.lower() or "ORB" in notice
