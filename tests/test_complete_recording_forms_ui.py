from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx"


def test_complete_recording_forms_ui_markers():
    shell = (REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-form-shell.tsx").read_text(
        encoding="utf-8"
    )
    text = WORKSPACE.read_text(encoding="utf-8") + shell
    for marker in (
        "OrbLiveRecordingCoach",
        "RecordingEditor",
        "recording-form-heading-guidance",
        "RecordingLanguageSuggestions",
        "RecordingReviewChecklist",
    ):
        assert marker in text, f"Missing UI marker: {marker}"
