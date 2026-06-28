"""OpenAI TTS provider adapter (NR-1 Phase 2B)."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

from schemas.ai_tts import AiTtsSynthesisRequest, AiTtsSynthesisResponse, TtsProviderName
from services.ai_providers.tts_base import AiTtsProviderBase
from services.orb_voice_tts_profiles import content_type_for_format, resolve_openai_voice, resolve_speed

logger = logging.getLogger("indicare.ai_provider.openai_tts")


def _text(value: Any) -> str:
    return str(value or "").strip()


class OpenAiTtsProvider(AiTtsProviderBase):
    provider_name = TtsProviderName.OPENAI.value

    def is_available(self) -> bool:
        return bool(_text(os.getenv("OPENAI_API_KEY")))

    def synthesize_speech(self, request: AiTtsSynthesisRequest) -> AiTtsSynthesisResponse:
        api_key = _text(os.getenv("OPENAI_API_KEY"))
        text = _text(request.text)
        text_len = len(text)
        model = _text(request.model)
        voice_id = _text(request.voice_id) or "katherine"
        voice_style = _text(request.voice_style) or "calm_therapeutic"
        audio_format = "m4a" if _text(request.audio_format).lower() == "m4a" else "mp3"

        if not api_key:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.OPENAI,
                model=model,
                voice_id=voice_id,
                latency_ms=0,
                audio_bytes_len=0,
                error="Premium ORB Voice is not configured.",
                error_code="tts_unconfigured",
            )

        provider_voice = _text(request.openai_voice) or resolve_openai_voice(voice_id)
        speed = request.speed if request.speed is not None else resolve_speed(voice_id, voice_style)
        response_format = "aac" if audio_format == "m4a" else "mp3"
        timeout = float(request.timeout_seconds or 20.0)

        try:
            from services.openai_header_sanitisation import create_sync_openai_client
        except ImportError:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.OPENAI,
                model=model,
                voice_id=voice_id,
                latency_ms=0,
                audio_bytes_len=0,
                error="TTS provider is unavailable.",
                error_code="tts_provider_unavailable",
            )

        started = time.perf_counter()
        try:
            client = create_sync_openai_client(api_key=api_key, timeout=timeout)
        except ImportError:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.OPENAI,
                model=model,
                voice_id=voice_id,
                latency_ms=int((time.perf_counter() - started) * 1000),
                audio_bytes_len=0,
                error="TTS provider is unavailable.",
                error_code="tts_provider_unavailable",
            )

        try:
            response = client.audio.speech.create(
                model=model,
                voice=provider_voice,
                input=text,
                response_format=response_format,
                speed=speed,
            )
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            logger.warning(
                "orb_voice_tts_openai_failed error=%s latency_ms=%s text_len=%s model=%s",
                exc.__class__.__name__,
                latency_ms,
                text_len,
                model,
            )
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.OPENAI,
                model=model,
                voice_id=voice_id,
                latency_ms=latency_ms,
                audio_bytes_len=0,
                error="Premium ORB Voice could not be generated.",
                error_code="tts_provider_failed",
                metadata={"error_type": exc.__class__.__name__},
            )

        audio_bytes = response.content if hasattr(response, "content") else bytes(response)
        latency_ms = int((time.perf_counter() - started) * 1000)
        if not audio_bytes:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.OPENAI,
                model=model,
                voice_id=voice_id,
                latency_ms=latency_ms,
                audio_bytes_len=0,
                error="Premium ORB Voice returned no audio.",
                error_code="tts_empty_audio",
            )

        logger.info(
            "orb_voice_tts_openai_ok latency_ms=%s text_len=%s bytes=%s model=%s",
            latency_ms,
            text_len,
            len(audio_bytes),
            model,
        )
        return AiTtsSynthesisResponse(
            audio_bytes=audio_bytes,
            content_type=content_type_for_format(audio_format),
            provider=TtsProviderName.OPENAI,
            model=model,
            voice_id=voice_id,
            latency_ms=latency_ms,
            audio_bytes_len=len(audio_bytes),
            metadata={"openai_voice": provider_voice},
        )


openai_tts_provider = OpenAiTtsProvider()
