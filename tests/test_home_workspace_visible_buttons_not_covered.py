from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_home_workspace_mobile_action_testids():
    page = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert "'mobile-home-handover-button'" in page
    assert "'mobile-home-alerts-button'" in page
    assert "'mobile-home-reviews-button'" in page
    assert "mobile-home-orb-button" in page
    assert "MobileSafeLink" in page


def test_home_bottom_nav_orb_alerts_reviews():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "homeRecordingAlertsHref" in nav
    assert "homeRecordingReviewsHref" in nav
    assert "homeOrbHref" in nav
    assert "mobile-nav-home-orb" in nav


def test_home_workspace_mobile_class():
    page = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert "mobile-home-workspace" in page
