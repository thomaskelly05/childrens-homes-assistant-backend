from __future__ import annotations

import json
from pathlib import Path


def test_recording_framework_has_write_record_types():
    framework_path = Path("frontend-next/lib/orb/recording/orb-recording-framework.json")
    data = json.loads(framework_path.read_text(encoding="utf-8"))
    ids = {row["id"] for row in data["record_types"]}
    for required in (
        "general_dictation",
        "daily_record",
        "incident_report",
        "missing_from_home_record",
        "safeguarding_concern",
        "physical_intervention",
        "chronology_entry",
    ):
        assert required in ids


def test_write_start_screen_references_framework():
    start = Path("frontend-next/components/orb-write/orb-write-start-screen.tsx").read_text(encoding="utf-8")
    assert "ORB_RECORDING_RECORD_TYPES" in start
    assert "general_dictation" in start
    assert "daily_record" in start


def test_handoff_structures_body_with_framework():
    handoff = Path("frontend-next/lib/orb/write/orb-write-handoff.ts").read_text(encoding="utf-8")
    assert "structureOrbWriteDocumentBody" in handoff
    assert "resolveOrbRecordingRecordType" in handoff
