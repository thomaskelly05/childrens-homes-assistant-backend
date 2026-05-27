from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
GLOBALS = REPO / "frontend-next" / "app" / "globals.css"
OVERVIEW = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
HOME = REPO / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_mobile_safe_bottom_padding_on_workspaces():
    css = GLOBALS.read_text(encoding="utf-8")
    assert "mobile-child-workspace" in css
    assert "safe-area-inset-bottom" in css
    assert "mobile-bottom-nav" in css


def test_child_and_home_workspace_mobile_classes():
    assert "mobile-child-workspace" in OVERVIEW.read_text(encoding="utf-8")
    assert "mobile-home-workspace" in HOME.read_text(encoding="utf-8")
