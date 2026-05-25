from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

ALERT_FILES = [
    FRONTEND / "app" / "record" / "alerts" / "page.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alerts-page.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alert-card.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alert-summary.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alert-actions.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alert-filters.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-manager-digest.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-alert-nav-badge.tsx",
    FRONTEND / "lib" / "os-api" / "recording-alerts.ts",
]

INTEGRATION_FILES = [
    FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-alerts.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-dashboard.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-section.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-digest.tsx",
    FRONTEND / "components" / "indicare" / "app-shell.tsx",
    FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts",
]

STANDALONE_ORB = FRONTEND / "app" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_record_alerts_page_exists():
    page = FRONTEND / "app" / "record" / "alerts" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Recording alerts" in text or "recording-alerts-page" in text


def test_alerts_ui_markers():
    combined = "\n".join(_read(path) for path in ALERT_FILES)
    assert "Recording alerts" in combined
    assert "Follow up recording risks" in combined
    assert "Run checks now" in combined
    assert "recording-alerts-digest-panel" in combined
    assert "recording-alerts-last-check" in combined
    assert "Open review" in combined
    assert "Open draft" in combined
    assert "Open child journey" in combined
    assert "Ask OS ORB" in combined
    assert "replace professional judgement" in combined or "do not replace professional" in combined
    assert "recording-alert-safe-summary" in combined
    assert "draft.body" not in combined
    assert "raw draft body" not in combined.lower() or "not raw" in combined.lower()


def test_recording_alert_nav_badge_marker():
    shell = _read(FRONTEND / "components" / "indicare" / "app-shell.tsx")
    badge = _read(FRONTEND / "components" / "indicare" / "record" / "recording-alert-nav-badge.tsx")
    assert "recording-alert-nav-badge" in badge
    assert "RecordingAlertNavBadge" in shell


def test_orb_links_use_operational_orb_only():
    combined = "\n".join(_read(path) for path in ALERT_FILES)
    assert "operationalOrbAlertHref" in combined
    assert "/assistant/orb" in combined
    orb_hrefs = re.findall(r'["\']([^"\']*/(?:assistant/)?orb[^"\']*)["\']', combined)
    for href in orb_hrefs:
        lower = href.lower()
        assert "draft=" not in lower
        assert "body=" not in lower
        assert "child_id=" not in lower
        assert "alert_id=" not in lower


def test_standalone_orb_does_not_import_recording_alerts():
    if not STANDALONE_ORB.exists():
        return
    for path in list(STANDALONE_ORB.rglob("*.tsx")) + list(STANDALONE_ORB.rglob("*.ts")):
        text = _read(path)
        assert "recording-alerts" not in text, f"Standalone ORB must not import recording alerts: {path}"


def test_integrations_link_to_alerts():
    combined = "\n".join(_read(path) for path in INTEGRATION_FILES)
    assert "/record/alerts" in combined
    assert "Recording alerts" in combined


def test_alerts_link_manager_daily_brief():
    alerts = _read(FRONTEND / "components" / "indicare" / "record" / "recording-alerts-page.tsx")
    assert "recording-alerts-open-manager-daily-brief" in alerts
    assert "/command-centre/briefing" in alerts


def test_child_journey_scoped_alerts_link():
    routes = _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")
    assert "/record/alerts?child_id=" in routes
