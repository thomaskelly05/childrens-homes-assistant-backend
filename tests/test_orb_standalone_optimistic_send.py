from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"


def test_user_message_appended_before_api_call():
    text = COMPANION.read_text(encoding="utf-8")
    assert "status: 'sent'" in text
    assert "thinkingMessage = createThinkingPlaceholder" in text
    assert "[...existingMessages, userMessage, thinkingMessage]" in text
    assert "setMessage('')" in text
    assert "setPending(true)" in text
    assert "queryStandaloneOrbConversation" in text


def test_thinking_placeholder_precedes_api():
    text = COMPANION.read_text(encoding="utf-8")
    idx_thinking = text.index("thinkingMessage = createThinkingPlaceholder")
    idx_api = text.index("runConversationRequest")
    idx_clear = text.index("setMessage('')")
    assert idx_thinking < idx_clear < idx_api


def test_success_replaces_thinking_not_appends_duplicate():
    text = COMPANION.read_text(encoding="utf-8")
    assert "replaceMessageById(chat.messages, thinkingMessageId, streamingMessage)" in text
    assert "replaceMessageById(chat.messages, assistantId, assistantMessage)" in text
    assert "status: 'complete'" in text


def test_standalone_metadata_defaults_preserve_no_os_records():
    client = (REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts").read_text(encoding="utf-8")
    assert "os_records_accessed: typed.os_records_accessed ?? false" in client
    assert "standalone: typed.standalone ?? true" in client
