from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def test_official_source_badge_marker():
    text = (REPO / "frontend-next/components/orb-standalone/orb-knowledge-library.tsx").read_text()
    assert "data-orb-official-source" in text or "Official" in text


def test_summary_only_warning_marker():
    text = (REPO / "frontend-next/components/orb-standalone/orb-source-governance-panel.tsx").read_text()
    assert "data-orb-summary-only-warning" in text


def test_citation_health_marker():
    text = (REPO / "frontend-next/components/orb-standalone/orb-source-governance-panel.tsx").read_text()
    assert "data-orb-citation-health" in text


def test_import_official_source_label():
    text = (REPO / "frontend-next/components/orb-standalone/orb-knowledge-library.tsx").read_text()
    assert "Import official source" in text


def test_exact_citation_display_marker():
    text = (REPO / "frontend-next/components/orb-standalone/orb-intelligence-output.tsx").read_text()
    assert "data-orb-exact-citation" in text
