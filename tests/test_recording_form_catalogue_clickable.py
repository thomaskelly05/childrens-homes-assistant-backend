from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx"
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"
CATALOGUE_ENTRIES = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-catalogue-entries.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _form_ids() -> list[str]:
    text = _read(REGISTRY) + _read(CATALOGUE_ENTRIES)
    return sorted({m.group(1) for m in re.finditer(r"^\s+id: '([^']+)'", text, re.MULTILINE)})


def test_catalogue_has_search_and_filters():
    text = _read(CATALOGUE)
    assert "recording-catalogue-search" in text
    assert "recording-catalogue-category-filters" in text
    assert "recording-catalogue-status-filters" in text


def test_every_form_has_catalogue_card_testid():
    panel = _read(CATALOGUE)
    ids = _form_ids()
    assert len(ids) >= 80
    assert 'data-testid={`recording-catalogue-card-${form.id}`}' in panel or "recording-catalogue-card-" in panel


def test_catalogue_cards_clickable():
    text = _read(CATALOGUE)
    assert "Open" in text
    assert "recording-catalogue-grid" in text


def test_catalogue_badges():
    text = _read(CATALOGUE)
    for badge in ("Structured", "Formal route", "Draft only", "Plan impact", "LifeEcho possible"):
        assert badge in text
