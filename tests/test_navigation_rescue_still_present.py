from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RESCUE = REPO / "frontend-next" / "components" / "indicare" / "navigation" / "navigation-rescue.tsx"
LAYOUT = REPO / "frontend-next" / "app" / "layout.tsx"
GUARD_CSS = REPO / "frontend-next" / "app" / "interaction-guard.css"
AUDIT_SCRIPT = REPO / "frontend-next" / "scripts" / "audit-interaction.mjs"


def test_navigation_rescue_component_exists():
    assert RESCUE.is_file()
    text = RESCUE.read_text(encoding="utf-8")
    assert "NavigationRescue" in text
    assert "window.location.assign" in text
    assert "data-no-navigation-rescue" in text
    assert 'data-testid="navigation-rescue-marker"' in text


def test_layout_loads_navigation_rescue():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "NavigationRescue" in layout
    assert "navigation-rescue" in layout
    assert "navigation-rescue-marker" in RESCUE.read_text(encoding="utf-8")


def test_interaction_guard_and_audit_script():
    assert GUARD_CSS.is_file()
    assert AUDIT_SCRIPT.is_file()
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "interaction-guard.css" in layout
