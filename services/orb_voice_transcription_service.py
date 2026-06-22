"""ORB Voice server transcription — shared STT utility for reflective voice sessions."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any

from services.ai_external_call_governance import (
    FEATURE_VOICE_TRANSCRIPTION,
    governed_transcribe_audio_file,
)

logger = logging.getLogger(__name__)

VOICE_TRANSCRIPTION_UNAVAILABLE = "voice_transcription_unavailable"
VOICE_TRANSCRIPTION_EMPTY = "voice_transcription_empty"
VOICE_TRANSCRIPTION_MODEL_ENV = "ORB_VOICE_TRANSCRIPTION_MODEL"


def _resolve_voice_transcription_model() -> str:
    return (
        os.getenv(VOICE_TRANSCRIPTION_MODEL_ENV)
        or os.getenv("AI_NOTES_TRANSCRIBE_MODEL")
        or "gpt-4o-transcribe"
    ).strip()


class OrbVoiceTranscriptionError(Exception):
    def __init__(
        self,
        *,
        error: str,
        message: str,
        status_code: int = 503,
        provider: str | None = None,
    ) -> None:
        super().__init__(message)
        self.error = error
        self.message = message
        self.status_code = status_code
        self.provider = provider


def _transcribe_voice_audio_sync(file_path: str, *, mime_type: str | None = None) -> dict[str, Any]:
    if not os.path.exists(file_path):
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_UNAVAILABLE,
            message="Audio file was not received.",
            status_code=400,
        )
    size = os.path.getsize(file_path)
    if size <= 0:
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_EMPTY,
            message="No audio was captured. Check microphone permission and try again.",
            status_code=400,
        )

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_UNAVAILABLE,
            message="Voice transcription is not available. Type your reflection instead.",
            status_code=503,
            provider=None,
        )

    model = _resolve_voice_transcription_model()
    started = time.perf_counter()
    logger.info(
        "orb_voice_transcription received mime=%s size=%s model=%s",
        mime_type or "unknown",
        size,
        model,
    )

    try:
        provider_started = time.perf_counter()
        result = governed_transcribe_audio_file(
            file_path,
            feature=FEATURE_VOICE_TRANSCRIPTION,
            metadata={
                "route": "orb_voice_transcription",
                "transcript_privacy_mode": "session_only",
                "audio_stored": False,
                "mime_type": mime_type,
                "model": model,
            },
        )
        provider_latency_ms = int((time.perf_counter() - provider_started) * 1000)
    except RuntimeError as exc:
        detail = str(exc).strip() or "Voice transcription is not available."
        logger.warning(
            "orb_voice_transcription provider_unavailable mime=%s size=%s reason=%s",
            mime_type or "unknown",
            size,
            detail[:120],
        )
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_UNAVAILABLE,
            message="Voice transcription is not available. Type your reflection instead.",
            status_code=503,
        ) from exc
    except Exception as exc:
        logger.warning(
            "orb_voice_transcription failed mime=%s size=%s status=error",
            mime_type or "unknown",
            size,
            exc_info=True,
        )
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_UNAVAILABLE,
            message="Voice transcription is not available right now. Type your reflection instead.",
            status_code=503,
        ) from exc

    transcript = str(result.get("original_transcript") or result.get("transcript") or "").strip()
    total_duration_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "orb_voice_transcription finished mime=%s size=%s model=%s provider_latency_ms=%s total_duration_ms=%s status=%s",
        mime_type or "unknown",
        size,
        model,
        provider_latency_ms,
        total_duration_ms,
        "success" if transcript else "empty",
    )
    if not transcript:
        raise OrbVoiceTranscriptionError(
            error=VOICE_TRANSCRIPTION_EMPTY,
            message="No speech was detected. Try again, check your microphone, or type your reflection instead.",
            status_code=400,
        )

    provider = model
    duration = result.get("duration")
    return {
        "transcript": transcript,
        "provider": provider,
        "source": "server_transcription",
        "duration_ms": int(float(duration) * 1000) if isinstance(duration, (int, float)) else total_duration_ms,
        "mime_type": mime_type,
        "audio_stored": False,
    }


async def transcribe_voice_audio(file_path: str, *, mime_type: str | None = None) -> dict[str, Any]:
    return await asyncio.to_thread(_transcribe_voice_audio_sync, file_path, mime_type=mime_type)
