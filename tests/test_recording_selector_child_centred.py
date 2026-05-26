from __future__ import annotations

from pathlib import Path

SELECTOR = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "indicare"
    / "record"
    / "recording-type-selector.tsx"
)
CATEGORIES = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "record" / "recording-category-groups.ts"
)
REGISTRY = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"


def test_recording_type_selector_exists():
    text = SELECTOR.read_text(encoding="utf-8")
    assert 'data-testid="recording-type-selector"' in text
    assert "What do you want to record?" in text


def test_selector_uses_category_groups_and_registry():
    selector = SELECTOR.read_text(encoding="utf-8")
    categories = CATEGORIES.read_text(encoding="utf-8")
    assert "RECORDING_SELECTOR_CATEGORIES" in categories
    assert "recording-category-groups" in selector
    assert "recording-form-registry" in selector


def test_browse_all_not_default_grid():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "Browse all recording types" in text
    assert "recording-selector-category" in text
    assert "grid-cols-3" not in text and "grid-cols-4" not in text
