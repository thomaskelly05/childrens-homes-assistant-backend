from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_recording_catalogue_panel_exists():
    panel = FRONTEND / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx"
    assert panel.is_file()


def test_record_hub_has_catalogue_and_search():
    hub = _read(FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx")
    catalogue = _read(FRONTEND / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx")
    assert "RecordingCataloguePanel" in hub
    assert 'data-testid="recording-catalogue-search"' in catalogue
    assert "Search forms" in catalogue


def test_catalogue_category_filters():
    catalogue = _read(FRONTEND / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx")
    assert 'data-testid="recording-catalogue-category-filters"' in catalogue
    assert "Safeguarding and protection" in catalogue or "safeguarding" in catalogue.lower()


def test_catalogue_status_filters():
    catalogue = _read(FRONTEND / "components" / "indicare" / "record" / "recording-catalogue-panel.tsx")
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert 'data-testid="recording-catalogue-status-filters"' in catalogue
    assert "RECORDING_STATUS_FILTERS" in catalogue
    for label in (
        "Formal submit supported",
        "Draft workspace",
        "Manager review required",
        "Safeguarding sensitive",
    ):
        assert label in registry


def test_workflow_status_in_workspace():
    workspace = _read(FRONTEND / "components" / "indicare" / "record" / "recording-workspace.tsx")
    assert 'data-testid="recording-workflow-status"' in workspace
    assert "recording-manager-review-copy" in workspace
