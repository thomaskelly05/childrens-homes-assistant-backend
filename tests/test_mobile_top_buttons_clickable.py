from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_mobile_top_bar_clickable_testids():
    text = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert 'data-testid="mobile-top-menu-clickable"' in text
    assert 'data-testid="mobile-top-search-clickable"' in text
    assert 'data-testid="mobile-top-notifications-clickable"' in text
    assert 'data-testid="mobile-top-switch-scope-clickable"' in text
    assert "MobileSafeButton" in text
    assert "MobileSafeLink" in text


def test_mobile_top_bar_uses_buttons_not_divs():
    text = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert '<div role="button"' not in text
    assert 'type="button"' in text
    assert 'href="/select-scope"' in text
