from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_standalone_send_is_submit_with_tap_marker():
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    assert 'data-testid="orb-standalone-send-clickable"' in composer
    assert 'type="submit"' in composer
    assert "logTapTarget" in composer
    assert "onSubmit" in composer


def test_operational_send_is_submit_with_tap_marker():
    text = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-send-clickable"' in text
    assert 'type="submit"' in text
    assert "submitInFlightRef" in text
    assert "finally" in text
