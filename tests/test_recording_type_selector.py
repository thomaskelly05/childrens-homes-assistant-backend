from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
SELECTOR = FRONTEND / "components" / "indicare" / "record" / "recording-type-selector.tsx"
GROUPS = FRONTEND / "lib" / "record" / "recording-category-groups.ts"


def test_recording_type_selector_uses_dropdowns():
    text = SELECTOR.read_text(encoding="utf-8")
    assert 'data-testid="recording-type-selector"' in text
    assert 'data-testid="recording-selector-category"' in text
    assert 'data-testid="recording-selector-type"' in text
    assert "What do you want to record?" in text
    assert "Start this record" in text


def test_recording_type_selector_not_radio_grid():
    text = SELECTOR.read_text(encoding="utf-8")
    assert 'type="radio"' not in text
    assert "sm:grid-cols-3" not in text


def test_category_groups_defined():
    text = GROUPS.read_text(encoding="utf-8")
    assert "RECORDING_SELECTOR_CATEGORIES" in text
    assert "Daily life" in text
    assert "Reg 44 / Reg 45 evidence" in text
