from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RULES = REPO / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts"
CHILD_OVERVIEW = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
HOME_PAGE = REPO / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
RECORD_WORKSPACE = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx"
APP_SHELL = REPO / "frontend-next" / "components" / "indicare" / "app-shell.tsx"


def test_child_workspace_embedded_rail_only():
    overview = CHILD_OVERVIEW.read_text(encoding="utf-8")
    assert "ChildWorkspaceOrbRail" in overview
    assert overview.count("OperationalOrbRail") == 0
    assert "ScopeOrbLauncher" not in overview


def test_home_workspace_single_rail():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert page.count("<OperationalOrbRail") == 1


def test_recording_editor_uses_live_coach():
    ws = RECORD_WORKSPACE.read_text(encoding="utf-8")
    assert "OrbLiveRecordingCoach" in ws
    rules = RULES.read_text(encoding="utf-8")
    assert "isRecordingEditorPathStrict" in rules
    assert "hasPageEmbeddedOrbRail" in rules


def test_floating_orb_suppressed_on_workspace():
    shell = APP_SHELL.read_text(encoding="utf-8")
    rules = RULES.read_text(encoding="utf-8")
    assert "shouldShowFloatingOrb" in shell
    assert "hasPageEmbeddedOrbRail" in rules
