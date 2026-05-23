from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

PAGE = REPO / "frontend-next" / "app" / "intelligence" / "governance" / "ai" / "page.tsx"
DASHBOARD = REPO / "frontend-next" / "components" / "intelligence-governance" / "ai-governance-dashboard.tsx"
STANDALONE_CLIENT = REPO / "frontend-next" / "lib" / "orb" / "standalone-client.ts"

REQUIRED_MARKERS = [
    "AI Governance Dashboard",
    "ai-governance-dashboard",
    "ai-governance-overview",
    "ai-governance-safety",
    "ai-governance-source-health",
    "ai-governance-cost-quality",
    "ai-governance-privacy-notice",
    "Governance dashboard uses metadata and summaries only",
    "does not display raw care records",
]

FORBIDDEN_MARKERS = [
    "daily_note_body",
    "young_person_record",
    "getServerOsYoungPeople",
]


def test_ai_governance_page_exists():
    assert PAGE.is_file()


def test_dashboard_sections_exist():
    text = PAGE.read_text(encoding="utf-8") + DASHBOARD.read_text(encoding="utf-8")
    for marker in REQUIRED_MARKERS:
        assert marker in text, f"Missing marker: {marker}"


def test_no_raw_care_record_strings_in_governance_components():
    components_dir = REPO / "frontend-next" / "components" / "intelligence-governance"
    for path in components_dir.glob("*.tsx"):
        text = path.read_text(encoding="utf-8").lower()
        for forbidden in FORBIDDEN_MARKERS:
            assert forbidden.lower() not in text, f"{forbidden} in {path.name}"


def test_standalone_client_does_not_call_governance_routes():
    text = STANDALONE_CLIENT.read_text(encoding="utf-8")
    assert "/intelligence/governance" not in text
    assert "governance/ai" not in text
