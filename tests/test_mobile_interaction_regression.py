from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_mobile_interaction_audit_doc_exists():
    doc = REPO_ROOT / "docs" / "mobile-interaction-route-stability-audit.md"
    assert doc.is_file()
    text = doc.read_text(encoding="utf-8")
    assert "ORB composer" in text
    assert "Menu drawer" in text


def test_drawer_and_composer_markers_present():
    top_bar = (FRONTEND / "components/indicare/mobile/mobile-os-top-bar.tsx").read_text(encoding="utf-8")
    assert 'data-testid="mobile-drawer"' in top_bar
    assert 'data-testid="mobile-drawer-backdrop"' in top_bar
    assert 'data-testid="mobile-menu-close"' in top_bar
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    assert 'data-testid="orb-standalone-composer"' in composer
    assert 'data-testid="orb-standalone-send-button"' in composer
