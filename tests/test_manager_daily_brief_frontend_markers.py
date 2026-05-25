from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

BRIEF_FILES = [
    FRONTEND / "app" / "command-centre" / "briefing" / "page.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-manager-daily-brief.tsx",
    FRONTEND / "components" / "command-centre" / "manager-daily-brief-page.tsx",
    FRONTEND / "components" / "command-centre" / "manager-daily-brief-section.tsx",
    FRONTEND / "components" / "command-centre" / "manager-daily-brief-actions.tsx",
    FRONTEND / "lib" / "os-api" / "manager-daily-brief.ts",
]

STANDALONE_ORB = FRONTEND / "app" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_briefing_page_exists():
    page = FRONTEND / "app" / "command-centre" / "briefing" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Manager daily brief" in text or "manager-daily-brief-page" in text


def test_care_hub_manager_daily_brief_card():
    hub = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    card = _read(FRONTEND / "components" / "command-centre" / "care-hub-manager-daily-brief.tsx")
    assert "CareHubManagerDailyBrief" in hub
    assert "care-hub-manager-daily-brief" in card
    assert "Manager daily brief" in card
    assert "Recording, review and safeguarding-sensitive follow-up" in card
    assert "Open full brief" in card


def test_full_brief_page_markers():
    combined = "\n".join(_read(path) for path in BRIEF_FILES)
    assert "manager-daily-brief-copy" in combined
    assert "manager-daily-brief-mark-reviewed" in combined
    assert "manager-daily-brief-ask-orb" in combined
    assert "manager-daily-brief-privacy" in combined
    assert "manager-daily-brief-isn-summary" in combined
    assert "manager-daily-brief-notification-settings" in combined
    assert "manager-daily-brief-section-" in combined
    assert "Safeguarding network" in combined
    assert "manager-daily-brief-safe-summary" in combined
    assert "Ask OS ORB" in combined
    assert "draft.body" not in combined


def test_orb_links_operational_only():
    combined = "\n".join(_read(path) for path in BRIEF_FILES)
    for href in re.findall(r'["\']([^"\']*/orb[^"\']*)["\']', combined):
        assert href.startswith("/assistant/orb"), f"Must use operational ORB: {href}"
        assert "child_id=" not in href
        assert "draft=" not in href


def test_standalone_orb_no_manager_brief_import():
    if not STANDALONE_ORB.exists():
        return
    for path in list(STANDALONE_ORB.rglob("*.tsx")) + list(STANDALONE_ORB.rglob("*.ts")):
        text = _read(path)
        assert "manager-daily-brief" not in text, path
        assert "os-api/notifications" not in text, path
        assert "isn-notifications" not in text, path
