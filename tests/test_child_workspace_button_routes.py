from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_quick_actions_no_dead_hrefs():
    normaliser = (FRONTEND / "lib/young-people/child-workspace-normaliser.ts").read_text(encoding="utf-8")
    assert 'href: "#"' not in normaliser
    assert 'href: ""' not in normaliser
    assert "child-quick-daily-note" in normaliser
    assert "child-quick-orb" in normaliser


def test_child_workspace_uses_links():
    overview = (FRONTEND / "components/young-people/workspace/child-workspace-overview.tsx").read_text(encoding="utf-8")
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    assert "<Link" in overview
    assert "mobile-child-record-button" in hero or "child-quick-record" in hero
    assert 'data-testid="child-workspace-mobile-actions"' in overview


def test_child_lifecycle_routes():
    card = (FRONTEND / "components/young-people/workspace/child-lifecycle-card.tsx").read_text(encoding="utf-8")
    assert "/young-people/" in card
    assert 'href="#"' not in card
