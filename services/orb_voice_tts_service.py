"""Premium ORB Voice TTS for ORB Residential iOS spoken-reply playback.

Sends short generated text to a configured TTS provider and returns transient audio bytes.
Does not store audio. Does not log spoken text content.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)

ORB_TTS_ENABLED = os.environ.get("ORB_TTS_ENABLED", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ORB_TTS_PROVIDER = (os.environ.get("ORB_TTS_PROVIDER") or "").strip().lower()
ORB_TTS_FALLBACK_PROVIDER = (os.environ.get("ORB_TTS_FALLBACK_PROVIDER") or "").strip().lower()
ORB_TTS_DEFAULT_VOICE_ID = (os.environ.get("ORB_TTS_DEFAULT_VOICE_ID") or "orb_british_female").strip()
ORB_TTS_DEFAULT_STYLE = (os.environ.get("ORB_TTS_DEFAULT_STYLE") or "calm_therapeutic").strip().lower()
ORB_TTS_MODEL = (os.environ.get("ORB_TTS_MODEL") or "tts-1-hd").strip()
ORB_TTS_LIVE_MODEL = (os.environ.get("ORB_TTS_LIVE_MODEL") or "tts-1").strip()
ORB_TTS_LATENCY_MODE = (os.environ.get("ORB_TTS_LATENCY_MODE") or "live").strip().lower()
ORB_TTS_MAX_TEXT_CHARS = int(os.environ.get("ORB_TTS_MAX_TEXT_CHARS") or "500")
ORB_TTS_LIVE_MAX_TEXT_CHARS = int(os.environ.get("ORB_TTS_LIVE_MAX_TEXT_CHARS") or "320")
ORB_TTS_TIMEOUT_SECONDS = float(os.environ.get("ORB_TTS_TIMEOUT_SECONDS") or "20")
ELEVENLABS_MODEL_ID = (os.environ.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()
ELEVENLABS_OUTPUT_FORMAT = (os.environ.get("ELEVENLABS_OUTPUT_FORMAT") or "mp3_44100_128").strip()

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


@dataclass(frozen=True)
class ORBVoiceTTSResult:
    audio_bytes: bytes
    content_type: str
    voice_id: str
    voice_style: str
    provider: str
    voice_name: str
    fallback_used: bool = False


def _normalise_provider_preference(value: str | None) -> str | None:
    explicit = (value or "").strip().lower()
    if not explicit or explicit in {"auto", "default"}:
        return None
    return explicit


def _resolve_primary_tts_provider() -> str:
    explicit = _normalise_provider_preference(os.environ.get("ORB_TTS_PROVIDER"))
    if explicit:
        return explicit
    if _provider_configured("elevenlabs"):
        return "elevenlabs"
    return "openai"


class ORBVoiceTTSError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _provider_configured(provider: str) -> bool:
    if provider == "openai":
        return bool((os.environ.get("OPENAI_API_KEY") or "").strip())
    if provider == "elevenlabs":
        return bool(
            (os.environ.get("ELEVENLABS_API_KEY") or "").strip()
            and (os.environ.get("ELEVENLABS_VOICE_ID") or "").strip()
        )
    return False


def is_configured() -> bool:
    if not ORB_TTS_ENABLED:
        return False
    return _provider_configured(_resolve_primary_tts_provider())


def _fallback_provider() -> str | None:
    fallback = ORB_TTS_FALLBACK_PROVIDER
    if not fallback or fallback in {"none", "disabled"}:
        return None
    if fallback == ORB_TTS_PROVIDER:
        return None
    return fallback


def _elevenlabs_unavailable_reason() -> str | None:
    if not ORB_TTS_ENABLED:
        return "tts_disabled"
    explicit = _normalise_provider_preference(os.environ.get("ORB_TTS_PROVIDER"))
    if explicit and explicit not in {"elevenlabs"}:
        if explicit == "openai":
            return "provider_forced_openai"
        return f"provider_forced_{explicit}"
    if not (os.environ.get("ELEVENLABS_API_KEY") or "").strip():
        return "missing_api_key"
    if not (os.environ.get("ELEVENLABS_VOICE_ID") or "").strip():
        return "missing_voice_id"
    return None


def _resolve_openai_tts_model(context: str | None = None) -> str:
    ctx = (context or "").strip().lower()
    if ctx in {"summary", "replay"}:
        return ORB_TTS_MODEL
    if ORB_TTS_LATENCY_MODE == "quality":
        return ORB_TTS_MODEL
    if ctx in {"live_voice", "orb_residential_web_voice_reply"}:
        return ORB_TTS_LIVE_MODEL
    return ORB_TTS_LIVE_MODEL


def _resolve_tts_text_cap(context: str | None = None) -> int:
    ctx = (context or "").strip().lower()
    if ctx in {"live_voice", "orb_residential_web_voice_reply"}:
        return ORB_TTS_LIVE_MAX_TEXT_CHARS
    return ORB_TTS_MAX_TEXT_CHARS


def _display_voice_name(voice_id: str, provider: str, *, fallback_used: bool) -> str:
    if provider == "elevenlabs" and not fallback_used:
        return _voice_name_for(voice_id)
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES.get("katherine") or {}
    openai_voice = str(profile.get("openai_voice") or "nova")
    return f"Fallback voice ({openai_voice})"


def voice_runtime_tts_status_payload() -> dict[str, Any]:
    primary = _resolve_primary_tts_provider()
    eleven_configured = _provider_configured("elevenlabs")
    unavailable = _elevenlabs_unavailable_reason()
    raw_forced = (os.environ.get("ORB_TTS_PROVIDER") or "").strip().lower() or None
    forced = (
        raw_forced
        if raw_forced and raw_forced not in {"", "auto", "default", "elevenlabs"}
        else None
    )
    if eleven_configured and not unavailable:
        preferred: str = "elevenlabs"
        effective = "elevenlabs"
    elif _provider_configured("openai"):
        preferred = "openai"
        effective = "openai"
    elif ORB_TTS_ENABLED:
        preferred = "browser"
        effective = "browser"
    else:
        preferred = "text_only"
        effective = "text_only"
    katherine_ready = eleven_configured and unavailable is None and primary == "elevenlabs"
    return {
        "ttsEnabled": ORB_TTS_ENABLED and (
            _provider_configured(primary) or bool(_fallback_provider())
        ),
        "preferredProvider": preferred,
        "ttsProviderEffective": effective,
        "ttsProviderForced": forced,
        "elevenLabsConfigured": eleven_configured,
        "katherineConfigured": eleven_configured,
        "katherineReady": katherine_ready,
        "fallbackReason": unavailable,
        "forcedProvider": forced,
    }


def tts_status_payload() -> dict[str, Any]:
    primary = _resolve_primary_tts_provider()
    configured = ORB_TTS_ENABLED and _provider_configured(primary)
    fallback = _fallback_provider()
    runtime = voice_runtime_tts_status_payload()
    return {
        "ok": True,
        "enabled": configured,
        "configured": configured,
        "provider": primary,
        "default_voice_id": ORB_TTS_DEFAULT_VOICE_ID,
        "default_style": ORB_TTS_DEFAULT_STYLE,
        "fallback_provider": fallback,
        **runtime,
        "available_voices": [
            {"id": voice_id, "label": profile["label"], "description": profile["description"]}
            for voice_id, profile in VOICE_PROFILES.items()
        ],
    }


def _normalise_text(value: str | None) -> str:
    return (value or "").strip()


def _resolve_voice_id(requested: str | None) -> str:
    voice_id = (requested or ORB_TTS_DEFAULT_VOICE_ID).strip()
    if voice_id == "orb_british_female":
        return "katherine"
    if voice_id not in VOICE_PROFILES:
        return ORB_TTS_DEFAULT_VOICE_ID if ORB_TTS_DEFAULT_VOICE_ID in VOICE_PROFILES else "katherine"
    return voice_id


def _voice_name_for(voice_id: str) -> str:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES.get("katherine") or {}
    return str(profile.get("label") or "Katherine")


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


def _resolve_elevenlabs_voice_id(voice_id: str) -> str:
    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    env_key = str(profile.get("elevenlabs_voice_env") or "ELEVENLABS_VOICE_ID")
    resolved = (os.environ.get(env_key) or "").strip()
    if resolved:
        return resolved
    return (os.environ.get("ELEVENLABS_VOICE_ID") or "").strip()


def generate_speech(
    *,
    text: str,
    voice_id: str,
    voice_style: str,
    audio_format: str,
    provider: str,
    context: str | None = None,
) -> ORBVoiceTTSResult:
    if provider == "openai":
        return _synthesize_openai_sync(
            text=text,
            voice_id=voice_id,
            voice_style=voice_style,
            audio_format=audio_format,
            context=context,
        )
    if provider == "elevenlabs":
        return _synthesize_elevenlabs_sync(
            text=text,
            voice_id=voice_id,
            voice_style=voice_style,
            audio_format=audio_format,
        )
    raise ORBVoiceTTSError("tts_provider_unsupported", "TTS provider is not supported.", 503)


def _synthesize_openai_sync(
    *,
    text: str,
    voice_id: str,
    voice_style: str,
    audio_format: str,
    context: str | None = None,
) -> ORBVoiceTTSResult:
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise ORBVoiceTTSError("tts_unconfigured", "Premium ORB Voice is not configured.", 503)

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise ORBVoiceTTSError("tts_provider_unavailable", "TTS provider is unavailable.", 503) from exc

    profile = VOICE_PROFILES.get(voice_id) or VOICE_PROFILES[ORB_TTS_DEFAULT_VOICE_ID]
    provider_voice = str(profile.get("openai_voice") or profile.get("provider_voice") or "nova")
    speed = _resolve_speed(voice_id, voice_style)
    response_format = "aac" if audio_format == "m4a" else "mp3"

    started = time.perf_counter()
    model = _resolve_openai_tts_model(context)
    client = OpenAI(api_key=api_key, timeout=ORB_TTS_TIMEOUT_SECONDS)
    try:
        response = client.audio.speech.create(
            model=model,
            voice=provider_voice,
            input=text,
            response_format=response_format,
            speed=speed,
        )
    except Exception as exc:
        logger.warning(
            "orb_voice_tts_openai_failed error=%s latency_ms=%s text_len=%s model=%s",
            exc.__class__.__name__,
            int((time.perf_counter() - started) * 1000),
            len(text),
            model,
        )
        raise ORBVoiceTTSError("tts_provider_failed", "Premium ORB Voice could not be generated.", 503) from exc

    audio_bytes = response.content if hasattr(response, "content") else bytes(response)
    if not audio_bytes:
        raise ORBVoiceTTSError("tts_empty_audio", "Premium ORB Voice returned no audio.", 503)

    logger.info(
        "orb_voice_tts_openai_ok latency_ms=%s text_len=%s bytes=%s model=%s",
        int((time.perf_counter() - started) * 1000),
        len(text),
        len(audio_bytes),
        model,
    )

    return ORBVoiceTTSResult(
        audio_bytes=audio_bytes,
        content_type=_content_type_for_format(audio_format),
        voice_id=voice_id,
        voice_style=voice_style,
        provider="openai",
        voice_name=_display_voice_name(voice_id, "openai", fallback_used=False),
        fallback_used=False,
    )


def _synthesize_elevenlabs_sync(*, text: str, voice_id: str, voice_style: str, audio_format: str) -> ORBVoiceTTSResult:
    api_key = (os.environ.get("ELEVENLABS_API_KEY") or "").strip()
    elevenlabs_voice_id = _resolve_elevenlabs_voice_id(voice_id)
    if not api_key or not elevenlabs_voice_id:
        raise ORBVoiceTTSError("tts_unconfigured", "Premium ORB Voice is not configured.", 503)

    style_settings = ELEVENLABS_STYLE_SETTINGS.get(voice_style) or ELEVENLABS_STYLE_SETTINGS["calm_therapeutic"]
    output_format = ELEVENLABS_OUTPUT_FORMAT
    if audio_format == "m4a":
        output_format = "mp3_44100_128"

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{elevenlabs_voice_id}"
    payload = {
        "text": text,
        "model_id": ELEVENLABS_MODEL_ID,
        "voice_settings": {
            **style_settings,
            "use_speaker_boost": True,
        },
    }

    started = time.perf_counter()
    try:
        with httpx.Client(timeout=ORB_TTS_TIMEOUT_SECONDS) as client:
            response = client.post(
                url,
                params={"output_format": output_format},
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json=payload,
            )
            response.raise_for_status()
            audio_bytes = response.content
    except Exception as exc:
        logger.warning(
            "orb_voice_tts_elevenlabs_failed error=%s latency_ms=%s text_len=%s",
            exc.__class__.__name__,
            int((time.perf_counter() - started) * 1000),
            len(text),
        )
        raise ORBVoiceTTSError("tts_provider_failed", "Premium ORB Voice could not be generated.", 503) from exc

    if not audio_bytes:
        raise ORBVoiceTTSError("tts_empty_audio", "Premium ORB Voice returned no audio.", 503)

    logger.info(
        "orb_voice_tts_elevenlabs_ok latency_ms=%s text_len=%s bytes=%s",
        int((time.perf_counter() - started) * 1000),
        len(text),
        len(audio_bytes),
    )

    return ORBVoiceTTSResult(
        audio_bytes=audio_bytes,
        content_type=_content_type_for_format(audio_format),
        voice_id=voice_id,
        voice_style=voice_style,
        provider="elevenlabs",
        voice_name=_display_voice_name(voice_id, "elevenlabs", fallback_used=False),
        fallback_used=False,
    )


async def synthesize_spoken_reply(
    *,
    text: str,
    voice_id: str | None = None,
    voice_style: str | None = None,
    audio_format: str = "mp3",
    context: str | None = None,
) -> ORBVoiceTTSResult:
    if not is_configured():
        raise ORBVoiceTTSError("tts_disabled", "Premium ORB Voice is not enabled.", 503)

    cleaned = _normalise_text(text)
    if not cleaned:
        raise ORBVoiceTTSError("empty_text", "Spoken text is required.", 400)
    max_chars = _resolve_tts_text_cap(context)
    if len(cleaned) > max_chars:
        raise ORBVoiceTTSError(
            "text_too_long",
            f"Spoken text must be {max_chars} characters or fewer.",
            400,
        )

    resolved_voice = _resolve_voice_id(voice_id)
    resolved_style = _resolve_style(voice_style)
    resolved_format = "m4a" if (audio_format or "mp3").strip().lower() == "m4a" else "mp3"

    primary = _resolve_primary_tts_provider()
    if primary != "elevenlabs":
        unavailable = _elevenlabs_unavailable_reason()
        if unavailable:
            logger.info(
                "orb_voice_tts_elevenlabs_unavailable reason=%s voice_id=%s",
                unavailable,
                resolved_voice,
            )

    providers: list[str] = [primary]
    fallback = _fallback_provider()
    if fallback and _provider_configured(fallback):
        providers.append(fallback)

    last_error: ORBVoiceTTSError | None = None
    for index, provider in enumerate(providers):
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(
                    generate_speech,
                    text=cleaned,
                    voice_id=resolved_voice,
                    voice_style=resolved_style,
                    audio_format=resolved_format,
                    provider=provider,
                    context=context,
                ),
                timeout=ORB_TTS_TIMEOUT_SECONDS,
            )
            final = ORBVoiceTTSResult(
                audio_bytes=result.audio_bytes,
                content_type=result.content_type,
                voice_id=result.voice_id,
                voice_style=result.voice_style,
                provider=result.provider,
                voice_name=_display_voice_name(
                    result.voice_id,
                    result.provider,
                    fallback_used=index > 0,
                ),
                fallback_used=index > 0,
            )
            logger.info(
                "orb_voice_turn_trace stage=tts provider=%s voice=%s fallback=%s text_chars=%s voice_id=%s spoken_cap=%s",
                final.provider,
                final.voice_name,
                final.fallback_used,
                len(cleaned),
                final.voice_id,
                len(cleaned) < len(_normalise_text(text)),
            )
            return final
        except ORBVoiceTTSError as exc:
            last_error = exc
            logger.warning(
                "orb_voice_tts_provider_failed provider=%s code=%s text_len=%s",
                provider,
                exc.code,
                len(cleaned),
            )

    raise last_error or ORBVoiceTTSError("tts_provider_unsupported", "TTS provider is not supported.", 503)
