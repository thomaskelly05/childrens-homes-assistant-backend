from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_workspace_shortcuts_use_mobile_safe_link():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    overview = (FRONTEND / "components/young-people/workspace/child-workspace-overview.tsx").read_text(encoding="utf-8")
    assert "MobileSafeLink" in hero
    assert "mobile-child-record-button" in hero
    assert "mobile-child-daily-note-button" in hero
    assert "mobile-child-orb-button" in hero
    assert "MobileSafeLink" in overview


def test_home_workspace_shortcuts_use_mobile_safe_link():
    page = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert "MobileSafeLink" in page
    assert "mobile-home-daily-brief-button" in page
    assert "mobile-home-handover-button" in page
    assert "mobile-home-reviews-button" in page
    assert "mobile-home-alerts-button" in page
