"""ORB Voice v2 — clean conversational voice API for ORB Residential."""

from __future__ import annotations

import logging
import re
from typing import Any

from services.orb_voice_respond_service import generate_voice_response
from services.orb_voice_tts_service import (
    ORBVoiceTTSError,
    _resolve_tts_text_cap,
    synthesize_spoken_reply,
    voice_runtime_tts_status_payload,
)
from services.orb_voice_transcription_service import OrbVoiceTranscriptionError, transcribe_voice_audio

logger = logging.getLogger(__name__)

VOICE_V2_SPOKEN_CAP = 320


def normalise_recent_turns(turns: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in turns or []:
        role = str(item.get("role") or "").strip().lower()
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        if role in {"adult", "user"}:
            rows.append({"role": "user", "content": text})
        elif role in {"orb", "assistant"}:
            rows.append({"role": "assistant", "content": text})
    return rows[-8:]


def cap_spoken_text(text: str, *, context: str = "live_voice") -> tuple[str, bool]:
    cleaned = re.sub(r"[#*_`]", "", (text or "").strip())
    cap = _resolve_tts_text_cap(context)
    if len(cleaned) <= cap:
        return cleaned, False
    return cleaned[:cap].strip(), True


async def voice_v2_respond(
    *,
    transcript: str,
    mode: str | None,
    recent_turns: list[dict[str, Any]] | None,
    user_id: int | None,
    provider_id: int | None,
) -> dict[str, Any]:
    message = (transcript or "").strip()
    if not message:
        raise ValueError("transcript_required")
    history = normalise_recent_turns(recent_turns)
    result = generate_voice_response(
        message=message,
        mode=mode,
        history=history,
        session_memory={"adultTurnCount": len([t for t in history if t.get("role") == "user"]) + 1},
        user_id=user_id,
        provider_id=provider_id,
    )
    reply = str(result.get("reply") or "").strip()
    logger.info(
        "orb_voice_v2_respond reply_chars=%s prompt_tier=voice_fast mode=%s",
        len(reply),
        mode or "just_talk",
    )
    return {
        "reply": reply,
        "safetyBoundaryApplied": bool(result.get("safetyBoundaryApplied")),
        "promptTier": "voice_fast",
    }


async def voice_v2_speak(*, text: str, context: str = "live_voice") -> dict[str, Any]:
    spoken, capped = cap_spoken_text(text, context=context)
    if not spoken:
        raise ORBVoiceTTSError("empty_text", "Spoken text is required.", 400)
    result = await synthesize_spoken_reply(
        text=spoken,
        voice_id="katherine",
        voice_style="calm_therapeutic",
        audio_format="mp3",
        context=context,
    )
    logger.info(
        "orb_voice_v2_speak provider=%s voice=%s fallback=%s tts_text_chars=%s spoken_cap=%s",
        result.provider,
        result.voice_name,
        result.fallback_used,
        len(spoken),
        capped,
    )
    return {
        "audio_bytes": result.audio_bytes,
        "content_type": result.content_type,
        "provider": result.provider,
        "voiceName": result.voice_name,
        "fallbackUsed": result.fallback_used,
        "fallbackReason": result.fallback_reason,
        "spokenCapApplied": capped,
        "ttsTextChars": len(spoken),
    }


async def voice_v2_transcribe(path: str, *, mime_type: str | None) -> dict[str, Any]:
    result = await transcribe_voice_audio(path, mime_type=mime_type)
    transcript = str(result.get("transcript") or "").strip()
    logger.info(
        "orb_voice_v2_transcribe transcript_chars=%s mime=%s",
        len(transcript),
        mime_type or result.get("mime_type") or "unknown",
    )
    return {
        "transcript": transcript,
        "provider": result.get("provider") or "openai",
        "audioStored": False,
    }


def voice_v2_status_payload() -> dict[str, Any]:
    return voice_runtime_tts_status_payload()
