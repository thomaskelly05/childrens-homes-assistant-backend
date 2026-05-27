from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_send_message_not_blocked_by_submit_guard_ref():
    """Form submit sets submitGuardRef before sendMessage; send must not re-check it."""
    text = COMPANION.read_text(encoding="utf-8")
    send_fn = text.split("const sendMessage = useCallback(", 1)[1].split("const handleComposerSubmit", 1)[0]
    assert "submitGuardRef.current" not in send_fn


def test_handle_composer_submit_calls_send_with_final_text():
    text = COMPANION.read_text(encoding="utf-8")
    submit_block = text.split("const handleComposerSubmit = useCallback(", 1)[1].split("/** Mic is text-first", 1)[0]
    assert "const finalText = message.trim()" in submit_block
    assert "await sendMessage(finalText)" in submit_block
    assert "new FormData" not in submit_block
    assert "inputRef.current?.value" not in submit_block


def test_orb_send_logging_markers():
    text = COMPANION.read_text(encoding="utf-8")
    assert "console.info('[orb-send] submit'" in text
    assert "console.info('[orb-send] request started')" in text
    assert "console.info('[orb-send] response received')" in text
    assert "console.warn('[orb-send] failed'" in text


def test_enter_submits_via_request_submit_not_direct_handler():
    composer = COMPOSER.read_text(encoding="utf-8")
    assert "form.requestSubmit()" in composer
    assert "void onSubmit()" not in composer.split("onKeyDown")[1].split("rows={1}", 1)[0]


def test_shift_enter_does_not_submit():
    composer = COMPOSER.read_text(encoding="utf-8")
    key_block = composer.split("onKeyDown={(event) => {", 1)[1].split("rows={1}", 1)[0]
    assert "event.shiftKey" in key_block
    assert "if (event.key !== 'Enter' || event.shiftKey) return" in key_block


def test_query_standalone_conversation_used_for_send():
    text = COMPANION.read_text(encoding="utf-8")
    assert "await queryStandaloneOrbConversation" in text
    assert "message: framedMessage" in text
