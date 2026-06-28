"""Premium ORB Voice TTS for ORB Residential iOS spoken-reply playback.

Orchestrates governed TTS egress (voice profiles, caps, fallback). Provider calls
run only through AiGovernedEgress and TTS adapters (NR-1 Phase 2B).
Does not store audio. Does not log spoken text content.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

from schemas.ai_tts import AiTtsGovernanceContext, AiTtsSynthesisRequest, TtsProviderName
from services.ai_governed_egress import ai_governed_egress
from services.orb_voice_tts_profiles import (
    ALLOWED_STYLES,
    ORB_TTS_DEFAULT_STYLE,
    ORB_TTS_DEFAULT_VOICE_ID,
    VOICE_PROFILES,
    content_type_for_format,
    resolve_elevenlabs_voice_id,
    resolve_openai_voice,
    resolve_speed,
)

logger = logging.getLogger(__name__)

ORB_TTS_ENABLED = os.environ.get("ORB_TTS_ENABLED", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ORB_TTS_PROVIDER = (os.environ.get("ORB_TTS_PROVIDER") or "").strip().lower()
ORB_TTS_FALLBACK_PROVIDER = (os.environ.get("ORB_TTS_FALLBACK_PROVIDER") or "").strip().lower()
ORB_TTS_MODEL = (os.environ.get("ORB_TTS_MODEL") or "tts-1-hd").strip()
ORB_TTS_LIVE_MODEL = (os.environ.get("ORB_TTS_LIVE_MODEL") or "tts-1").strip()
ORB_TTS_LATENCY_MODE = (os.environ.get("ORB_TTS_LATENCY_MODE") or "live").strip().lower()
ORB_TTS_MAX_TEXT_CHARS = int(os.environ.get("ORB_TTS_MAX_TEXT_CHARS") or "500")
ORB_TTS_LIVE_MAX_TEXT_CHARS = int(os.environ.get("ORB_TTS_LIVE_MAX_TEXT_CHARS") or "220")
ORB_TTS_TIMEOUT_SECONDS = float(os.environ.get("ORB_TTS_TIMEOUT_SECONDS") or "20")
ELEVENLABS_MODEL_ID = (os.environ.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()


@dataclass(frozen=True)
class ORBVoiceTTSResult:
    audio_bytes: bytes
    content_type: str
    voice_id: str
    voice_style: str
    provider: str
    voice_name: str
    fallback_used: bool = False
    fallback_reason: str | None = None


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


def _tts_provider_name(provider: str) -> TtsProviderName:
    try:
        return TtsProviderName(provider.strip().lower())
    except ValueError as exc:
        raise ORBVoiceTTSError("tts_provider_unsupported", "TTS provider is not supported.", 503) from exc


def _resolve_tts_model(provider: str, context: str | None) -> str:
    if provider == "elevenlabs":
        return ELEVENLABS_MODEL_ID
    return _resolve_openai_tts_model(context)


def _build_synthesis_request(
    *,
    text: str,
    provider: str,
    voice_id: str,
    voice_style: str,
    audio_format: str,
    context: str | None,
) -> AiTtsSynthesisRequest:
    tts_provider = _tts_provider_name(provider)
    model = _resolve_tts_model(provider, context)
    return AiTtsSynthesisRequest(
        text=text,
        provider=tts_provider,
        model=model,
        voice_id=voice_id,
        voice_style=voice_style,
        audio_format=audio_format,
        speed=resolve_speed(voice_id, voice_style),
        openai_voice=resolve_openai_voice(voice_id) if tts_provider == TtsProviderName.OPENAI else None,
        elevenlabs_voice_id=resolve_elevenlabs_voice_id(voice_id)
        if tts_provider == TtsProviderName.ELEVENLABS
        else None,
        timeout_seconds=ORB_TTS_TIMEOUT_SECONDS,
        context=context,
    )


def _error_code_to_status(code: str | None) -> int:
    if code in {"empty_text", "text_too_long"}:
        return 400
    if code in {"tts_disabled", "tts_unconfigured", "tts_provider_unavailable", "tts_provider_unsupported"}:
        return 503
    return 503


async def _synthesize_via_governed_egress(
    *,
    request: AiTtsSynthesisRequest,
    governance: AiTtsGovernanceContext,
) -> ORBVoiceTTSResult:
    try:
        response, _egress = await ai_governed_egress.synthesize_speech(
            request,
            governance=governance,
        )
    except ValueError as exc:
        raise ORBVoiceTTSError("governance_blocked", "External TTS is blocked by governance.", 403) from exc

    if response.error or not response.audio_bytes:
        code = response.error_code or "tts_provider_failed"
        raise ORBVoiceTTSError(
            code,
            response.error or "Premium ORB Voice could not be generated.",
            _error_code_to_status(code),
        )

    provider = response.provider.value
    return ORBVoiceTTSResult(
        audio_bytes=response.audio_bytes,
        content_type=response.content_type or content_type_for_format(request.audio_format),
        voice_id=response.voice_id,
        voice_style=request.voice_style,
        provider=provider,
        voice_name=_display_voice_name(response.voice_id, provider, fallback_used=False),
        fallback_used=False,
    )


async def synthesize_spoken_reply(
    *,
    text: str,
    governance: AiTtsGovernanceContext,
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
    katherine_requested = resolved_voice == "katherine"
    if primary != "elevenlabs":
        unavailable = _elevenlabs_unavailable_reason()
        if unavailable:
            logger.info(
                "orb_voice_tts_elevenlabs_unavailable reason=%s voice_id=%s",
                unavailable,
                resolved_voice,
            )
            if katherine_requested and unavailable == "provider_forced_openai":
                logger.info(
                    "orb_voice_tts_katherine_blocked reason=provider_forced_openai voice_id=%s",
                    resolved_voice,
                )

    providers: list[str] = [primary]
    fallback = _fallback_provider()
    if fallback and _provider_configured(fallback):
        providers.append(fallback)

    last_error: ORBVoiceTTSError | None = None
    for index, provider in enumerate(providers):
        request = _build_synthesis_request(
            text=cleaned,
            provider=provider,
            voice_id=resolved_voice,
            voice_style=resolved_style,
            audio_format=resolved_format,
            context=context,
        )
        try:
            result = await _synthesize_via_governed_egress(request=request, governance=governance)
            unavailable = _elevenlabs_unavailable_reason()
            provider_fallback = index > 0
            katherine_fallback = katherine_requested and result.provider != "elevenlabs"
            fallback_used = provider_fallback or katherine_fallback
            fallback_reason: str | None = None
            if fallback_used:
                fallback_reason = unavailable or ("provider_fallback" if provider_fallback else None)
            final = ORBVoiceTTSResult(
                audio_bytes=result.audio_bytes,
                content_type=result.content_type,
                voice_id=result.voice_id,
                voice_style=result.voice_style,
                provider=result.provider,
                voice_name=_display_voice_name(
                    result.voice_id,
                    result.provider,
                    fallback_used=fallback_used,
                ),
                fallback_used=fallback_used,
                fallback_reason=fallback_reason,
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
