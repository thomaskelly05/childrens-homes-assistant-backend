from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
HOME_PAGE = REPO_ROOT / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
RULES = REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts"


def test_home_workspace_uses_operational_orb_rail():
    text = HOME_PAGE.read_text(encoding="utf-8")
    assert "OperationalOrbRail" in text
    assert "home-workspace-orb-rail" in text
    assert "ScopeOrbLauncher" not in text


def test_home_workspace_prompts_in_rules():
    rules = RULES.read_text(encoding="utf-8")
    assert "What needs attention in this home today?" in rules
    assert "manager_daily_brief" in rules
