from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGE = REPO / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"

SECTION_MARKERS = [
    "home-workspace-section-today",
    "home-workspace-section-safeguarding",
    "home-workspace-section-inspection",
    "home-workspace-children",
]

GROUP_LABELS = [
    "Home today",
    "Safeguarding and oversight",
    "Regulation and quality",
]


def test_home_workspace_grouped_sections():
    text = PAGE.read_text(encoding="utf-8")
    assert "home-workspace-page" in text
    for marker in SECTION_MARKERS:
        assert marker in text, marker
    for label in GROUP_LABELS:
        assert label in text, label


def test_home_workspace_single_orb_rail():
    text = PAGE.read_text(encoding="utf-8")
    assert text.count("<OperationalOrbRail") == 1


def test_home_workspace_primary_links_are_real():
    text = PAGE.read_text(encoding="utf-8")
    assert "home-workspace-choose-child" in text
    assert "MobileSafeLink" in text
    assert 'href="#"' not in text
