from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC = REPO_ROOT / "docs" / "children-homes-complete-recording-catalogue.md"


def test_complete_catalogue_doc_exists():
    assert DOC.is_file()


def test_catalogue_doc_sections():
    text = DOC.read_text(encoding="utf-8")
    for heading in (
        "## 1. Child daily life",
        "## 3. Safeguarding and protection",
        "## 5. Missing and return home",
        "## 9. Manager oversight and governance",
        "## 11. Environment, maintenance and safety",
        "## 15. Forms still needing dedicated backend workflow",
    ):
        assert heading in text


def test_catalogue_doc_disclaimer():
    text = DOC.read_text(encoding="utf-8")
    assert "not a legal completeness guarantee" in text
    assert "SCCIF" in text
