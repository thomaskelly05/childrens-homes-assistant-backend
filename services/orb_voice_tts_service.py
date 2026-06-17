"""Premium ORB Voice TTS for ORB Residential iOS spoken-reply playback.

Sends short generated text to OpenAI speech API and returns transient audio bytes.
Does not store audio. Does not log spoken text content.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)

ORB_TTS_ENABLED = os.environ.get("ORB_TTS_ENABLED", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ORB_TTS_PROVIDER = (os.environ.get("ORB_TTS_PROVIDER") or "openai").strip().lower()
ORB_TTS_DEFAULT_VOICE_ID = (os.environ.get("ORB_TTS_DEFAULT_VOICE_ID") or "orb_british_female").strip()
ORB_TTS_DEFAULT_STYLE = (os.environ.get("ORB_TTS_DEFAULT_STYLE") or "calm_therapeutic").strip().lower()
ORB_TTS_MODEL = (os.environ.get("ORB_TTS_MODEL") or "tts-1-hd").strip()
ORB_TTS_MAX_TEXT_CHARS = int(os.environ.get("ORB_TTS_MAX_TEXT_CHARS") or "500")
ORB_TTS_TIMEOUT_SECONDS = float(os.environ.get("ORB_TTS_TIMEOUT_SECONDS") or "20")

ALLOWED_STYLES = {
    "calm_therapeutic",
    "clear_professional",
    "warm_reflective",
    "short_direct",
}

VOICE_PROFILES: dict[str, dict[str, Any]] = {
    "orb_british_female": {
        "label": "ORB British Female",
        "provider_voice": "nova",
        "base_speed": 0.94,
        "description": "Calm, confident British-English female delivery.",
    },
    "orb_british_female_warm": {
        "label": "ORB British Female (Warm)",
        "provider_voice": "shimmer",
        "base_speed": 0.93,
        "description": "Warm, steady British-English female delivery.",
    },
}

STYLE_SPEED_OFFSETS = {
    "calm_therapeutic": -0.03,
    "clear_professional": 0.0,
    "warm_reflective": -0.02,
    "short_direct": 0.04,
}


@dataclass(frozen=True)
class ORBVoiceTTSResult:
    audio_bytes: bytes
    content_type: str
    voice_id: str
    voice_style: str
    provider: str


class ORBVoiceTTSError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def is_configured() -> bool:
    if not ORB_TTS_ENABLED:
        return False
    if ORB_TTS_PROVIDER == "openai":
        return bool((os.environ.get("OPENAI_API_KEY") or "").strip())
    return False


def tts_status_payload() -> dict[str, Any]:
    configured = is_configured()
    return {
        "enabled": configured,
        "configured": configured,
        "provider": ORB_TTS_PROVIDER,
        "default_voice_id": ORB_TTS_DEFAULT_VOICE_ID,
        "default_style": ORB_TTS_DEFAULT_STYLE,
        "available_voices": [
            {"id": voice_id, "label": profile["label"], "description": profile["description"]}
            for voice_id, profile in VOICE_PROFILES.items()
        ],
    }


def _normalise_text(value: str | None) -> str:
    return (value or "").strip()


def _resolve_voice_id(requested: str | None) -> str:
    voice_id = (requested or ORB_TTS_DEFAULT_VOICE_ID).strip()
    if voice_id not in VOICE_PROFILES:
        return ORB_TTS_DEFAULT_VOICE_ID
    return voice_id


def _resolve_style(requested: str | None) -> str:
    style = (requested or ORB_TTS_DEFAULT_STYLE).strip().lower()
    if style not in ALLOWED_STYLES:
        return ORB_TTS_DEFAULT_STYLE
    return style


def _resolve_speed(voice_id: str, voice_style: str) -> float:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    speed = float(profile.get("base_speed") or 0.94)
    speed += STYLE_SPEED_OFFSETS.get(voice_style, 0.0)
    return max(0.75, min(1.05, speed))


def _content_type_for_format(audio_format: str) -> str:
    if audio_format == "m4a":
        return "audio/mp4"
    return "audio/mpeg"


def _synthesize_openai_sync(*, text: str, voice_id: str, voice_style: str, audio_format: str) -> ORBVoiceTTSResult:
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise ORBVoiceTTSError("tts_unconfigured", "Premium ORB Voice is not configured.", 503)

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ORBVoiceTTSError("tts_provider_unavailable", "TTS provider is unavailable.", 503) from exc

    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    provider_voice = str(profile.get("provider_voice") or "nova")
    speed = _resolve_speed(voice_id, voice_style)
    response_format = "aac" if audio_format == "m4a" else "mp3"

    client = OpenAI(api_key=api_key, timeout=ORB_TTS_TIMEOUT_SECONDS)
    try:
        response = client.audio.speech.create(
            model=ORB_TTS_MODEL,
            voice=provider_voice,
            input=text,
            response_format=response_format,
            speed=speed,
        )
    except Exception as exc:
        logger.warning("orb_voice_tts_openai_failed error=%s", exc.__class__.__name__)
        raise ORBVoiceTTSError("tts_provider_failed", "Premium ORB Voice could not be generated.", 503) from exc

    audio_bytes = response.content if hasattr(response, "content") else bytes(response)
    if not audio_bytes:
        raise ORBVoiceTTSError("tts_empty_audio", "Premium ORB Voice returned no audio.", 503)

    return ORBVoiceTTSResult(
        audio_bytes=audio_bytes,
        content_type=_content_type_for_format(audio_format),
        voice_id=voice_id,
        voice_style=voice_style,
        provider="openai",
    )


async def synthesize_spoken_reply(
    *,
    text: str,
    voice_id: str | None = None,
    voice_style: str | None = None,
    audio_format: str = "mp3",
) -> ORBVoiceTTSResult:
    if not is_configured():
        raise ORBVoiceTTSError("tts_disabled", "Premium ORB Voice is not enabled.", 503)

    cleaned = _normalise_text(text)
    if not cleaned:
        raise ORBVoiceTTSError("empty_text", "Spoken text is required.", 400)
    if len(cleaned) > ORB_TTS_MAX_TEXT_CHARS:
        raise ORBVoiceTTSError(
            "text_too_long",
            f"Spoken text must be {ORB_TTS_MAX_TEXT_CHARS} characters or fewer.",
            400,
        )

    resolved_voice = _resolve_voice_id(voice_id)
    resolved_style = _resolve_style(voice_style)
    resolved_format = "m4a" if (audio_format or "mp3").strip().lower() == "m4a" else "mp3"

    if ORB_TTS_PROVIDER == "openai":
        return await asyncio.wait_for(
            asyncio.to_thread(
                _synthesize_openai_sync,
                text=cleaned,
                voice_id=resolved_voice,
                voice_style=resolved_style,
                audio_format=resolved_format,
            ),
            timeout=ORB_TTS_TIMEOUT_SECONDS,
        )

    raise ORBVoiceTTSError("tts_provider_unsupported", "TTS provider is not supported.", 503)
