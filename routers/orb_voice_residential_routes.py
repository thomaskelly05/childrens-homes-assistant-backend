from __future__ import annotations

"""ORB Residential voice API — browser STT/TTS primary; honest WebSocket/WebRTC realtime hooks."""

import os

from fastapi import APIRouter, Depends, HTTPException, WebSocket, status
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth
from schemas.orb_voice_realtime import (
    OrbVoiceSessionRequest,
    OrbVoiceSessionResponse,
    VoiceProviderCapabilities,
)
from services.orb_voice_realtime_config import (
    _provider_has_stt_credentials,
    _provider_has_tts_credentials,
    resolve_voice_provider,
)
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store
from services.orb_voice_realtime_ws_handler import orb_voice_realtime_ws_handler

router = APIRouter(prefix="/orb/voice", tags=["ORB Residential Voice"])


class OrbVoiceTextRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=50_000)
    voice_id: str | None = Field(default=None, max_length=80)
    rate: float = Field(default=1.0, ge=0.5, le=2.0)


class OrbVoiceTranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str | None = Field(default=None, max_length=50_000)


def _user_id(current_user: dict) -> int | None:
    try:
        value = current_user.get("user_id") or current_user.get("id")
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


@router.post("/session", response_model=OrbVoiceSessionResponse)
async def orb_voice_session(
    payload: OrbVoiceSessionRequest,
    current_user=Depends(require_orb_residential_auth),
):
    provider, session_status, capabilities, fallback_reason = resolve_voice_provider(payload.transport)

    if provider == "browser_fallback":
        session_id = f"browser_{os.urandom(8).hex()}"
        return OrbVoiceSessionResponse(
            session_id=session_id,
            provider=provider,
            status="ready",
            mode=payload.mode,
            voice_id=payload.voice_id,
            capabilities=capabilities,
            message="Use browser SpeechRecognition and SpeechSynthesis. Configure ORB_VOICE_REALTIME_PROVIDER for server realtime.",
            fallback_reason=fallback_reason,
        )

    record = orb_voice_realtime_session_store.create(
        user_id=_user_id(current_user),
        provider=provider,
        status=session_status,
        mode=payload.mode,
        voice_id=payload.voice_id,
        capabilities=capabilities,
    )

    if session_status != "ready":
        return OrbVoiceSessionResponse(
            session_id=record.session_id,
            provider="browser_fallback",
            status="ready",
            mode=payload.mode,
            voice_id=payload.voice_id,
            capabilities=VoiceProviderCapabilities(
                provider=capabilities.provider,
                supportsStreamingStt=False,
                supportsStreamingTts=False,
                supportsBargeIn=True,
                supportsVad=True,
                supportsDuplex=False,
                supportsServerAudio=False,
                latencyClass="fallback",
            ),
            message="Realtime provider not fully configured. Use browser voice.",
            fallback_reason=fallback_reason or "Provider credentials missing.",
        )

    websocket_url = f"/orb/voice/ws/{record.session_id}" if provider == "websocket_realtime" else None
    webrtc_offer_url = f"/orb/voice/webrtc/offer/{record.session_id}" if provider == "webrtc_realtime" else None

    return OrbVoiceSessionResponse(
        session_id=record.session_id,
        provider=provider,
        status=session_status,
        mode=payload.mode,
        voice_id=payload.voice_id,
        websocket_url=websocket_url,
        webrtc_offer_url=webrtc_offer_url,
        capabilities=capabilities,
    )


@router.websocket("/ws/{session_id}")
async def orb_voice_realtime_ws(websocket: WebSocket, session_id: str) -> None:
    await orb_voice_realtime_ws_handler.handle(websocket, session_id)


@router.post("/webrtc/offer/{session_id}")
async def orb_voice_webrtc_offer(
    session_id: str,
    _current_user=Depends(require_orb_residential_auth),
):
    record = orb_voice_realtime_session_store.get(session_id)
    if not record or record.provider != "webrtc_realtime":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "status": "not_configured",
                "message": "WebRTC realtime is not enabled for this session.",
            },
        )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "status": "not_configured",
            "message": "WebRTC offer/answer exchange is not implemented yet. Use WebSocket or browser fallback.",
            "session_id": session_id,
        },
    )


@router.post("/webrtc/ice/{session_id}")
async def orb_voice_webrtc_ice(
    session_id: str,
    _current_user=Depends(require_orb_residential_auth),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "status": "not_configured",
            "message": "WebRTC ICE handling is not implemented yet.",
            "session_id": session_id,
        },
    )


@router.post("/transcribe")
async def orb_voice_transcribe(
    payload: OrbVoiceTranscribeRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    if _provider_has_stt_credentials() and payload.text:
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
            "message": "Text fallback accepted. Configure ORB_VOICE_SERVER_STT and provider credentials for audio transcription.",
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
    if _provider_has_tts_credentials():
        return {
            "provider": "server",
            "text": payload.text,
            "voice_id": voice_id,
            "rate": payload.rate,
            "audio_url": None,
            "message": "Server TTS hook reserved — wire ORB_VOICE_PROVIDER_NAME when ready.",
        }
    return {
        "provider": "browser_fallback",
        "text": payload.text,
        "voice_id": voice_id,
        "rate": payload.rate,
        "message": "No server audio generated. Use browser SpeechSynthesis with the returned text.",
    }
