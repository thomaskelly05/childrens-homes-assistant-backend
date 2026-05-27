from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"
LAYOUT = FRONTEND / "app" / "layout.tsx"
RESCUE = FRONTEND / "components" / "indicare" / "navigation" / "navigation-rescue.tsx"
SCOPE_ROUTES = FRONTEND / "lib" / "navigation" / "scope-routes.ts"

GOLDEN_LINK_SOURCES = [
    FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx",
    FRONTEND / "components" / "young-people" / "workspace" / "child-recording-selector-card.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-type-selector.tsx",
    FRONTEND / "app" / "homes" / "[id]" / "workspace" / "page.tsx",
]


def test_navigation_rescue_loaded_in_layout():
    layout = LAYOUT.read_text(encoding="utf-8")
    assert "<NavigationRescue" in layout
    assert "navigation-rescue" in layout
    assert "navigation-rescue-marker" in RESCUE.read_text(encoding="utf-8")


def test_navigation_rescue_skips_external_and_hash_only():
    text = RESCUE.read_text(encoding="utf-8")
    assert 'rawHref === "#"' in text or "rawHref === '#'" in text
    assert "mailto:" in text
    assert "tel:" in text
    assert "download" in text
    assert 'target && target !== "_self"' in text or "target !== '_self'" in text


def test_navigation_rescue_has_test_marker():
    assert 'data-testid="navigation-rescue-marker"' in RESCUE.read_text(encoding="utf-8")


def test_no_href_hash_in_golden_path_sources():
    for path in GOLDEN_LINK_SOURCES:
        text = path.read_text(encoding="utf-8")
        assert 'href="#"' not in text, path.name
        assert 'href=""' not in text, path.name


def test_scope_routes_no_os_young_people_browser_href():
    text = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert 'href: `/os/young-people' not in text
    assert "/young-people/" in text


def test_child_voice_route_uses_record_not_missing_page():
    text = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert "child-voice/new" not in text.split("childVoiceHref")[1].split("export")[0]
    assert "type: 'child-voice'" in text or 'type: "child-voice"' in text


def test_home_children_href_preserves_home_id():
    text = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert "home_id=" in text.split("homeChildrenHref")[1].split("export")[0]
