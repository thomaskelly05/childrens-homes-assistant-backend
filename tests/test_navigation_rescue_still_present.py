from __future__ import annotations

from pathlib import Path

RESCUE = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "indicare"
    / "navigation"
    / "navigation-rescue.tsx"
)
LAYOUT = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "layout.tsx"
GUARD_CSS = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "interaction-guard.css"
AUDIT_SCRIPT = Path(__file__).resolve().parents[1] / "frontend-next" / "scripts" / "audit-interaction.mjs"


def test_navigation_rescue_component_exists():
    assert RESCUE.is_file()
    text = RESCUE.read_text(encoding="utf-8")
    assert "NavigationRescue" in text


def test_layout_loads_navigation_rescue():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "NavigationRescue" in layout or "navigation-rescue" in layout


def test_interaction_guard_and_audit_script():
    assert GUARD_CSS.is_file()
    assert AUDIT_SCRIPT.is_file()
