from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_send_disabled_only_when_empty_or_pending():
    text = COMPOSER.read_text(encoding="utf-8")
    assert "const canSend = trimmedMessage.length > 0 || attachments.length > 0" in text
    assert "const sendDisabled = pending || !canSend" in text
    assert "disabled={sendDisabled}" in text
    assert "voiceListening" not in text.split("const sendDisabled")[1].split("\n", 1)[0]


def test_send_button_has_message_length_marker():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'data-testid="orb-standalone-send-clickable"' in text
    assert "data-message-length={trimmedMessage.length}" in text
    assert "data-send-disabled-reason={disabledReason}" in text


def test_send_button_is_submit_type():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'type="submit"' in text
    assert 'name="message"' in text
