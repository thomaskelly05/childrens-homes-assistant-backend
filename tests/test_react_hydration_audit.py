from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_DOC = REPO_ROOT / "docs" / "react-hydration-global-button-failure-audit.md"


def test_hydration_audit_doc_exists_and_covers_error_418():
    text = AUDIT_DOC.read_text(encoding="utf-8")
    assert AUDIT_DOC.is_file()
    assert "#418" in text or "418" in text
    assert "hydration" in text.lower()
    assert "AppShell" in text or "app-shell" in text
    assert "manual" in text.lower() or "QA" in text
