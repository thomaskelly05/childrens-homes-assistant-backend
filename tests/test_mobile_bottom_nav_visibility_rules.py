from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def _shell() -> str:
    return (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")


def test_hidden_on_orb_routes():
    text = _shell()
    assert "pathname === '/orb'" in text
    assert "/assistant/orb" in text


def test_hidden_on_record_and_select_scope():
    text = _shell()
    assert "pathname === '/record'" in text
    assert "pathname === '/select-scope'" in text


def test_hidden_on_login():
    text = _shell()
    assert "pathname === '/login'" in text


def test_bottom_nav_lg_hidden_in_component():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "lg:hidden" in nav
    assert "shouldShowMobileBottomNav" in nav
