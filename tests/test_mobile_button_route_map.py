from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_scope_routes_child_map():
    text = (FRONTEND / "lib/navigation/scope-routes.ts").read_text(encoding="utf-8")
    assert "CHILD_WORKSPACE_WORKFLOW_HREFS" in text
    assert "childDailyNoteHref" in text
    assert "childOrbHref" in text
    assert "/assistant/orb" in text


def test_scope_routes_home_map():
    text = (FRONTEND / "lib/navigation/scope-routes.ts").read_text(encoding="utf-8")
    assert "HOME_WORKSPACE_WORKFLOW_HREFS" in text
    assert "homeDailyBriefHref" in text
    assert "homeReg45Href" in text


def test_mobile_shell_tab_helpers():
    text = (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")
    assert "childWorkspaceMobileTabs" in text
    assert "homeWorkspaceMobileTabs" in text
    assert "shouldShowMobileBottomNav" in text
