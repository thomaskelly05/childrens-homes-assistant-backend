from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record"

SHELL_MARKERS = [
    "recording-form-shell",
    "recording-form-metadata-bar",
    "recording-form-review-status",
    "recording-form-therapeutic-guidance",
    "recording-form-plan-impact-check",
    "recording-form-lifecycle-outcome",
    "recording-event-date",
    "recording-written-by",
    "recording-child-voice-section",
    "recording-adult-response-section",
    "recording-actions-follow-up-section",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_form_shell_components_exist():
    for name in (
        "recording-form-shell.tsx",
        "recording-form-metadata-bar.tsx",
        "recording-form-review-status.tsx",
        "recording-form-therapeutic-guidance.tsx",
        "recording-form-plan-impact-check.tsx",
        "recording-form-lifecycle-outcome.tsx",
    ):
        assert (COMPONENTS / name).is_file(), name


def test_editor_uses_form_shell():
    editor = _read(COMPONENTS / "recording-editor.tsx")
    assert "RecordingFormShell" in editor
    assert "StructuredRecordingForm" in editor
    assert "recording-event-date" in _read(COMPONENTS / "recording-form-metadata-bar.tsx")


def test_shell_markers_present():
    sources = "".join(_read(COMPONENTS / f) for f in COMPONENTS.glob("recording-form-*.tsx"))
    for marker in SHELL_MARKERS:
        assert marker in sources, f"Missing marker {marker}"


def test_signed_off_readonly_copy():
    editor = _read(COMPONENTS / "recording-editor.tsx")
    assert "recording-signed-off-readonly" in _read(COMPONENTS / "recording-form-metadata-bar.tsx")
    assert "recording-addendum-hint" in editor
    assert "cannot be edited directly" in editor
