from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DRAFT_STORE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-draft-store.ts"


def test_recording_draft_store_markers():
    text = DRAFT_STORE.read_text(encoding="utf-8")
    for marker in (
        "RECORDING_DRAFT_STORAGE_PREFIX",
        "RECORDING_DRAFT_PRIVACY_NOTICE",
        "saveRecordingDraft",
        "loadRecordingDraft",
        "clearRecordingDraft",
        "listRecordingDraftMetadata",
        "countWords",
        "draft_id",
        "recording_type",
        "context_type",
        "privacy_notice",
        "typeof window",
        "Autosave stores this draft in this browser",
    ):
        assert marker in text, f"Missing draft store marker: {marker}"


def test_draft_storage_key_shape():
    text = DRAFT_STORE.read_text(encoding="utf-8")
    assert "indicare-recording-workspace-draft" in text
    assert "${RECORDING_DRAFT_STORAGE_PREFIX}:${draft.context_type}:${childPart}:${draft.recording_type}" in text
