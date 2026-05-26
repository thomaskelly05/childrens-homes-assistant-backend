from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_mobile_drawer_structure():
    text = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert 'data-testid="mobile-top-menu-clickable"' in text
    assert 'data-testid="mobile-drawer"' in text
    assert "bg-slate-950" in text
    assert "min(86vw,360px)" in text.replace(" ", "")
    assert "overflow-y-auto" in text
    assert "Escape" in text or "keydown" in text
    assert "overflow = 'hidden'" in text or 'overflow = "hidden"' in text


def test_drawer_closed_not_in_dom():
    text = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert "{menuOpen ? (" in text


def test_drawer_solid_background_css():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert ".mobile-menu-drawer" in css
    assert "pointer-events: auto" in css
