from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_decorative_orb_layers_pointer_events_none():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert ".orb-overlay-shell" in css
    assert "pointer-events: none" in css
    assert ".orb-atmospheric-diffusion" in css
    assert ".orb-cinematic-light-field" in css or "orb-cinematic-light-field" in css
    assert ".orb-screen-edge-pulse" in css


def test_mobile_menu_only_when_open():
    top = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert "menuOpen ?" in top
    assert "mobile-menu-overlay" in top


def test_panel_shell_closed_not_rendered():
    shell = (FRONTEND / "components/orb-standalone/orb-standalone-panel-shell.tsx").read_text(encoding="utf-8")
    assert "if (!open) return null" in shell


def test_mobile_css_reinforces_non_blocking_decorative_layers():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "@media (max-width: 767px)" in css
    assert "pointer-events: none !important" in css
