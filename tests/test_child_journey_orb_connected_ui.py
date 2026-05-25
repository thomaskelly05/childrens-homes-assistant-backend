from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

CHILD_JOURNEY_FILES = [
    FRONTEND / "app" / "young-people" / "[id]" / "journey" / "page.tsx",
    FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts",
    FRONTEND / "components" / "child-journey" / "child-journey-header.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-today-section.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-attention-strip.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-recording-actions.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-journey-picture.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-evidence-card.tsx",
    FRONTEND / "components" / "child-journey" / "child-journey-orb-rail.tsx",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_child_journey_section_markers():
    combined = "\n".join(_read(path) for path in CHILD_JOURNEY_FILES)
    for marker in (
        "What adults need to know today",
        "What needs attention?",
        "What needs recording?",
        "Journey picture",
        "Evidence and review",
        "ORB on this journey",
        "Connected to this young person",
        "Summarise this child's last 7 days",
        "child_journey_summary",
    ):
        assert marker in combined, f"Missing child journey marker: {marker}"


def test_child_journey_operational_orb_links_only():
    combined = "\n".join(_read(path) for path in CHILD_JOURNEY_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Child journey must use operational ORB, found {href}"


def test_child_journey_routes_use_assistant_orb_with_child_context():
    routes = _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")
    assert "/assistant/orb" in routes
    assert "mode=child_journey_summary" in routes or "child_journey_summary" in routes
    assert "young_person_id" in routes


def test_child_journey_recording_cards_include_orb_hints():
    recording = _read(FRONTEND / "components" / "child-journey" / "child-journey-recording-actions.tsx")
    routes = _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")
    assert "ORB can help make this child-centred" in routes
    assert "OrbInlineHint" in recording
    assert "safeguarding" in routes
    assert "physical-intervention" in routes
    assert "All child recording forms" in routes
    assert "Handover notes for this child" in routes
    assert "Handover intelligence for this child" in routes
    assert "/handover?child_id=" in routes


def test_child_journey_page_composes_workspace_sections():
    page = _read(FRONTEND / "app" / "young-people" / "[id]" / "journey" / "page.tsx")
    for component in (
        "ChildJourneyHeader",
        "ChildJourneyTodaySection",
        "ChildJourneyAttentionStrip",
        "ChildJourneyRecordingActions",
        "ChildJourneyJourneyPicture",
        "ChildJourneyEvidenceSection",
        "ChildJourneyOrbRail",
    ):
        assert component in page
