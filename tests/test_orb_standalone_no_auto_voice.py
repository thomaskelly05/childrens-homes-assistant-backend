from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
VOICE_HOOK = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "use-standalone-orb-voice.ts"


def test_no_auto_listen_on_mount():
    text = COMPANION.read_text(encoding="utf-8")
    assert "STANDALONE_ORB_VOICE_CAPTURE_ENABLED" in text
    assert "startListening()" not in text.split("export function OrbCareCompanion")[1].split("function handleMicClick")[0]


def test_no_listening_status_by_default():
    text = COMPANION.read_text(encoding="utf-8")
    assert "function voiceStatusLine" in text
    assert "return 'Voice ready'" not in text
    assert "Listening…" in text
    assert "if (!voiceCaptureEnabled) return ''" in text


def test_no_floating_tap_to_speak_orb():
    text = COMPANION.read_text(encoding="utf-8")
    assert "orbCompanionExpanded" not in text
    assert "data-orb-companion-float" not in text
    assert "OrbCompactCompanion" not in text


def test_mic_is_type_button():
    text = COMPOSER.read_text(encoding="utf-8")
    assert 'type="button"' in text
    assert "onMicClick" in text


def test_voice_defaults_text_first():
    hook = VOICE_HOOK.read_text(encoding="utf-8")
    assert "continuousConversation: false" in hook
    assert "voiceReplies: false" in hook
    assert "wakePhrase: false" in hook
