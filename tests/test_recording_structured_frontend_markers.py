from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

STRUCTURED_FILES = [
    FRONTEND / "components" / "indicare" / "record" / "structured-recording-form.tsx",
    FRONTEND / "components" / "indicare" / "record" / "structured-form-section.tsx",
    FRONTEND / "components" / "indicare" / "record" / "structured-form-field.tsx",
    FRONTEND / "components" / "indicare" / "record" / "structured-form-summary.tsx",
    FRONTEND / "components" / "indicare" / "record" / "structured-form-review-triggers.tsx",
    FRONTEND / "lib" / "os-api" / "recording-templates.ts",
    FRONTEND / "components" / "indicare" / "record" / "recording-editor.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx",
]


def test_structured_frontend_files_exist():
    for path in STRUCTURED_FILES:
        assert path.is_file(), f"Missing {path}"


def test_structured_recording_form_markers():
    combined = "\n".join(path.read_text(encoding="utf-8") for path in STRUCTURED_FILES)
    for marker in (
        "structured-recording-form",
        "structured-form-field",
        "structured-form-review-triggers",
        "structured-form-safety-notices",
        "structured-form-required-missing",
        "Use structured answers to support your draft narrative",
        "listRecordingTemplates",
        "getRecordingTemplate",
        "validateRecordingTemplate",
        "summariseRecordingTemplate",
        "recording-high-risk-safety-banner",
        "StructuredRecordingForm",
    ):
        assert marker in combined, f"Missing marker: {marker}"


def test_standalone_orb_does_not_import_recording_templates():
    orb_root = FRONTEND / "components" / "orb-standalone"
    standalone_lib = FRONTEND / "lib" / "orb"
    for path in list(orb_root.rglob("*.ts")) + list(orb_root.rglob("*.tsx")) + list(standalone_lib.rglob("*.ts")):
        text = path.read_text(encoding="utf-8")
        assert "recording-templates" not in text
        assert "recording_templates" not in text
