from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_chronology_story_ui():
    page = (REPO / "frontend-next/app/young-people/[id]/chronology/page.tsx").read_text(encoding="utf-8")
    assert "child-chronology-story-section" in page
    assert "ChildStoryTimeline" in page
    timeline = (REPO / "frontend-next/components/young-people/chronology/child-story-timeline.tsx").read_text(
        encoding="utf-8"
    )
    assert "child-story-timeline" in timeline
    assert "chronology-story-event" in timeline
