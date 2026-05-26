from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
ORB_RAIL = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-orb-rail.tsx"
OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
RULES = FRONTEND / "lib" / "orb" / "orb-presence-rules.ts"


def test_child_workspace_single_operational_rail():
    rail = ORB_RAIL.read_text(encoding="utf-8")
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "OperationalOrbRail" in rail
    assert "ScopeOrbLauncher" not in rail
    assert "child-workspace-orb-rail" in rail
    assert "ChildWorkspaceOrbRail" in overview
    assert overview.count("OrbRail") == 1 or "ChildWorkspaceOrbRail" in overview


def test_child_workspace_no_duplicate_scope_launcher_card():
    rail = ORB_RAIL.read_text(encoding="utf-8")
    assert "Open operational ORB" not in rail
    rail_text = (FRONTEND / "components" / "orb-operational" / "operational-orb-rail.tsx").read_text(
        encoding="utf-8"
    )
    assert "ORB_QUIET_COPILOT_TAGLINE" in rail_text or "quiet copilot" in rail_text.lower()


def test_child_workspace_hides_floating_orb_via_rules():
    rules = RULES.read_text(encoding="utf-8")
    shell = APP_SHELL.read_text(encoding="utf-8")
    assert "shouldShowFloatingOrb" in rules
    assert "shouldShowFloatingOrb" in shell
    assert "hasPageEmbeddedOrbRail" in rules


def test_child_workspace_prompts_scoped():
    rail = ORB_RAIL.read_text(encoding="utf-8")
    operational = (FRONTEND / "lib" / "orb" / "orb-presence-rules.ts").read_text(encoding="utf-8")
    assert "scopeType=\"child\"" in rail
    assert "What should I check before recording?" in operational
    assert "chronology_story_review" in operational
