from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

FILES = [
    FRONTEND / "lib" / "os-api" / "recording-drafts.ts",
    FRONTEND / "components" / "indicare" / "record" / "recording-draft-list.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-draft-recovery-banner.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-editor.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-autosave-indicator.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-submission-result.tsx",
    FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx",
]


def test_recording_draft_frontend_files_exist():
    for path in FILES:
        assert path.is_file(), f"Missing file: {path}"


def test_recording_draft_frontend_markers():
    combined = "\n".join(path.read_text(encoding="utf-8") for path in FILES)
    for marker in (
        "My drafts",
        "Saved securely",
        "Saved in this browser",
        "Ready for review",
        "Submit draft",
        "Formal record created",
        "Formal route is not fully wired yet",
        "Manager review is required",
        "Next steps",
        "Open formal route",
        "Resume draft",
        "submissionTargetStatusCopy",
        "Manager or safeguarding review is required",
        "listRecordingSubmissionTargets",
        "getRecordingSubmissionTarget",
        "recording-submission-result",
        "recording-submission-target-hint",
        "recording-draft-recovery-banner",
        "You have an unsaved browser draft",
        "listRecordingDrafts",
        "createRecordingDraft",
        "autosaveRecordingDraft",
        "markRecordingDraftReadyForReview",
        "submitRecordingDraft",
        "recording-draft-list",
        "recording-save-status",
    ):
        assert marker in combined, f"Missing marker: {marker}"


def test_standalone_orb_does_not_import_recording_drafts_client():
    orb_root = FRONTEND / "components" / "orb-standalone"
    standalone_lib = FRONTEND / "lib" / "orb"
    for path in list(orb_root.rglob("*.ts")) + list(orb_root.rglob("*.tsx")) + list(standalone_lib.rglob("*.ts")):
        text = path.read_text(encoding="utf-8")
        assert "recording-drafts" not in text, f"Standalone ORB must not import recording drafts: {path}"
