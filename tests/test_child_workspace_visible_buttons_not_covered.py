from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_hero_primary_buttons_have_hrefs_and_testids():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    normaliser = (FRONTEND / "lib/young-people/child-workspace-normaliser.ts").read_text(encoding="utf-8")
    assert 'data-testid="mobile-child-record-button"' in hero
    assert 'data-testid="mobile-child-daily-note-button"' in hero
    assert 'data-testid="mobile-child-orb-button"' in hero
    assert "Record something" in normaliser
    assert "child-quick-record" in normaliser
    assert "child-quick-daily-note" in normaliser
    assert "child-quick-incident" in normaliser
    assert "child-quick-safeguarding" in normaliser
    assert "child-quick-orb" in normaliser
    assert 'href: childRecordHref' in normaliser or "childRecordHref(childId)" in normaliser


def test_child_bottom_nav_record_and_orb():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert 'testId: \'mobile-nav-record\'' in nav or "mobile-nav-record" in nav
    assert "mobile-nav-orb" in nav
    assert "childRecordHref" in nav
    assert "childOrbHref" in nav


def test_child_hero_actions_not_absolute_overlay():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "child-workspace-hero-actions" in hero
    assert "position: static" in css or "static" in hero
