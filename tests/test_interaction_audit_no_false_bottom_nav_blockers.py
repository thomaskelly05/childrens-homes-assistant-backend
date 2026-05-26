from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_coverage_logic_module_exports():
    logic = (FRONTEND / "scripts/interaction-coverage-audit-logic.mjs").read_text(encoding="utf-8")
    for name in (
        "classifyControlViewport",
        "isBottomNavFalsePositive",
        "summariseInteractionCoverage",
        "BROWSER_INTERACTION_AUDIT_SNIPPET",
    ):
        assert name in logic


def test_audit_interaction_imports_coverage_logic():
    audit = (FRONTEND / "scripts/audit-interaction.mjs").read_text(encoding="utf-8")
    assert "interaction-coverage-audit-logic.mjs" in audit
    assert "offscreen_not_tested" in audit
    assert "isBottomNavFalsePositive" in audit


def test_browser_snippet_does_not_clamp_y_to_viewport_bottom():
    logic = (FRONTEND / "scripts/interaction-coverage-audit-logic.mjs").read_text(encoding="utf-8")
    snippet_start = logic.index("BROWSER_INTERACTION_AUDIT_SNIPPET")
    snippet = logic[snippet_start:]
    assert "innerHeight - 1" not in snippet
    assert "offscreen_not_tested" in snippet
