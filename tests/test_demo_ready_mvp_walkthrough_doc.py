from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC = REPO_ROOT / "docs" / "demo-ready-mvp-walkthrough.md"
QA_MAP = REPO_ROOT / "docs" / "full-system-end-to-end-qa-map.md"


def test_demo_walkthrough_doc_exists_with_script_sections():
    assert DOC.is_file()
    text = DOC.read_text(encoding="utf-8")
    for section in (
        "## 1. Login",
        "North Star House",
        "Jamie",
        "daily note",
        "ORB live coach",
        "Manager review",
        "Archive",
        "LifeEcho",
        "Inspection readiness",
        "Reg 45",
        "## Known limitations",
        "## What to avoid clicking in demo",
    ):
        assert section in text, section


def test_qa_map_doc_exists():
    assert QA_MAP.is_file()
    text = QA_MAP.read_text(encoding="utf-8")
    assert "## 1. Scope-first entry flow" in text
    assert "## 17. Manual demo script" in text
