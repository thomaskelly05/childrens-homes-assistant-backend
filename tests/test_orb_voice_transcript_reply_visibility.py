from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_voice_station_renders_transcript_and_reply():
    voice = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-transcript" in voice
    assert "data-orb-voice-reply" in voice
    assert "displayedOrbReply" in voice
    assert "assistantReply" in voice


def test_voice_assistant_reply_wired_from_companion():
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "voiceStationAssistant" in companion
    assert "assistantReply={voiceStationAssistant?.text" in companion


def test_voice_spoken_blocked_still_shows_text():
    voice = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-spoken-blocked" in voice
    assert "resolveOrbVoiceSpeechDecision" in voice


def test_high_risk_auto_send_pause():
    core = read_frontend("lib/orb/indicare-intelligence-core.ts")
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "shouldPauseVoiceAutoSend" in core
    assert "shouldPauseVoiceAutoSend" in companion


def test_voice_continue_in_chat_action():
    voice = read_frontend("components/orb-standalone/orb-voice-station.tsx")
    assert "data-orb-voice-continue-chat" in voice or "data-orb-voice-send-to-chat" in voice


def test_voice_hook_transcript_state():
    hook = read_frontend("components/orb-standalone/use-standalone-orb-voice.ts")
    assert "transcript" in hook
    assert "displayTranscript" in hook
    assert "transcript_ready" in hook
