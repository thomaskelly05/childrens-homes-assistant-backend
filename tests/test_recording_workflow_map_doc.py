from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC = REPO_ROOT / "docs" / "recording-draft-submission-workflow-map.md"


def test_recording_workflow_map_doc_exists():
    assert DOC.is_file()


def test_workflow_map_has_required_columns():
    text = DOC.read_text(encoding="utf-8")
    for column in (
        "Recording type",
        "Registry form id",
        "Formal backend",
        "Frontend formal route",
        "Chronology link",
        "Manager review",
        "Gap / next action",
    ):
        assert column in text, f"Missing column header: {column}"


def test_workflow_map_mentions_daily_note_and_incident():
    text = DOC.read_text(encoding="utf-8")
    assert "daily-note" in text
    assert "incident" in text
    assert "SUPPORTED_NOW" in text or "supported_now" in text
