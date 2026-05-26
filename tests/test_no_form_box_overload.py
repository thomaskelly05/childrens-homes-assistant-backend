from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
RECORD_HUB = FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx"
CHILD_OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
SELECTOR = FRONTEND / "components" / "indicare" / "record" / "recording-type-selector.tsx"


def test_record_hub_hides_catalogue_by_default():
    hub = RECORD_HUB.read_text(encoding="utf-8")
    assert "browseCatalogue" in hub
    assert "record-hub-browse-catalogue-toggle" in hub
    assert "{browseCatalogue ?" in hub


def test_record_hub_hides_card_sections_by_default():
    hub = RECORD_HUB.read_text(encoding="utf-8")
    assert "browseAllCards" in hub
    assert "{browseAllCards" in hub


def test_child_workspace_no_catalogue_grid():
    overview = CHILD_OVERVIEW.read_text(encoding="utf-8")
    assert "RecordingCataloguePanel" not in overview
    assert "record-card-" not in overview


def test_selector_uses_select_not_mass_cards():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "<select" in text
    assert 'data-testid="recording-selector-category"' in text
