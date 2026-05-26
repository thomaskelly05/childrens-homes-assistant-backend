from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
REPO = Path(__file__).resolve().parents[1]


def test_click_blocker_audit_doc_exists():
    doc = REPO / "docs" / "mobile-bottom-nav-click-blocker-audit.md"
    assert doc.is_file()
    text = doc.read_text(encoding="utf-8")
    assert "mobile-child-bottom-nav" in text
    assert "Root cause" in text
    assert "Fixes applied" in text


def test_bottom_nav_not_full_viewport_overlay():
    nav = (FRONTEND / "components/indicare/mobile/mobile-bottom-nav.tsx").read_text(encoding="utf-8")
    assert "fixed inset-x-0 bottom-0" in nav
    assert "fixed inset-0" not in nav
    assert "max-h-[" not in nav


def test_interaction_coverage_logic_avoids_clamp_false_positives():
    logic = (FRONTEND / "scripts/interaction-coverage-audit-logic.mjs").read_text(encoding="utf-8")
    assert "offscreen_not_tested" in logic
    assert "innerHeight - 1" not in logic
    assert "isBottomNavFalsePositive" in logic
