from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PAGE = REPO / "frontend-next" / "app" / "intelligence" / "inspection-readiness" / "page.tsx"
WORKSPACE = REPO / "frontend-next" / "components" / "inspection-readiness" / "inspection-readiness-workspace.tsx"


def test_inspection_safe_copy_no_grade_prediction():
    page = PAGE.read_text(encoding="utf-8")
    workspace = WORKSPACE.read_text(encoding="utf-8")
    combined = page + workspace
    assert "do not predict" in combined.lower() or "does not predict" in combined.lower()
    assert "Manager judgement" in combined or "manager judgement" in combined.lower()
    assert "Gaps to review" in workspace
    assert "inspection-evidence-snapshot" in workspace


def test_inspection_routes_back_and_assistant_orb():
    page = PAGE.read_text(encoding="utf-8")
    summary = REPO / "frontend-next" / "components" / "inspection-readiness" / "inspection-readiness-summary.tsx"
    assert "inspection-back-home-workspace" in page
    assert "/assistant/orb" in page
    assert "inspection-quality-standards-alignment" in summary.read_text(encoding="utf-8")
