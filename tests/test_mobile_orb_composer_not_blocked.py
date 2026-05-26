from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_no_floating_companion_on_standalone_orb():
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    assert "data-orb-floating-voice-orb" not in companion
    assert "orbCompanionExpanded" not in companion
    assert "data-orb-text-first-chat" in companion


def test_mic_in_composer_not_floating_fab():
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    assert "data-orb-composer-mic" in composer
    assert "data-orb-composer-send" in composer
    assert 'data-testid="orb-standalone-send-clickable"' in composer
