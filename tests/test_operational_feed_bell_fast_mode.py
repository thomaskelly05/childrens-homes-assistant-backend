"""Notification bell should not pull full governance/workforce builders."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BELL = REPO_ROOT / "frontend-next" / "components" / "connect" / "notification-bell.tsx"
APP_SHELL = REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx"


def test_notification_bell_not_mounted_without_child_scope():
    shell = APP_SHELL.read_text(encoding="utf-8")
    assert "hasOsScope && scope.scope_type === 'child' ? <NotificationBell />" in shell


def test_notification_bell_uses_cached_feed_only():
    text = BELL.read_text(encoding="utf-8")
    assert "getOperationalNotificationFeed" in text
    assert "fetchWithOsCache" in text
    assert "/api/governance-os/command-centre" not in text
    assert "/api/workforce-os/dashboard" not in text
