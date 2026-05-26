from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_composer_submit_reads_form_and_dom_fallback():
    text = COMPANION.read_text(encoding="utf-8")
    assert "new FormData(event.currentTarget).get('message')" in text
    assert "inputRef.current?.value" in text
    assert "const finalText = (formText || message || domText).trim()" in text


def test_empty_submit_shows_helper_and_returns_early():
    text = COMPANION.read_text(encoding="utf-8")
    assert "Type a message to send." in text
    assert "if (!finalText && attachments.length === 0)" in text


def test_pending_cleared_in_send_finally():
    text = COMPANION.read_text(encoding="utf-8")
    assert "setPending(true)" in text
    assert "setPending(false)" in text
    assert "finally {" in text


def test_composer_textarea_is_controlled_with_message_name():
    composer = COMPOSER.read_text(encoding="utf-8")
    assert 'name="message"' in composer
    assert "value={value}" in composer
    assert 'data-input-source="controlled"' in composer
    assert "onInput={(event) => syncMessage(event.currentTarget.value)}" in composer
