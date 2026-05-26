from __future__ import annotations

from pathlib import Path

SCOPE_NAV = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts"


def test_child_primary_menu_items():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    primary = text.split("childScopePrimaryNavigation")[1].split("export function childScopeMoreNavigation")[0]
    for label in ("Overview", "Record", "Chronology", "Plans", "Reviews", "Alerts", "ORB"):
        assert label in primary


def test_child_more_menu_items():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    more = text.split("childScopeMoreNavigation")[1].split("export function childScopeNavigation")[0]
    for label in ("Archive", "LifeEcho", "Plan impacts", "Handover", "Safeguarding"):
        assert label in more


def test_child_scope_navigation_combines_primary_and_more():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    assert "childScopePrimaryNavigation" in text
    assert "childScopeMoreNavigation" in text
    fn = text.split("export function childScopeNavigation")[1].split("export function scopeNavigationFor")[0]
    assert "childScopePrimaryNavigation(childId)" in fn
    assert "childScopeMoreNavigation(childId)" in fn
