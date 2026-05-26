from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_standalone_composer_stable_layout_markers():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    assert "100dvh" in css
    assert "orb-voice-status-slot" in css
    assert "scrolledMessageCountRef" in companion
    assert "visibleMessages.length" in companion


def test_operational_composer_mobile_markers():
    text = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-composer"' in text
    assert "safe-area-inset-bottom" in text
    page = (FRONTEND / "app/assistant/orb/operational-orb-page.tsx").read_text(encoding="utf-8")
    assert "100dvh" in page


def test_floating_orb_hidden_on_composer_pages():
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    shell = (FRONTEND / "lib/navigation/mobile-shell.ts").read_text(encoding="utf-8")
    assert "display: none !important" in css
    assert "/orb" in shell
    assert "/assistant/orb" in shell
