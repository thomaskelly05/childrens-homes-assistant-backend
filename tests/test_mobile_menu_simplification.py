from __future__ import annotations

from pathlib import Path

MOBILE_NAV = Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "indicare" / "mobile" / "mobile-bottom-nav.tsx"
MOBILE_SHELL = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "mobile-shell.ts"


def test_child_bottom_nav_five_items_max():
    text = MOBILE_NAV.read_text(encoding="utf-8")
    child = text.split("function childBottomNav")[1].split("function homeBottomNav")[0]
    assert child.count("label:") == 5
    assert "More" in child
    assert "ORB" not in child


def test_home_bottom_nav_simplified():
    text = MOBILE_NAV.read_text(encoding="utf-8")
    home = text.split("function homeBottomNav")[1].split("export function MobileBottomNav")[0]
    assert "Handover" in home
    assert "More" in home
    assert home.count("label:") == 5


def test_mobile_tabs_match_simplified_pattern():
    shell = MOBILE_SHELL.read_text(encoding="utf-8")
    child_tabs = shell.split("childWorkspaceMobileTabs")[1].split("homeWorkspaceMobileTabs")[0]
    assert child_tabs.count("label:") == 5
    assert "More" in child_tabs
