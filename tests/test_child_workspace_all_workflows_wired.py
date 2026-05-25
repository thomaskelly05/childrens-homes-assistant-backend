from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NORMALISER = REPO_ROOT / "frontend-next" / "lib" / "young-people" / "child-workspace-normaliser.ts"
OVERVIEW = REPO_ROOT / "frontend-next" / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"

REQUIRED_QUICK_ACTIONS = [
    "child-quick-record",
    "child-quick-daily-note",
    "child-quick-incident",
    "child-quick-safeguarding",
    "child-quick-keywork",
    "child-quick-family-time",
    "child-quick-education",
    "child-quick-health",
    "child-quick-behaviour",
    "child-quick-missing",
    "child-quick-chronology",
    "child-quick-actions",
    "child-quick-documents",
    "child-quick-handover",
    "child-quick-reviews",
    "child-quick-alerts",
    "child-quick-voice",
    "child-quick-care-planning",
    "child-quick-orb",
]

EVIDENCE_MARKERS = [
    "Evidence and workflow",
    "child-evidence-templates",
    "child-evidence-formal-submission",
    "child-evidence-manager-review",
]


def test_normaliser_imports_scope_routes():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "childOrbHref" in text or "scope-routes" in text
    


def test_quick_actions_cover_primary_workflows():
    text = NORMALISER.read_text(encoding="utf-8")
    for test_id in REQUIRED_QUICK_ACTIONS:
        assert test_id in text, f"Missing quick action {test_id}"


def test_evidence_section_markers():
    overview = OVERVIEW.read_text(encoding="utf-8")
    normaliser = NORMALISER.read_text(encoding="utf-8")
    for marker in EVIDENCE_MARKERS:
        assert marker in overview or marker in normaliser


def test_no_os_young_people_browser_paths():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "/os/young-people" not in text
