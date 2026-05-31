from __future__ import annotations

"""ORB Residential voice API stubs — browser STT/TTS primary; server hooks for future duplex."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth

router = APIRouter(prefix="/orb/voice", tags=["ORB Residential Voice"])


class OrbVoiceTextRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=50_000)
    voice_id: str | None = Field(default=None, max_length=80)


@router.post("/transcribe")
async def orb_voice_transcribe(
    _payload: OrbVoiceTextRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    return {
        "ok": True,
        "implemented": False,
        "message": "Use browser SpeechRecognition in ORB Voice. Server transcription will use streaming STT in a future release.",
    }


@router.post("/speak")
async def orb_voice_speak(
    _payload: OrbVoiceTextRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    return {
        "ok": True,
        "implemented": False,
        "message": "Use browser SpeechSynthesis in ORB Voice. Server TTS will support duplex sessions in a future release.",
    }


@router.post("/session")
async def orb_voice_session(
    _current_user=Depends(require_orb_residential_auth),
):
    return {
        "ok": True,
        "implemented": False,
        "recommended_path": [
            "WebRTC or WebSocket realtime session",
            "streaming STT and TTS",
            "interruption / barge-in",
            "voice activity detection",
            "server-side safety logging",
        ],
    }
