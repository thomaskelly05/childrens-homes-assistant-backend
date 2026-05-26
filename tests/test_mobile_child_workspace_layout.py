from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_compact_hero_markers():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    assert "child-workspace-hero-mobile-compact" in hero
    assert 'data-testid="child-workspace-hero-actions"' in hero
    assert "grid grid-cols-2" in hero


def test_hero_actions_not_overlay_positioned():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    overview = (FRONTEND / "components/young-people/workspace/child-workspace-overview.tsx").read_text(encoding="utf-8")
    assert "absolute" not in hero or "child-workspace-hero-actions" in hero
    assert "position: static" in (FRONTEND / "app/globals.css").read_text(encoding="utf-8") or "static" in hero
    assert 'data-testid="child-workspace-mobile-ask-orb"' in overview
    assert "hidden xl:block" in overview
