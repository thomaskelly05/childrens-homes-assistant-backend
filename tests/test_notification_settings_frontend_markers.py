from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_notification_settings_page_exists():
    page = _read(FRONTEND / "app" / "notifications" / "settings" / "page.tsx")
    assert "Notification settings" in page
    assert "NotificationSettingsPanel" in page
    assert "notification-settings-page" in page


def test_notification_settings_panel_markers():
    panel = _read(FRONTEND / "components" / "connect" / "notification-settings-panel.tsx")
    assert "notification-settings-panel" in panel
    assert "Urgent safeguarding" in panel
    assert "Escalation rules" in panel
    rule_card = _read(FRONTEND / "components" / "connect" / "notification-preference-rule-card.tsx")
    assert "notification-preference-email-coming-later" in rule_card
    assert "notification-preference-push-coming-later" in rule_card
    assert "NotificationEscalationCheck" in panel


def test_escalation_check_component():
    check = _read(FRONTEND / "components" / "connect" / "notification-escalation-check.tsx")
    assert "Run escalation check" in check
    assert "notification-escalation-check" in check
    assert "Dry run" in check
    assert "Last escalation check" in check


def test_automation_status_markers():
    auto = _read(FRONTEND / "components" / "connect" / "notification-automation-status.tsx")
    assert "Scheduler not configured yet" in auto
    assert "Push not configured yet" in auto
    assert "Email not configured yet" in auto
    assert "notification-urgent-unacknowledged" in auto
    assert "notification-average-ack-time" in auto
    panel = _read(FRONTEND / "components" / "connect" / "notification-settings-panel.tsx")
    assert "NotificationAutomationStatus" in panel
    assert "NotificationEscalationRunHistory" in panel
    history = _read(FRONTEND / "components" / "connect" / "notification-escalation-run-history.tsx")
    assert "Escalation check history" in history


def test_governance_strip_markers():
    strip = _read(FRONTEND / "components" / "connect" / "notification-governance-strip.tsx")
    assert "notification-governance-strip" in strip
    page = _read(FRONTEND / "app" / "notifications" / "page.tsx")
    assert "NotificationGovernanceStrip" in page


def test_care_hub_notification_oversight():
    oversight = _read(FRONTEND / "components" / "command-centre" / "care-hub-notification-oversight.tsx")
    assert "care-hub-notification-oversight" in oversight
    assert "Notification oversight" in oversight
    hub = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    assert "CareHubNotificationOversight" in hub


def test_notifications_client_has_preference_apis():
    client = _read(FRONTEND / "lib" / "os-api" / "notifications.ts")
    assert "getNotificationPreferences" in client
    assert "runNotificationEscalationCheck" in client
    assert "/api/notifications/preferences" in client
    assert "/api/notifications/escalations/check" in client
    assert "listNotificationEscalationRuns" in client
    assert "getNotificationGovernanceSummary" in client
    assert "/api/notifications/analytics/governance-summary" in client


def test_standalone_orb_does_not_import_preference_client():
    orb_dir = FRONTEND / "components" / "orb-standalone"
    standalone_page = _read(FRONTEND / "app" / "orb" / "page.tsx")
    for path in list(orb_dir.rglob("*.tsx")) + list(orb_dir.rglob("*.ts")):
        content = _read(path)
        assert "getNotificationPreferences" not in content
        assert "runNotificationEscalationCheck" not in content
        assert "getNotificationGovernanceSummary" not in content
        assert "getNotificationResponseMetrics" not in content
    assert "getNotificationPreferences" not in standalone_page
    assert "notifications/settings" not in standalone_page
    assert "getNotificationGovernanceSummary" not in standalone_page
