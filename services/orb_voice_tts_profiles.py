"""ORB Voice TTS voice profiles and style maps (shared by orchestration and adapters)."""

from __future__ import annotations

import os
from typing import Any

ALLOWED_STYLES = {
    "calm_therapeutic",
    "clear_professional",
    "warm_reflective",
    "short_direct",
}

VOICE_PROFILES: dict[str, dict[str, Any]] = {
    "katherine": {
        "label": "Katherine",
        "description": "ORB voice: Katherine — British, calm and professional",
        "openai_voice": "nova",
        "base_speed": 0.92,
        "elevenlabs_voice_env": "ELEVENLABS_VOICE_ID",
    },
    "orb_british_female": {
        "label": "ORB British Female",
        "description": "Calm, confident British-English female delivery.",
        "openai_voice": "nova",
        "base_speed": 0.94,
        "elevenlabs_voice_env": "ELEVENLABS_VOICE_ID",
    },
    "orb_british_female_warm": {
        "label": "ORB British Female (Warm)",
        "description": "Warm, steady British-English female delivery.",
        "openai_voice": "shimmer",
        "base_speed": 0.93,
        "elevenlabs_voice_env": "ELEVENLABS_VOICE_ID",
    },
    "orb_clear_professional": {
        "label": "ORB Clear Professional",
        "description": "Clear, professional British-English delivery.",
        "openai_voice": "onyx",
        "base_speed": 0.96,
        "elevenlabs_voice_env": "ELEVENLABS_VOICE_ID_CLEAR",
    },
}

STYLE_SPEED_OFFSETS = {
    "calm_therapeutic": -0.03,
    "clear_professional": 0.0,
    "warm_reflective": -0.02,
    "short_direct": 0.04,
}

ELEVENLABS_STYLE_SETTINGS = {
    "calm_therapeutic": {"stability": 0.58, "similarity_boost": 0.82, "style": 0.12},
    "clear_professional": {"stability": 0.66, "similarity_boost": 0.86, "style": 0.05},
    "warm_reflective": {"stability": 0.54, "similarity_boost": 0.80, "style": 0.18},
    "short_direct": {"stability": 0.62, "similarity_boost": 0.84, "style": 0.08},
}

ORB_TTS_DEFAULT_VOICE_ID = (os.environ.get("ORB_TTS_DEFAULT_VOICE_ID") or "orb_british_female").strip()
ORB_TTS_DEFAULT_STYLE = (os.environ.get("ORB_TTS_DEFAULT_STYLE") or "calm_therapeutic").strip().lower()


def resolve_elevenlabs_voice_id(voice_id: str) -> str:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    env_key = str(profile.get("elevenlabs_voice_env") or "ELEVENLABS_VOICE_ID")
    resolved = (os.environ.get(env_key) or "").strip()
    if resolved:
        return resolved
    return (os.environ.get("ELEVENLABS_VOICE_ID") or "").strip()


def resolve_speed(voice_id: str, voice_style: str) -> float:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    speed = float(profile.get("base_speed") or 0.94)
    speed += STYLE_SPEED_OFFSETS.get(voice_style, 0.0)
    return max(0.75, min(1.05, speed))


def resolve_openai_voice(voice_id: str) -> str:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    return str(profile.get("openai_voice") or profile.get("provider_voice") or "nova")


def content_type_for_format(audio_format: str) -> str:
    if audio_format == "m4a":
        return "audio/mp4"
    return "audio/mpeg"
