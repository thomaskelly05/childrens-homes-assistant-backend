from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_standalone_chat_layout_markers():
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert "orb-chat-layout" in companion
    assert "Standalone residential care assistant" in companion
    assert "data-orb-composer-send" in composer
    assert "data-orb-standalone-composer" in composer
    assert "100dvh" in css or "100dvh" in companion
