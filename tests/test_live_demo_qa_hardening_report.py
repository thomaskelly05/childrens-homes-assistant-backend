from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOC = REPO / "docs" / "live-demo-qa-hardening-report.md"

REQUIRED_SECTIONS = [
    "Demo path tested",
    "Routes checked",
    "Bugs found",
    "UI confusion found",
    "Navigation issues found",
    "ORB duplication issues found",
    "Empty state issues found",
    "Copy issues found",
    "Fixes applied",
    "Remaining limitations",
    "Manual retest checklist",
]


def test_live_demo_qa_hardening_report_exists():
    assert DOC.is_file(), "docs/live-demo-qa-hardening-report.md must exist"


def test_live_demo_qa_report_has_required_sections():
    text = DOC.read_text(encoding="utf-8")
    for section in REQUIRED_SECTIONS:
        assert section in text, f"QA report missing section: {section}"
