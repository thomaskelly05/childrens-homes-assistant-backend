from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_plan_impact_page():
    page = (REPO / "frontend-next/app/young-people/[id]/plan-impacts/page.tsx").read_text(encoding="utf-8")
    assert "child-plan-impacts-page" in page
    dash = (REPO / "frontend-next/components/young-people/plan-impacts/plan-impact-dashboard.tsx").read_text(
        encoding="utf-8"
    )
    assert "plan-impact-dashboard" in dash
    assert "plan-impact-review-actions" in (REPO / "frontend-next/components/young-people/plan-impacts/plan-impact-review-actions.tsx").read_text(
        encoding="utf-8"
    )
