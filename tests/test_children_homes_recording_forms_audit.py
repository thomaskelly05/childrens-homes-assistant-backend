from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_DOC = REPO_ROOT / "docs" / "children-homes-recording-forms-audit.md"
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"


def test_audit_document_exists():
    assert AUDIT_DOC.is_file(), "Missing children-homes-recording-forms-audit.md"


def test_audit_document_sections():
    text = AUDIT_DOC.read_text(encoding="utf-8")
    for heading in (
        "## 1. Child daily life records",
        "## 2. Safeguarding and incidents",
        "## 3. Plans and reviews",
        "## 4. Manager oversight and governance",
        "## 5. Workforce records",
        "## 8. ORB support needed",
        "## 9. Missing high-priority forms",
        "## 10. Build recommendations",
    ):
        assert heading in text, f"Missing audit section: {heading}"
    assert "legally complete" not in text.lower() or "not claim legal completeness" in text
    assert "aligned to expected children" in text


def test_audit_references_registry():
    text = AUDIT_DOC.read_text(encoding="utf-8")
    assert "recording-form-registry.ts" in text


def test_registry_lists_p0_safeguarding_forms():
    registry = REGISTRY.read_text(encoding="utf-8")
    for form_id in (
        "safeguarding-concern",
        "physical-intervention",
        "return-conversation",
        "injury-body-map",
        "medication-note-error",
        "manager-review",
    ):
        assert f"id: '{form_id}'" in registry, f"Missing registry form: {form_id}"


def test_registry_reg44_reg45():
    registry = REGISTRY.read_text(encoding="utf-8")
    assert "reg44-evidence" in registry
    assert "reg45-evidence" in registry
