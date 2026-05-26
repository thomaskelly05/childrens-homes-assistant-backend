from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_mobile_top_bar_exists():
    text = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert 'data-testid="mobile-os-top-bar"' in text
    assert "MobileOsTopBar" in shell


def test_mobile_bottom_nav_safe_area():
    text = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "mobile-child-bottom-nav" in text or 'data-testid="mobile-bottom-nav"' in text
    assert "safe-area-inset-bottom" in text or "safe-area-inset-bottom" in css
    assert "mobile-bottom-nav" in css
