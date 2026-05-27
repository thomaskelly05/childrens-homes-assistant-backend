from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OVERVIEW = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
SELECTOR_CARD = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-recording-selector-card.tsx"
NORMALISER = REPO / "frontend-next" / "lib" / "young-people" / "child-workspace-normaliser.ts"


def test_child_workspace_sections():
    text = OVERVIEW.read_text(encoding="utf-8")
    for section in (
        "child-workspace-section-understand",
        "child-workspace-section-today",
        "child-workspace-section-record-once",
        "child-workspace-section-story",
        "child-workspace-section-plans",
        "child-workspace-section-oversight",
    ):
        assert section in text


def test_record_once_tagline():
    card = SELECTOR_CARD.read_text(encoding="utf-8")
    assert "child-record-once-tagline" in card
    assert "Record once. IndiCare connects" in card


def test_story_plans_oversight_actions_in_normaliser():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "storyActions" in text
    assert "planActions" in text
    assert "oversightActions" in text
    assert "childArchiveHref" in text
    assert "childChronologyHref" in text
    assert "childLifeEchoHref" in text
    assert "childPlanImpactsHref" in text
