"""ORB Voice v2 — clean conversational voice API for ORB Residential."""

from __future__ import annotations

import logging
import re
from typing import Any

from schemas.ai_tts import AiTtsGovernanceContext
from services.orb_voice_respond_service import generate_voice_response
from services.orb_voice_spoken_compression_service import (
    VOICE_TTS_CHAR_HARD_CAP,
    compress_voice_reply_for_speech,
)
from services.orb_voice_tts_service import (
    ORBVoiceTTSError,
    _resolve_tts_text_cap,
    synthesize_spoken_reply,
    voice_runtime_tts_status_payload,
)
from services.orb_voice_transcription_service import OrbVoiceTranscriptionError, transcribe_voice_audio

logger = logging.getLogger(__name__)

VOICE_V2_SPOKEN_CAP = VOICE_TTS_CHAR_HARD_CAP


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
    session_memory: dict[str, Any] | None = None,
    personality: str | None = None,
    voice: str | None = None,
    user_id: int | None,
    provider_id: int | None,
) -> dict[str, Any]:
    message = (transcript or "").strip()
    if not message:
        raise ValueError("transcript_required")
    history = normalise_recent_turns(recent_turns)
    memory_input = dict(session_memory or {})
    memory_input.setdefault(
        "adultTurnCount",
        len([t for t in history if t.get("role") == "user"]) + 1,
    )
    result = generate_voice_response(
        message=message,
        mode=mode,
        history=history,
        recent_turns=recent_turns,
        session_memory=memory_input,
        personality=personality,
        voice=voice,
        user_id=user_id,
        provider_id=provider_id,
    )
    written_reply = str(result.get("writtenReply") or result.get("reply") or "").strip()
    spoken_reply = str(result.get("spokenReply") or "").strip()
    if not spoken_reply and written_reply:
        spoken_reply = compress_voice_reply_for_speech(
            written_reply,
            intent=str(result.get("intent") or "general_reflection"),
            tier=str(result.get("promptTier") or result.get("prompt_tier") or "voice_fast"),
            personality=personality,
            safety_boundary_applied=bool(result.get("safetyBoundaryApplied")),
        )
    prompt_tier = str(result.get("promptTier") or result.get("prompt_tier") or "voice_fast")
    intent = str(result.get("intent") or "general_reflection")
    logger.info(
        "orb_voice_v2_respond written_chars=%s spoken_chars=%s prompt_tier=%s intent=%s mode=%s",
        len(written_reply),
        len(spoken_reply),
        prompt_tier,
        intent,
        mode or "just_talk",
    )
    return {
        "reply": written_reply,
        "writtenReply": written_reply,
        "spokenReply": spoken_reply,
        "safetyBoundaryApplied": bool(result.get("safetyBoundaryApplied")),
        "promptTier": prompt_tier,
        "intent": intent,
        "brainTier": result.get("brainTier") or prompt_tier,
        "riskLevel": result.get("riskLevel"),
        "sessionMemory": result.get("sessionMemory") or {},
        "suggestedProtocol": result.get("suggestedProtocol"),
    }


async def voice_v2_speak(
    *,
    text: str,
    governance: AiTtsGovernanceContext,
    context: str = "live_voice",
    voice: str | None = None,
) -> dict[str, Any]:
    spoken, capped = cap_spoken_text(text, context=context)
    if not spoken:
        raise ORBVoiceTTSError("empty_text", "Spoken text is required.", 400)
    voice_id = (voice or "katherine").strip().lower()
    if voice_id != "katherine":
        voice_id = "katherine"
    result = await synthesize_spoken_reply(
        text=spoken,
        governance=governance,
        voice_id=voice_id,
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
