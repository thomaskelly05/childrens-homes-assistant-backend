from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HUB = REPO / "frontend-next" / "components" / "indicare" / "record" / "record-hub.tsx"
SELECTOR = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-type-selector.tsx"
WORKSPACE = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx"
EDITOR = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-editor.tsx"
COACH = REPO / "frontend-next" / "components" / "indicare" / "record" / "orb-live-recording-coach.tsx"


def test_record_hub_selector_when_no_type():
    hub = HUB.read_text(encoding="utf-8")
    assert "!hasTypeSelected" in hub or "hasTypeSelected" in hub
    assert "RecordingTypeSelector" in hub
    assert "RecordingWorkspace" in hub
    assert "browseAllCards" in hub


def test_selector_start_navigates_with_type():
    sel = SELECTOR.read_text(encoding="utf-8")
    assert "recording-selector-start" in sel
    assert "Start this record" in sel
    assert "childRecordHref" in sel


def test_editor_has_metadata_and_coach():
    editor = EDITOR.read_text(encoding="utf-8")
    workspace = WORKSPACE.read_text(encoding="utf-8")
    coach = COACH.read_text(encoding="utf-8")
    assert "eventDate" in editor or "event_date" in editor
    assert "OrbLiveRecordingCoach" in workspace
    assert "orb-live-recording-coach" in coach.lower() or "OrbLiveRecordingCoach" in coach
