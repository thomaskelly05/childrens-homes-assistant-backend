from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"


def test_voice_transcript_does_not_overwrite_typed_text():
    text = COMPANION.read_text(encoding="utf-8")
    assert "composerUserEditedRef" in text
    assert "voiceMayFillComposerRef" in text
    assert "if (composerUserEditedRef.current && !voiceMayFillComposerRef.current) return" in text


def test_voice_listening_does_not_disable_send_button():
    composer = COMPOSER.read_text(encoding="utf-8")
    assert "const sendDisabled = pending || !canSend" in composer
    assert "disabled={sendDisabled}" in composer
    assert "voiceListening" not in composer.split("const sendDisabled")[1].split("\n", 1)[0]


def test_floating_voice_fab_not_shown_by_default():
    text = COMPANION.read_text(encoding="utf-8")
    assert "orbCompanionExpanded" not in text
    assert "data-orb-companion-float" not in text
    assert 'data-orb-companion-fab' not in text
    assert "data-orb-composer-mic" in COMPOSER.read_text(encoding="utf-8")


def test_voice_fill_allowed_when_composer_empty_on_mic_activate():
    text = COMPANION.read_text(encoding="utf-8")
    assert "voiceMayFillComposerRef.current = true" in text
    assert "if (!input.trim())" in text
