from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
RULES = FRONTEND / "lib" / "orb" / "orb-presence-rules.ts"
CHILD_OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
HOME_PAGE = FRONTEND / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
RECORD_WS = FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx"


def test_embedded_rail_blocks_inline_orb_card():
    rules = RULES.read_text(encoding="utf-8")
    assert "hasPageEmbeddedOrbRail(pathname)" in rules.split("shouldShowInlineOrbCard")[1]


def test_child_workspace_single_orb_rail_desktop():
    overview = CHILD_OVERVIEW.read_text(encoding="utf-8")
    assert overview.count("<ChildWorkspaceOrbRail") == 1
    assert "<OperationalOrbRail" not in overview


def test_home_workspace_single_orb_rail():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert page.count("<OperationalOrbRail") == 1
    assert "home-workspace-mobile-actions" not in page


def test_recording_editor_no_second_orb_rail():
    ws = RECORD_WS.read_text(encoding="utf-8")
    assert "OrbLiveRecordingCoach" in ws
    assert "OperationalOrbRail" not in ws
    assert "RECORDING_STANDALONE_ORB_HREF" not in ws
