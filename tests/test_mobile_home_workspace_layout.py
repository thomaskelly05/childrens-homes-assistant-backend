from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PAGE = REPO_ROOT / "frontend-next" / "app/homes/[id]/workspace/page.tsx"


def test_home_workspace_mobile_markers():
    text = PAGE.read_text(encoding="utf-8")
    assert 'data-testid="home-workspace-page"' in text
    assert "home-workspace-hero-mobile-compact" in text
    assert 'data-testid="home-workspace-mobile-ask-orb"' in text
    assert "hidden xl:block" in text
    assert "grid-cols-1" in text
