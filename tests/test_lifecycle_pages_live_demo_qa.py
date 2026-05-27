from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
APP = REPO / "frontend-next" / "app" / "young-people" / "[id]"


def test_lifecycle_pages_have_back_links_and_testids():
    pages = {
        "archive": ("child-archive-page", "child-archive-back-workspace"),
        "chronology": ("child-chronology-page", "child-chronology-back-workspace"),
        "lifeecho": ("child-lifeecho-page", "child-lifeecho-back-workspace"),
        "plan-impacts": ("child-plan-impacts-page", "child-plan-impacts-back-workspace"),
    }
    for segment, (page_testid, back_testid) in pages.items():
        text = (APP / segment / "page.tsx").read_text(encoding="utf-8")
        assert page_testid in text, segment
        assert "/workspace" in text, segment
        if back_testid:
            assert back_testid in text, segment


def test_legacy_life_echo_redirects_to_lifeecho():
    legacy = (APP / "life_echo" / "page.tsx").read_text(encoding="utf-8")
    assert "redirect" in legacy
    assert "lifeecho" in legacy


def test_plan_impacts_suggestions_copy():
    text = (APP / "plan-impacts" / "page.tsx").read_text(encoding="utf-8")
    assert "never updated silently" in text.lower() or "never" in text.lower()
