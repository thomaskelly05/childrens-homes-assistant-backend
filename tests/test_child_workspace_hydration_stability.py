from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_child_workspace_avatar_client_fallback():
    hero = (FRONTEND / "components/young-people/workspace/child-profile-hero.tsx").read_text(encoding="utf-8")
    avatar = (FRONTEND / "components/young-people/workspace/child-workspace-avatar.tsx").read_text(encoding="utf-8")
    assert "ChildWorkspaceAvatar" in hero
    assert "'use client'" in avatar
    assert "onError" in avatar
    assert "child-avatar-fallback" in avatar


def test_active_child_stable_search_params():
    ctx = (FRONTEND / "lib/context/active-child-context.tsx").read_text(encoding="utf-8")
    assert "useStableSearchParams" in ctx
