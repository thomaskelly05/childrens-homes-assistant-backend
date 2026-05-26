from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_standalone_send_markers():
    composer = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    companion = (FRONTEND / "components/orb-standalone/orb-care-companion.tsx").read_text(encoding="utf-8")
    assert "data-orb-composer-send" in composer
    assert "data-orb-composer-input" in composer
    assert "sendMessage" in companion
    assert "data-testid=\"orb-standalone-send-error\"" in companion


def test_operational_send_markers():
    text = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert "data-testid=\"orb-operational-message-form\"" in text
    assert "data-testid=\"orb-operational-send-button\"" in text
    assert "ORB_SEND_RETRY_MESSAGE" in text
    assert "finally" in text


def test_retry_error_copy():
    errors = (FRONTEND / "lib" / "interaction" / "orb-send-errors.ts").read_text(encoding="utf-8")
    assert "ORB could not send that message. Please retry." in errors
    standalone = (FRONTEND / "lib" / "orb" / "standalone-client.ts").read_text(encoding="utf-8")
    assert "STANDALONE_ORB_SEND_RETRY_MESSAGE" in standalone
