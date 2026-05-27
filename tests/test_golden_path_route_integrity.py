from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
APP = REPO / "frontend-next" / "app"

GOLDEN_BROWSER_ROUTES = [
    "select-scope",
    "homes/[id]/workspace",
    "young-people/[id]/workspace",
    "record",
    "record/reviews",
    "young-people/[id]/archive",
    "young-people/[id]/chronology",
    "young-people/[id]/lifeecho",
    "young-people/[id]/plan-impacts",
    "handover",
    "record/alerts",
    "intelligence/inspection-readiness",
    "intelligence/sccif",
    "intelligence/reg45",
    "orb",
    "assistant/orb",
]


def _page(route: str) -> Path:
    return APP / route / "page.tsx"


def test_all_golden_path_pages_exist():
    missing = [r for r in GOLDEN_BROWSER_ROUTES if not _page(r).is_file()]
    assert not missing, f"Missing golden path pages: {missing}"


def test_golden_path_doc_lists_routes():
    doc = (REPO / "docs" / "live-demo-qa-hardening-report.md").read_text(encoding="utf-8")
    for fragment in ("/select-scope", "/homes/1/workspace", "/young-people/1/workspace", "/assistant/orb"):
        assert fragment in doc, f"QA doc should mention {fragment}"
