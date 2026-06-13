from __future__ import annotations

import pytest

from services.orb_voice_profiles import (
    DEFAULT_ORB_VOICE_PROFILE_ID,
    build_residential_voice_instructions,
    get_voice_profile,
    normalise_profile_id,
    resolve_openai_voice,
    resolve_voice_profile_for_session,
)


def test_default_profile_is_orb_british_female():
    assert DEFAULT_ORB_VOICE_PROFILE_ID == "orb_british_female"
    profile = get_voice_profile(None)
    assert profile["id"] == "orb_british_female"
    assert profile["label"] == "ORB British Female"


def test_legacy_preset_aliases_map():
    assert normalise_profile_id("orb_british_calm") == "orb_calm_professional"
    assert normalise_profile_id("orb_british_professional") == "orb_clear_guidance"


def test_resolve_openai_voice_for_profiles():
    assert resolve_openai_voice("orb_british_female") == "coral"
    assert resolve_openai_voice("orb_reflective") == "sage"
    assert resolve_openai_voice("orb_serious_safeguarding") == "onyx"
    assert resolve_openai_voice("system_fallback") is None


def test_session_resolution_includes_profile_metadata():
    resolved = resolve_voice_profile_for_session("orb_friendly_coach")
    assert resolved["selected_voice_profile"] == "orb_friendly_coach"
    assert resolved["provider_voice"] == "nova"
    assert resolved["profile_label"] == "ORB Friendly Coach"


def test_voice_instructions_include_profile_and_mode():
    text = build_residential_voice_instructions(profile_id="orb_british_female", mode="recording_support")
    assert "ORB" in text
    assert "warm British female" in text.lower() or "British" in text
    assert "Recording Support" in text
    assert "one question at a time" in text.lower()
    assert "professional judgement" in text.lower()
