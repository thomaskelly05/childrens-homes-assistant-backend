from __future__ import annotations

from pathlib import Path

SCOPE_NAV = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts"
HOME_PAGE = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_home_primary_menu():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    primary = text.split("homeScopePrimaryNavigation")[1].split("export function homeScopeMoreNavigation")[0]
    for label in ("Home", "Handover", "Reviews", "Alerts"):
        assert label in primary


def test_home_workspace_grouped_sections():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert "home-workspace-section-today" in page
    assert "home-workspace-section-safeguarding" in page
    assert "home-workspace-section-workforce" in page
    assert "home-workspace-section-inspection" in page
    assert "home-workspace-section-more" in page
    assert "Home today" in page
