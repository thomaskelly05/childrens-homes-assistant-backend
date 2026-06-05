from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_template_handoff_session_key():
    handoff = read_frontend("lib/orb/write/orb-write-template-handoff.ts")
    assert "orb-write-template-handoff-v1" in handoff
    assert "saveOrbWriteTemplateHandoff" in handoff


def test_blank_document_from_record_type():
    standalone = read_frontend("lib/orb/write/orb-write-standalone.ts")
    assert "createBlankOrbWriteDocumentFromRecordType" in standalone
    assert "structureOrbWriteDocumentBody" in standalone


def test_write_panel_loads_template_handoff():
    panel = read_frontend("components/orb-write/orb-write-standalone-panel.tsx")
    assert "loadOrbWriteTemplateHandoff" in panel
    assert "createBlankOrbWriteDocumentFromRecordType" in panel
    assert "clearOrbWriteTemplateHandoff" in panel


def test_care_companion_wires_recording_actions():
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "handleRecordingLibraryAction" in companion
    assert "saveOrbWriteTemplateHandoff" in companion
    assert "onRecordingAction={handleRecordingLibraryAction}" in companion
    assert "studioTemplateId" in companion
