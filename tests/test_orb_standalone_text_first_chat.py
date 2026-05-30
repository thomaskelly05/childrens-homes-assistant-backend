from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
SIDEBAR = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-sidebar.tsx"


def test_text_first_layout_markers():
    sources = COMPANION.read_text(encoding="utf-8") + SIDEBAR.read_text(encoding="utf-8")
    for marker in (
        "orb-chat-layout",
        "orb-chat-sidebar",
        "orb-chat-main",
        "data-orb-text-first-chat",
        "data-orb-empty-state",
        "data-orb-starter-cards",
    ):
        assert marker in sources, marker


def test_orb_branding_copy():
    sources = COMPANION.read_text(encoding="utf-8") + SIDEBAR.read_text(encoding="utf-8")
    assert 'data-orb-brand-name' in COMPANION.read_text(encoding="utf-8")
    assert "Powered by IndiCare" in sources
    assert "ORB" in sources
    assert "ORB Residential does not access IndiCare OS records" in sources
    assert "Standalone residential care assistant" in sources


def test_composer_form_markers():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'data-testid="orb-standalone-message-form"' in text
    assert 'data-testid="orb-standalone-message-input"' in text
    assert 'data-testid="orb-standalone-send-clickable"' in text
    assert 'name="message"' in text
    assert 'type="submit"' in text
