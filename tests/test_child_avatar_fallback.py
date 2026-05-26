from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_avatar_fallback_component():
    text = (FRONTEND / "components/young-people/workspace/child-workspace-avatar.tsx").read_text(encoding="utf-8")
    assert 'data-testid="child-avatar-fallback"' in text
    assert 'data-testid="child-workspace-hero-avatar"' in text
    assert "onError" in text
    assert "<img" in text
