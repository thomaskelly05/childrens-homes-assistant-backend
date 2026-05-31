from __future__ import annotations

"""ORB Residential voice API — browser STT/TTS primary; honest server hooks for future duplex."""

import os
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth

router = APIRouter(prefix="/orb/voice", tags=["ORB Residential Voice"])

ORB_VOICE_SERVER_STT = os.getenv("ORB_VOICE_SERVER_STT", "").strip().lower() in {"1", "true", "yes", "on"}
ORB_VOICE_SERVER_TTS = os.getenv("ORB_VOICE_SERVER_TTS", "").strip().lower() in {"1", "true", "yes", "on"}
ORB_VOICE_REALTIME = os.getenv("ORB_VOICE_REALTIME_PROVIDER", "").strip()


class OrbVoiceSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mode: str = Field(default="conversational", max_length=80)
    voice_id: str = Field(default="orb_british_female", max_length=80)


class OrbVoiceTextRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=50_000)
    voice_id: str | None = Field(default=None, max_length=80)
    rate: float = Field(default=1.0, ge=0.5, le=2.0)


class OrbVoiceTranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str | None = Field(default=None, max_length=50_000)


def _server_provider_ready() -> bool:
    return bool(ORB_VOICE_REALTIME) and (ORB_VOICE_SERVER_STT or ORB_VOICE_SERVER_TTS)


@router.post("/session")
async def orb_voice_session(
    payload: OrbVoiceSessionRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    if _server_provider_ready():
        return {
            "session_id": f"orb_voice_{uuid.uuid4().hex[:16]}",
            "status": "ready",
            "provider": "server",
            "mode": payload.mode,
            "voice_id": payload.voice_id,
        }
    return {
        "session_id": f"browser_{uuid.uuid4().hex[:16]}",
        "status": "ready",
        "provider": "browser_fallback",
        "mode": payload.mode,
        "voice_id": payload.voice_id,
        "message": "Use browser SpeechRecognition and SpeechSynthesis. Configure ORB_VOICE_REALTIME_PROVIDER for server duplex.",
    }


@router.post("/transcribe")
async def orb_voice_transcribe(
    payload: OrbVoiceTranscribeRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    if ORB_VOICE_SERVER_STT and payload.text:
        return {
            "provider": "server",
            "status": "ok",
            "text": payload.text.strip(),
        }
    if payload.text and payload.text.strip():
        return {
            "provider": "browser_fallback",
            "status": "ok",
            "text": payload.text.strip(),
            "message": "Text fallback accepted. Configure ORB_VOICE_SERVER_STT for audio transcription.",
        }
    return {
        "provider": "browser_fallback",
        "status": "not_configured",
        "message": "Server STT is not configured. Use browser SpeechRecognition in ORB Voice.",
    }


@router.post("/speak")
async def orb_voice_speak(
    payload: OrbVoiceTextRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    voice_id = (payload.voice_id or "orb_british_female").strip()
    if ORB_VOICE_SERVER_TTS:
        return {
            "provider": "server",
            "text": payload.text,
            "voice_id": voice_id,
            "rate": payload.rate,
            "audio_url": None,
            "message": "Server TTS hook reserved — wire ORB_VOICE_SERVER_TTS provider when ready.",
        }
    return {
        "provider": "browser_fallback",
        "text": payload.text,
        "voice_id": voice_id,
        "rate": payload.rate,
        "message": "No server audio generated. Use browser SpeechSynthesis with the returned text.",
    }
