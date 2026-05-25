from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_notifications_page_operational_section():
    page = _read(FRONTEND / "app" / "notifications" / "page.tsx")
    section = _read(FRONTEND / "components" / "connect" / "operational-notifications-section.tsx")
    assert "OperationalNotificationsSection" in page
    assert "operational-notifications-section" in section
    assert "operational-notifications-safety-note" in section
    assert "getOperationalNotificationFeed" in page
    assert "operational-notification-mark-read" in section
    assert "operational-notification-acknowledge" in section
    assert "Safeguarding network" in page or "safeguarding" in page.lower()
    assert "notifications-settings-link" in page
    assert "/notifications/settings" in page
    assert "notifications-urgent-override-copy" in page
    assert "operational-notifications-urgent-override" in section
    assert "NotificationGovernanceStrip" in page
    assert "notification-governance-strip" in _read(FRONTEND / "components" / "connect" / "notification-governance-strip.tsx")


def test_no_standalone_orb_in_notifications_client():
    client = _read(FRONTEND / "lib" / "os-api" / "notifications.ts")
    assert "/orb" not in client or "/assistant/orb" in client
