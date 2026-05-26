from __future__ import annotations

from pathlib import Path

SCOPE_ROUTES = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "scope-routes.ts"
SELECTOR = Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "indicare" / "record" / "recording-type-selector.tsx"
LAYOUT = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "layout.tsx"


def test_child_orb_uses_assistant_route():
    routes = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert "/assistant/orb" in routes
    assert "assistantOrbHref" in routes


def test_recording_selector_uses_child_record_href():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "childRecordHref" in text


def test_navigation_rescue_still_active():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "NavigationRescue" in layout
