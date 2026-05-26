from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_home_child_selector_interaction_markers():
    text = (FRONTEND / "components/indicare/scope/home-child-selector.tsx").read_text(encoding="utf-8")
    assert "chooseHome" in text
    assert "chooseChild" in text
    assert "previewHomeChildren" in text
    assert "router.push" in text or "router.replace" in text
    assert "disabled={busy || scopeBusy}" in text


def test_child_workspace_links_not_globally_disabled():
    text = (FRONTEND / "components/young-people/workspace/child-workspace-overview.tsx").read_text(encoding="utf-8")
    assert "disabled" not in text or "disabled={" not in text


def test_home_workspace_links():
    text = (REPO_ROOT / "frontend-next" / "app/homes/[id]/workspace/page.tsx").read_text(encoding="utf-8")
    assert "prefetch={false}" in text
    assert "data-testid=" in text
