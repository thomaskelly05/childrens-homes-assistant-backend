from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


def test_failure_keeps_user_message_and_sets_error_bubble():
    companion = COMPANION.read_text(encoding="utf-8")
    assert "createErrorPlaceholder" in companion
    assert "replaceMessageById(chat.messages, thinkingMessageId, errorMessage)" in companion
    assert "setRetryPayload" in companion
    assert 'data-testid="orb-message-error"' in companion


def test_empty_state_hidden_when_error_without_messages():
    text = COMPANION.read_text(encoding="utf-8")
    assert "visibleMessages.length === 0 && !pending && !error" in text


def test_generic_retry_copy_in_client():
    text = CLIENT.read_text(encoding="utf-8")
    assert "STANDALONE_ORB_SEND_RETRY_MESSAGE" in text
    assert "parseStandaloneOrbSendError" in text
