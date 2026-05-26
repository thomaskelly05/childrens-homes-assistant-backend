from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_bottom_nav_uses_mobile_safe_link_and_valid_hrefs():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "MobileSafeLink" in nav
    assert "/assistant/orb" in nav
    assert 'href="#"' not in nav
    assert 'href=""' not in nav
    assert "pointer-events-auto" in nav


def test_bottom_nav_hidden_on_orb_routes():
    shell = (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")
    assert "pathname === '/orb'" in shell
    assert "/assistant/orb" in shell
