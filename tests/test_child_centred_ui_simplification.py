from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"
OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
SELECTOR_CARD = FRONTEND / "components" / "young-people" / "workspace" / "child-recording-selector-card.tsx"
MAP = REPO / "docs" / "child-centred-ui-simplification-map.md"


def test_simplification_map_exists():
    assert MAP.is_file()
    text = MAP.read_text(encoding="utf-8")
    assert "Recording selector model" in text
    assert "ORB presence rules" in text


def test_child_workspace_has_recording_selector_section():
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "ChildRecordingSelectorCard" in overview
    assert 'data-testid="child-workspace-recording-selector"' in SELECTOR_CARD.read_text(encoding="utf-8")
    assert "child-workspace-section-recording" in overview


def test_child_workspace_uses_story_sections_not_form_grid():
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "child-workspace-section-know-me" in overview
    assert "child-workspace-section-today" in overview
    assert "child-workspace-section-story" in overview
    assert "WorkspaceSectionAccordion" in overview
    assert overview.count("RecordCard") == 0


def test_child_workspace_no_mobile_duplicate_orb_rail():
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "child-workspace-mobile-actions" not in overview
    assert overview.count("OperationalOrbRail") == 0
