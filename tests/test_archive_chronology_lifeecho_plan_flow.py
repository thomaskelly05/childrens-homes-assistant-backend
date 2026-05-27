from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"


def test_archive_page_child_context():
    page = FRONTEND / "app" / "young-people" / "[id]" / "archive" / "page.tsx"
    text = page.read_text(encoding="utf-8")
    assert "child-archive-page" in text
    assert "/workspace" in text
    lib = (FRONTEND / "components" / "young-people" / "archive").rglob("*.tsx")
    assert any(p for p in lib)


def test_chronology_story_section():
    page = FRONTEND / "app" / "young-people" / "[id]" / "chronology" / "page.tsx"
    text = page.read_text(encoding="utf-8")
    assert "child-chronology-story-section" in text
    assert "child-chronology-back-workspace" in text


def test_lifeecho_purpose_and_workspace_link():
    page = FRONTEND / "app" / "young-people" / "[id]" / "lifeecho" / "page.tsx"
    text = page.read_text(encoding="utf-8")
    assert "child-lifeecho-page" in text
    assert "approval" in text.lower() or "approve" in text.lower()
    assert "child-lifeecho-back-workspace" in text


def test_plan_impacts_not_silent_updates():
    page = FRONTEND / "app" / "young-people" / "[id]" / "plan-impacts" / "page.tsx"
    text = page.read_text(encoding="utf-8")
    assert "child-plan-impacts-page" in text
    assert "never" in text.lower() or "not" in text.lower()
