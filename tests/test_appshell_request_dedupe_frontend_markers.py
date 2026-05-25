from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_notification_bell_still_exists():
    bell = _read(FRONTEND / "components" / "connect" / "notification-bell.tsx")
    assert 'data-testid="notification-bell"' in bell
    assert "getOperationalNotificationFeed" in bell


def test_recording_badge_dedupe_marker():
    badge = _read(FRONTEND / "components" / "indicare" / "record" / "recording-alert-nav-badge.tsx")
    counts = _read(FRONTEND / "lib" / "os-operational-counts.ts")
    assert "APPSHELL_RECORDING_BADGE_DEDUPE" in counts
    assert "badgeFromShellCounts" in badge
    assert "setOperationalShellCounts" in _read(FRONTEND / "components" / "connect" / "notification-bell.tsx")


def test_command_centre_still_linked():
    nav = _read(FRONTEND / "lib" / "navigation" / "operational-navigation.ts")
    assert "/command-centre" in nav


def test_no_standalone_orb_imports_in_appshell():
    shell = _read(FRONTEND / "components" / "indicare" / "app-shell.tsx")
    assert "isStandaloneOrb" in shell or '"/orb"' in shell
    assert "/orb/standalone" not in shell
