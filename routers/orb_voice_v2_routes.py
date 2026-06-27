from __future__ import annotations

import logging
import os
import shutil
import uuid

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import (
    orb_residential_premium_dependency,
    require_orb_residential_auth,
)
from services.orb_ai_abuse_guard_service import enforce_daily_ai_call_budget, enforce_transcript_length
from services.orb_brain_metadata_service import attach_to_payload, build_brain_metadata
from services.orb_voice_tts_intent_service import (
    OrbVoiceTtsGateError,
    gate_orb_voice_tts_request,
    record_orb_voice_tts_usage,
    tts_gate_http_exception,
)
from services.orb_voice_tts_service import ORBVoiceTTSError
from services.orb_voice_transcription_service import OrbVoiceTranscriptionError
from services.orb_voice_v2_service import (
    voice_v2_respond,
    voice_v2_speak,
    voice_v2_status_payload,
    voice_v2_transcribe,
)

logger = logging.getLogger(__name__)

require_orb_voice_premium = orb_residential_premium_dependency("voice_workflows")

router = APIRouter(prefix="/orb/voice/v2", tags=["ORB Voice v2"])

VOICE_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_tmp_voice_uploads"
)
os.makedirs(VOICE_UPLOAD_DIR, exist_ok=True)
VOICE_MAX_AUDIO_BYTES = 25 * 1024 * 1024
VOICE_ALLOWED_AUDIO_SUFFIXES = frozenset(
    {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".mpeg", ".flac", ".aac", ".opus"}
)
MIME_TO_SUFFIX = {
    "audio/webm": ".webm",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".mp4",
    "audio/m4a": ".m4a",
    "audio/mpeg": ".mpeg",
    "audio/mp3": ".mp3",
}


def _voice_payload(body: dict) -> dict:
    return attach_to_payload(body, surface="orb_residential", feature="voice_v2")


def _user_id(current_user: dict) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _provider_id(current_user: dict) -> int | None:
    raw = current_user.get("provider_id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _scope_id(current_user: dict, key: str) -> int | None:
    raw = current_user.get(key)
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _resolve_suffix(filename: str | None, content_type: str | None) -> str:
    suffix = (os.path.splitext(filename or "")[1] or "").lower()
    if suffix in VOICE_ALLOWED_AUDIO_SUFFIXES:
        return suffix
    mime = (content_type or "").split(";")[0].strip().lower()
    return MIME_TO_SUFFIX.get(mime) or ".webm"


class OrbVoiceV2Turn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role: str = Field(..., max_length=16)
    text: str = Field(..., max_length=8000)


class OrbVoiceV2RespondRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mode: str | None = Field(default="just_talk", max_length=80)
    transcript: str = Field(..., min_length=1, max_length=8000)
    recentTurns: list[OrbVoiceV2Turn] | None = None
    sessionMemory: dict[str, Any] | None = None
    personality: str | None = Field(default=None, max_length=40)
    voice: str | None = Field(default=None, max_length=40)


class OrbVoiceV2SpeakRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str = Field(..., min_length=1, max_length=500)
    source: str = Field(..., min_length=1, max_length=40)
    voice: str | None = Field(default="katherine", max_length=40)
    context: str | None = Field(default="live_voice", max_length=40)
    expert_depth: str | None = Field(default=None, max_length=40)
    privacy_mode: bool = False
    low_sensory_mode: bool = False


@router.get("/status")
def orb_voice_v2_status(current_user: dict = Depends(require_orb_residential_auth)):
    _ = current_user
    _ = build_brain_metadata(surface="orb_residential", feature="voice_v2")
    return _voice_payload({"ok": True, **voice_v2_status_payload()})


@router.post("/respond")
async def orb_voice_v2_respond_route(
    payload: OrbVoiceV2RespondRequest,
    current_user: dict = Depends(require_orb_voice_premium),
):
    user_id = _user_id(current_user)
    enforce_daily_ai_call_budget(user_id)
    enforce_transcript_length(payload.transcript, user_id=user_id)
    try:
        result = await voice_v2_respond(
            transcript=payload.transcript,
            mode=payload.mode,
            recent_turns=[turn.model_dump() for turn in payload.recentTurns or []],
            session_memory=payload.sessionMemory,
            personality=payload.personality,
            voice=payload.voice,
            user_id=user_id,
            provider_id=_provider_id(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("orb_voice_v2_respond_failed error=%s", exc.__class__.__name__)
        raise HTTPException(status_code=503, detail="voice_respond_unavailable") from exc
    return _voice_payload({"ok": True, **result})


@router.post("/speak")
async def orb_voice_v2_speak_route(
    payload: OrbVoiceV2SpeakRequest,
    current_user: dict = Depends(require_orb_voice_premium),
):
    user_id = _user_id(current_user)
    provider_id = _provider_id(current_user)
    home_id = _scope_id(current_user, "home_id")
    spoken = (payload.text or "").strip()
    enforce_daily_ai_call_budget(user_id)
    enforce_transcript_length(spoken, user_id=user_id)

    try:
        gate = gate_orb_voice_tts_request(
            source=payload.source,
            text=spoken,
            context=payload.context or "live_voice",
            expert_depth=payload.expert_depth,
            privacy_mode=payload.privacy_mode,
            low_sensory_mode=payload.low_sensory_mode,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            route="POST /orb/voice/v2/speak",
        )
    except OrbVoiceTtsGateError as exc:
        logger.info(
            "orb_voice_v2_speak_gate_blocked code=%s source=%s user_id=%s text_len=%s",
            exc.code,
            (payload.source or "").strip().lower() or "missing",
            user_id,
            len(spoken),
        )
        raise tts_gate_http_exception(exc) from exc

    try:
        result = await voice_v2_speak(
            text=gate.redacted_text,
            context=payload.context or "live_voice",
            voice=payload.voice,
        )
    except ORBVoiceTTSError as exc:
        raise HTTPException(status_code=exc.status_code, detail={"error": exc.code, "message": exc.message}) from exc

    record_orb_voice_tts_usage(
        gate=gate,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        route="POST /orb/voice/v2/speak",
        provider=str(result.get("provider") or ""),
        voice_id=payload.voice,
    )

    headers = {
            "X-ORB-TTS-Provider": str(result["provider"]),
            "X-ORB-Voice-Name": str(result["voiceName"]),
            "X-ORB-TTS-Fallback": "true" if result["fallbackUsed"] else "false",
            "Cache-Control": "no-store",
        }
    if result.get("fallbackReason"):
        headers["X-ORB-TTS-Fallback-Reason"] = str(result["fallbackReason"])
    return Response(
        content=result["audio_bytes"],
        media_type=result["content_type"],
        headers=headers,
    )


@router.post("/transcribe")
async def orb_voice_v2_transcribe_route(
    file: UploadFile = File(...),
    _current_user=Depends(require_orb_voice_premium),
):
    content_type = (file.content_type or "").strip() or None
    suffix = _resolve_suffix(file.filename, content_type)
    path = os.path.join(VOICE_UPLOAD_DIR, f"{uuid.uuid4().hex}{suffix}")
    try:
        with open(path, "wb") as handle:
            shutil.copyfileobj(file.file, handle)
        file_size = os.path.getsize(path)
        if file_size <= 0:
            raise HTTPException(status_code=400, detail="voice_transcription_empty")
        if file_size > VOICE_MAX_AUDIO_BYTES:
            raise HTTPException(status_code=400, detail="audio_too_large")
        result = await voice_v2_transcribe(path, mime_type=content_type)
        return _voice_payload({"ok": True, **result})
    except OrbVoiceTranscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail={"error": exc.error, "message": exc.message}) from exc
    finally:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass
