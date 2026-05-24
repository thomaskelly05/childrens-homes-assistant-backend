from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

RECORD_FILES = [
    FRONTEND / "app" / "record" / "page.tsx",
    FRONTEND / "lib" / "record" / "recording-form-registry.ts",
    FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-editor.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-type-selector.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-quality-coach.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-language-suggestions.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-review-checklist.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-orb-rail.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-therapeutic-prompts.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-autosave-indicator.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-context-panel.tsx",
    FRONTEND / "lib" / "record" / "recording-draft-store.ts",
    FRONTEND / "lib" / "os-api" / "recording-drafts.ts",
    FRONTEND / "components" / "indicare" / "record" / "recording-draft-list.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-draft-recovery-banner.tsx",
    FRONTEND / "lib" / "record" / "recording-quality-coach.ts",
    FRONTEND / "lib" / "record" / "recording-types.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_recording_workspace_files_exist():
    for path in RECORD_FILES:
        assert path.is_file(), f"Missing recording workspace file: {path}"


def test_recording_workspace_markers():
    combined = "\n".join(_read(path) for path in RECORD_FILES)
    for marker in (
        "Record with care",
        "Write clear, child-centred records",
        "Autosave",
        "Quality coach",
        "Child-centred language",
        "Therapeutic prompts",
        "Review before saving",
        "No unnecessary personal identifiers",
        "ORB recording coach",
        "Adults remain responsible for the final record",
        "spellCheck",
        "recording-workspace",
        "recording-editor",
        "More recording routes",
        "RecordingWorkspace",
        "safeguarding-concern",
        "physical-intervention",
        "Draft workspace",
        "My drafts",
        "Saved securely",
        "Saved in this browser",
        "Submit draft",
        "Mark ready for review",
        "Formal record created",
        "Formal route is not fully wired yet",
        "unsaved browser draft",
        "recording-catalogue-panel",
        "recording-workflow-status",
    ):
        assert marker in combined, f"Missing workspace marker: {marker}"


def test_record_hub_integrates_workspace():
    hub = _read(FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx")
    assert "RecordingWorkspace" in hub
    assert "record-more-routes" in hub
