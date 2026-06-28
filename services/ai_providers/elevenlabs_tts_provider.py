"""ElevenLabs TTS provider adapter (NR-1 Phase 2B)."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import httpx

from schemas.ai_tts import AiTtsSynthesisRequest, AiTtsSynthesisResponse, TtsProviderName
from services.ai_providers.tts_base import AiTtsProviderBase
from services.orb_voice_tts_profiles import (
    ELEVENLABS_STYLE_SETTINGS,
    content_type_for_format,
    resolve_elevenlabs_voice_id,
)

logger = logging.getLogger("indicare.ai_provider.elevenlabs_tts")

ELEVENLABS_MODEL_ID = (os.environ.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()
ELEVENLABS_OUTPUT_FORMAT = (os.environ.get("ELEVENLABS_OUTPUT_FORMAT") or "mp3_44100_128").strip()


def _text(value: Any) -> str:
    return str(value or "").strip()


class ElevenLabsTtsProvider(AiTtsProviderBase):
    provider_name = TtsProviderName.ELEVENLABS.value

    def is_available(self) -> bool:
        return bool(_text(os.getenv("ELEVENLABS_API_KEY"))) and bool(
            _text(os.getenv("ELEVENLABS_VOICE_ID"))
        )

    def synthesize_speech(self, request: AiTtsSynthesisRequest) -> AiTtsSynthesisResponse:
        api_key = _text(os.getenv("ELEVENLABS_API_KEY"))
        text = _text(request.text)
        text_len = len(text)
        model = _text(request.model) or ELEVENLABS_MODEL_ID
        voice_id = _text(request.voice_id) or "katherine"
        voice_style = _text(request.voice_style) or "calm_therapeutic"
        audio_format = "m4a" if _text(request.audio_format).lower() == "m4a" else "mp3"
        elevenlabs_voice_id = _text(request.elevenlabs_voice_id) or resolve_elevenlabs_voice_id(voice_id)
        timeout = float(request.timeout_seconds or 20.0)

        if not api_key or not elevenlabs_voice_id:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.ELEVENLABS,
                model=model,
                voice_id=voice_id,
                latency_ms=0,
                audio_bytes_len=0,
                error="Premium ORB Voice is not configured.",
                error_code="tts_unconfigured",
            )

        style_settings = ELEVENLABS_STYLE_SETTINGS.get(voice_style) or ELEVENLABS_STYLE_SETTINGS[
            "calm_therapeutic"
        ]
        output_format = ELEVENLABS_OUTPUT_FORMAT
        if audio_format == "m4a":
            output_format = "mp3_44100_128"

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{elevenlabs_voice_id}"
        payload = {
            "text": text,
            "model_id": model,
            "voice_settings": {
                **style_settings,
                "use_speaker_boost": True,
            },
        }

        started = time.perf_counter()
        try:
            with httpx.Client(timeout=timeout) as client:
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
                if response.status_code == 401:
                    latency_ms = int((time.perf_counter() - started) * 1000)
                    logger.warning(
                        "orb_voice_tts_elevenlabs_failed error=HTTPStatusError latency_ms=%s text_len=%s status=401",
                        latency_ms,
                        text_len,
                    )
                    return AiTtsSynthesisResponse(
                        audio_bytes=b"",
                        content_type=content_type_for_format(audio_format),
                        provider=TtsProviderName.ELEVENLABS,
                        model=model,
                        voice_id=voice_id,
                        latency_ms=latency_ms,
                        audio_bytes_len=0,
                        error="Premium ORB Voice could not be generated.",
                        error_code="auth_failed",
                        metadata={"http_status": 401},
                    )
                response.raise_for_status()
                audio_bytes = response.content
        except httpx.HTTPStatusError as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            status = exc.response.status_code if exc.response is not None else None
            logger.warning(
                "orb_voice_tts_elevenlabs_failed error=%s latency_ms=%s text_len=%s status=%s",
                exc.__class__.__name__,
                latency_ms,
                text_len,
                status,
            )
            error_code = "auth_failed" if status == 401 else "tts_provider_failed"
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.ELEVENLABS,
                model=model,
                voice_id=voice_id,
                latency_ms=latency_ms,
                audio_bytes_len=0,
                error="Premium ORB Voice could not be generated.",
                error_code=error_code,
                metadata={"http_status": status, "error_type": exc.__class__.__name__},
            )
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            logger.warning(
                "orb_voice_tts_elevenlabs_failed error=%s latency_ms=%s text_len=%s",
                exc.__class__.__name__,
                latency_ms,
                text_len,
            )
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.ELEVENLABS,
                model=model,
                voice_id=voice_id,
                latency_ms=latency_ms,
                audio_bytes_len=0,
                error="Premium ORB Voice could not be generated.",
                error_code="tts_provider_failed",
                metadata={"error_type": exc.__class__.__name__},
            )

        latency_ms = int((time.perf_counter() - started) * 1000)
        if not audio_bytes:
            return AiTtsSynthesisResponse(
                audio_bytes=b"",
                content_type=content_type_for_format(audio_format),
                provider=TtsProviderName.ELEVENLABS,
                model=model,
                voice_id=voice_id,
                latency_ms=latency_ms,
                audio_bytes_len=0,
                error="Premium ORB Voice returned no audio.",
                error_code="tts_empty_audio",
            )

        logger.info(
            "orb_voice_tts_elevenlabs_ok latency_ms=%s text_len=%s bytes=%s",
            latency_ms,
            text_len,
            len(audio_bytes),
        )
        return AiTtsSynthesisResponse(
            audio_bytes=audio_bytes,
            content_type=content_type_for_format(audio_format),
            provider=TtsProviderName.ELEVENLABS,
            model=model,
            voice_id=voice_id,
            latency_ms=latency_ms,
            audio_bytes_len=len(audio_bytes),
        )


elevenlabs_tts_provider = ElevenLabsTtsProvider()
