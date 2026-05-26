from __future__ import annotations

from pathlib import Path

OPERATIONAL_NAV = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "operational-navigation.ts"
)
SCOPE_NAV = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts"
CHILD_MORE = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "young-people"
    / "workspace"
    / "child-workspace-more-links.tsx"
)


def test_operational_more_menu_keeps_legacy_routes():
    text = OPERATIONAL_NAV.read_text(encoding="utf-8")
    assert "domain: 'chronology'" in text
    assert "menuGroup: 'more'" in text
    assert "label: 'Chronology'" in text
    assert "label: 'Actions'" in text
    assert "Care Hub (legacy)" in text or "command-centre" in text


def test_child_scope_more_preserves_workflows():
    text = SCOPE_NAV.read_text(encoding="utf-8")
    more = text.split("childScopeMoreNavigation")[1].split("export function childScopeNavigation")[0]
    for label in ("Archive", "LifeEcho", "Handover", "Safeguarding"):
        assert label in more
    overview = (
        Path(__file__).resolve().parents[1]
        / "frontend-next"
        / "components"
        / "young-people"
        / "workspace"
        / "child-workspace-overview.tsx"
    ).read_text(encoding="utf-8")
    assert "journey" in overview.lower() or "childJourneyHref" in text


def test_child_workspace_more_component_exists():
    assert CHILD_MORE.is_file()
