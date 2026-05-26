from __future__ import annotations

from pathlib import Path

OVERVIEW = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "young-people"
    / "workspace"
    / "child-workspace-overview.tsx"
)
HERO = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "young-people"
    / "workspace"
    / "child-profile-hero.tsx"
)


def test_child_workspace_journey_sections():
    text = OVERVIEW.read_text(encoding="utf-8")
    for test_id in (
        "child-workspace-section-understand",
        "child-workspace-section-today",
        "child-workspace-section-record-once",
        "child-workspace-section-story",
        "child-workspace-section-plans",
        "child-workspace-section-oversight",
    ):
        assert test_id in text


def test_child_workspace_section_titles():
    text = OVERVIEW.read_text(encoding="utf-8")
    assert "Understand this child" in text
    assert "Today’s priorities" in text
    assert "Child’s story" in text
    assert "Plans and impact" in text


def test_child_hero_primary_record_action():
    hero = HERO.read_text(encoding="utf-8")
    assert 'data-testid="child-hero-record"' in hero
    assert "Record" in hero
