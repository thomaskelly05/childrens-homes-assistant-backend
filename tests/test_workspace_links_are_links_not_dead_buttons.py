from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_quick_action_hrefs():
    normaliser = (FRONTEND / "lib/young-people/child-workspace-normaliser.ts").read_text(encoding="utf-8")
    assert 'href: "#"' not in normaliser
    assert 'href: ""' not in normaliser
    assert "childRecordHref" in normaliser
    assert "childOrbHref" in normaliser


def test_home_workflow_hrefs():
    routes = (FRONTEND / "lib/navigation/scope-routes.ts").read_text(encoding="utf-8")
    assert "HOME_WORKSPACE_WORKFLOW_HREFS" in routes
    assert "/command-centre/briefing" in routes or "homeDailyBriefHref" in routes
    assert "/handover" in routes
    assert "/assistant/orb" in routes


def test_workspace_pages_avoid_empty_onclick_navigation():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    home = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert 'onClick={() => {}}' not in hero
    assert 'onClick={() => {}}' not in home
    assert "MobileSafeLink" in hero
    assert "MobileSafeLink" in home
