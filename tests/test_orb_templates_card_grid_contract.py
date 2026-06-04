from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_templates_card_grid_markers():
    panel = read_frontend("components/orb-standalone/orb-templates-panel.tsx")
    assert "data-orb-templates-card-grid" in panel
    assert "data-orb-template-card" in panel
    assert "data-orb-use-template" in panel
    assert "data-orb-template-preview" in panel


def test_templates_featured_surface():
    panel = read_frontend("components/orb-standalone/orb-templates-panel.tsx")
    assert "FEATURED_TEMPLATE_TITLES" in panel
    assert "Safeguarding concern record" in panel


def test_templates_search_and_filters_preserved():
    panel = read_frontend("components/orb-standalone/orb-templates-panel.tsx")
    assert "Search templates" in panel
    assert "fetchOrbTemplates" in panel
    assert "filterFallbackTemplates" in panel
