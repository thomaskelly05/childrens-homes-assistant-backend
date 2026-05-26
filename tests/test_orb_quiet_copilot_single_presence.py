from __future__ import annotations

from pathlib import Path

RULES = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts"
RAIL = Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "orb-operational" / "operational-orb-rail.tsx"
APP_SHELL = Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "indicare" / "app-shell.tsx"
WORKSPACE = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx"
)


def test_quiet_copilot_tagline_constant():
    text = RULES.read_text(encoding="utf-8")
    assert "ORB_QUIET_COPILOT_TAGLINE" in text
    assert "quiet copilot" in text.lower()


def test_orb_rail_shows_tagline_once():
    rail = RAIL.read_text(encoding="utf-8")
    assert "ORB_QUIET_COPILOT_TAGLINE" in rail
    assert rail.count("orb-quiet-copilot-tagline") == 1


def test_embedded_rail_hides_sidebar_orb_link():
    shell = APP_SHELL.read_text(encoding="utf-8")
    assert "hasPageEmbeddedOrbRail(pathname)" in shell
    assert "sidebar-orb-link" in shell


def test_recording_workspace_uses_live_coach_only():
    ws = WORKSPACE.read_text(encoding="utf-8")
    assert "OrbLiveRecordingCoach" in ws
    assert "RecordingOrbRail" not in ws
    assert "OperationalOrbRail" not in ws
