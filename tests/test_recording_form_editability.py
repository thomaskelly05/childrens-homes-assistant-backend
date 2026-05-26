from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
EDITOR = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-editor.tsx"
METADATA_TS = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-metadata.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_drafts_editable_until_signed_off():
    editor = _read(EDITOR)
    assert "isReadOnly" in editor
    assert 'disabled={isReadOnly}' in editor
    assert "recording-save-draft" in editor
    assert "recording-resume-draft" in editor


def test_editability_note_in_metadata():
    meta = _read(METADATA_TS)
    assert "is_editable" in meta
    assert "signed off" in meta.lower()


def test_high_risk_review_gated():
    editor = _read(EDITOR)
    assert "recording-confirm-reviewed" in editor
    assert "Manager review" in editor
