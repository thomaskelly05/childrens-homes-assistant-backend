from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DOC = REPO / "docs" / "demo-ready-north-star-workflow-completion.md"
WALKTHROUGH = REPO / "docs" / "demo-ready-mvp-walkthrough.md"


def test_demo_completion_doc_exists():
    assert DOC.is_file()
    text = DOC.read_text(encoding="utf-8")
    assert "Full demo route map" in text
    assert "Manual testing checklist" in text
    assert "/young-people/:id/workspace" in text or "/young-people/" in text


def test_demo_completion_doc_covers_golden_path():
    text = DOC.read_text(encoding="utf-8")
    for fragment in (
        "/select-scope",
        "/record?child_id",
        "/record/reviews",
        "/intelligence/inspection-readiness",
        "/assistant/orb",
        "/orb",
    ):
        assert fragment in text


def test_walkthrough_doc_updated_for_north_star():
    text = WALKTHROUGH.read_text(encoding="utf-8")
    assert "do not claim" in text.lower() or "Do not claim" in text
    assert "/young-people/" in text and "workspace" in text
    assert "10-minute" in text.lower() or "10 minute" in text.lower() or "## 1." in text
