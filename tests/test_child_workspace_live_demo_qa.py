from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OVERVIEW = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
SELECTOR = REPO / "frontend-next" / "components" / "young-people" / "workspace" / "child-recording-selector-card.tsx"
NORMALISER = REPO / "frontend-next" / "lib" / "young-people" / "child-workspace-normaliser.ts"

EXPECTED_SECTIONS = [
    "child-workspace-section-understand",
    "child-workspace-section-today",
    "child-workspace-section-record-once",
    "child-workspace-section-story",
    "child-workspace-section-plans",
    "child-workspace-section-oversight",
    "child-workspace-more-menu",
]


def test_child_workspace_overview_sections():
    text = OVERVIEW.read_text(encoding="utf-8")
    for testid in EXPECTED_SECTIONS:
        assert testid in text, testid
    assert "child-workspace-overview-page" in text


def test_record_once_tagline_copy():
    tagline = SELECTOR.read_text(encoding="utf-8")
    assert "Record once. IndiCare connects this to the child" in tagline
    assert "story, plans, oversight and evidence" in tagline


def test_single_embedded_orb_rail_on_child_workspace():
    text = OVERVIEW.read_text(encoding="utf-8")
    assert "ChildWorkspaceOrbRail" in text
    assert text.count("OperationalOrbRail") == 0


def test_no_duplicate_plans_card_in_story_section():
    text = OVERVIEW.read_text(encoding="utf-8")
    story_start = text.split("child-workspace-section-story")[1].split("child-workspace-section-plans")[0]
    assert story_start.count("ChildPlansDocumentsCard") == 0


def test_child_voice_href_in_normaliser_points_to_record():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "childVoiceHref" in text
