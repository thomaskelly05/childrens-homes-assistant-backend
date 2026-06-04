from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_spoken_summary_helper_exists():
    src = read_frontend("lib/orb/voice/orb-spoken-summary.ts")
    assert "buildOrbSpokenSummary" in src
    assert "I've put the follow-up points on screen" in src or "on screen" in src


def test_speech_policy_blocks_safeguarding_critical():
    src = read_frontend("lib/orb/voice/orb-voice-speech-policy.ts")
    assert "safeguarding_critical" in src
    assert "resolveOrbVoiceSpeechDecision" in src
    assert "Spoken reply paused for privacy/safeguarding" in src


def test_companion_uses_spoken_summary_not_full_answer():
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "resolveOrbVoiceSpeechDecision" in companion
    assert "speechDecision.allowAutoSpeak" in companion
    assert "speechDecision.spokenText" in companion


def test_intelligence_core_blocks_residential_deep_auto_speak():
    core = read_frontend("lib/orb/indicare-intelligence-core.ts")
    assert "residential_deep" in core
    assert "shouldBlockAutoSpokenReply" in core
