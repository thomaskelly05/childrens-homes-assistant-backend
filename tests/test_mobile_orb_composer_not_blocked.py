from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_floating_companion_hidden_on_mobile():
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "max-md:hidden" in companion
    assert "data-orb-floating-voice-orb" in companion
    assert "orb-companion-float" in css
    assert "display: none" in css or "display: none !important" in css


def test_mic_in_composer_not_floating_fab():
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    assert "data-orb-composer-mic" in composer
    assert "data-orb-composer-send" in composer
