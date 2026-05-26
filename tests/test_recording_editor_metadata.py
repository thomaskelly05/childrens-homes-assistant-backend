from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
EDITOR = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-editor.tsx"
SHELL = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-form-shell.tsx"


def test_recording_editor_spellcheck_and_metadata():
    editor = EDITOR.read_text(encoding="utf-8")
    shell = SHELL.read_text(encoding="utf-8")
    assert "spellCheck" in editor
    assert "event_date" in editor or "eventDate" in editor
    assert "mergeFormRecordMetadataPatch" in editor
    assert "recording-form-heading-guidance" in shell
    assert "headingGuidanceForForm" in shell
