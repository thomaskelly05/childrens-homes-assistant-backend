from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
WORKSPACE = FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx"
APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
COACH = FRONTEND / "components" / "indicare" / "record" / "orb-live-recording-coach.tsx"


def test_recording_workspace_live_coach_only():
    text = WORKSPACE.read_text(encoding="utf-8")
    assert "OrbLiveRecordingCoach" in text
    assert "RecordingOrbRail" not in text
    assert "orb-live-recording-coach" in COACH.read_text(encoding="utf-8")


def test_record_route_hides_floating_orb():
    shell = APP_SHELL.read_text(encoding="utf-8")
    assert "isRecordingEditorPathStrict" in shell
    assert "shouldShowFloatingOrb" in shell


def test_recording_coach_links_assistant_orb():
    coach = COACH.read_text(encoding="utf-8")
    operational_client = (FRONTEND / "lib" / "orb" / "operational-client.ts").read_text(encoding="utf-8")
    assert "operationalOrbRecordingHref" in coach
    assert "/assistant/orb" in operational_client
    assert "recording_live_coach" in operational_client
