from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_home_workspace_links_from_scope_routes():
    page = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert "HOME_WORKSPACE_WORKFLOW_HREFS" in page
    assert "mobile-home-daily-brief-button" in page
    assert "mobile-home-handover-button" in page
    assert 'href="#"' not in page


def test_home_mobile_actions_marker():
    page = (FRONTEND / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert 'data-testid="home-workspace-mobile-actions"' in page
    assert "mobile-home-orb-button" in page
