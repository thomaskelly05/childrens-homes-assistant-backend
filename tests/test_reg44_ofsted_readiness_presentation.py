from __future__ import annotations

from pathlib import Path

INSPECTION = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "inspection-readiness"
    / "inspection-readiness-workspace.tsx"
)
REG45 = Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "reg45" / "reg45-review-workspace.tsx"
SCCIF = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "intelligence" / "sccif" / "page.tsx"


def test_inspection_readiness_safe_copy():
    text = INSPECTION.read_text(encoding="utf-8")
    assert "Inspection readiness" in text
    assert "Gaps to review" in text
    assert "guaranteed compliance" in text.lower() or "do not claim" in text.lower()


def test_reg45_safe_copy():
    text = REG45.read_text(encoding="utf-8")
    assert "reg45-safety-note" in text
    assert "grade" in text.lower() or "grades" in text.lower()


def test_sccif_quality_standards_copy():
    text = SCCIF.read_text(encoding="utf-8")
    assert "Quality Standards" in text
    assert "guarantee" in text.lower() or "predict" in text.lower()
