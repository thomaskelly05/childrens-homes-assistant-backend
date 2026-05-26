from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_bottom_nav_safe_area_and_scope_testids():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "safe-area-inset-bottom" in nav
    assert "data-mobile-bottom-nav-safe-area" in nav
    assert "mobile-child-bottom-nav" in nav
    assert "pointer-events-auto" in nav
    assert "height: 'calc(4.5rem + env(safe-area-inset-bottom))'" in nav
    assert "z-40" in nav
    assert "max-h-[" not in nav


def test_bottom_nav_hidden_on_orb_and_record():
    shell = (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")
    assert "pathname === '/orb'" in shell
    assert "pathname === '/record'" in shell
    assert "/assistant/orb" in shell
    assert "pathname === '/select-scope'" in shell
