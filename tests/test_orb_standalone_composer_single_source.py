from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_message_state_lives_in_companion():
    text = COMPANION.read_text(encoding="utf-8")
    assert "const [message, setMessage] = useState('')" in text
    assert "value={message}" in text
    assert "onChange={handleMessageChange}" in text
    assert "composerStateLength={message.trim().length}" in text


def test_composer_does_not_keep_local_draft_state():
    text = COMPOSER.read_text(encoding="utf-8")
    assert "useState" not in text.split("export function OrbStandaloneComposer")[1].split("return (")[0]
    assert "value={value}" in text
    assert "onChange" in text
    assert "onInputChange" not in text
    assert "input={input}" not in text


def test_textarea_controlled_with_message_name():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'name="message"' in text
    assert 'data-input-source="controlled"' in text
    assert "onChange={(event) => syncMessage(event.currentTarget.value)}" in text
    assert "onInput={(event) => syncMessage(event.currentTarget.value)}" in text
    assert "onCompositionEnd={(event) => syncMessage(event.currentTarget.value)}" in text
