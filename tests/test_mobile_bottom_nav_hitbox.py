from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_bottom_nav_explicit_height_and_safe_area():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "height: 'calc(4.5rem + env(safe-area-inset-bottom))'" in nav
    assert "paddingBottom: 'env(safe-area-inset-bottom)'" in nav
    assert "h-[4.5rem]" in nav
    assert "overflow-hidden" in nav
    assert "height: calc(4.5rem + env(safe-area-inset-bottom))" in css


def test_bottom_nav_link_icons_pointer_events_none():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "pointer-events-none" in nav
    assert "MobileSafeLink" in nav


def test_interaction_guard_bottom_nav_pseudo_elements_inert():
    guard = (FRONTEND / "app/interaction-guard.css").read_text(encoding="utf-8")
    assert ".mobile-bottom-nav::before" in guard
    assert "pointer-events: none" in guard.split(".mobile-bottom-nav::before")[1][:120]
