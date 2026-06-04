from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_curated_voice_profiles_exist():
    src = read_frontend("lib/orb/voice/orb-voice-profiles.ts")
    for profile_id, label in [
        ("calm_female", "Calm Female"),
        ("calm_male", "Calm Male"),
        ("neutral_professional", "Neutral Professional"),
        ("soft_supportive", "Soft Supportive"),
        ("concise_shift", "Concise Shift Voice"),
    ]:
        assert f"id: '{profile_id}'" in src
        assert f"label: '{label}'" in src


def test_profiles_include_voice_terms_and_defaults():
    src = read_frontend("lib/orb/voice/orb-voice-profiles.ts")
    assert "preferredVoiceTerms" in src
    assert "fallbackTerms" in src
    assert "defaultRate" in src
    assert "spokenStyleGuidance" in src
    assert "resolveBrowserVoice" in src


def test_legacy_default_profile_preserved():
    src = read_frontend("lib/orb/voice/orb-voice-profiles.ts")
    assert "DEFAULT_ORB_VOICE_PROFILE_ID = 'orb_british_female'" in src
    assert "orb_british_female" in src
