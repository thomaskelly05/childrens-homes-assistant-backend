from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import (
    orb_residential_premium_dependency,
    require_orb_residential_auth,
)
from services.orb_ai_abuse_guard_service import enforce_daily_ai_call_budget, enforce_transcript_length
from services.orb_brain_metadata_service import attach_to_payload, build_brain_metadata
from services.orb_voice_tts_service import (
    ORBVoiceTTSError,
    is_configured,
    synthesize_spoken_reply,
    tts_status_payload,
)

logger = logging.getLogger(__name__)

require_orb_voice_premium = orb_residential_premium_dependency("voice_workflows")

router = APIRouter(prefix="/orb/voice/tts", tags=["ORB Voice TTS"])


def _voice_status_payload(body: dict) -> dict:
    return attach_to_payload(body, surface="orb_residential", feature="voice_tts")


def _user_id_from(current_user: dict) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


class ORBVoiceTTSRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=500)
    voice_style: str | None = "calm_therapeutic"
    voice_id: str | None = None
    format: str | None = "mp3"
    context: str | None = Field(default=None, max_length=120)


@router.get("/status")
def orb_voice_tts_status(current_user: dict[str, Any] = Depends(require_orb_residential_auth)):
    """Always returns 200 so clients can distinguish route availability from TTS configuration."""
    _ = current_user
    _ = build_brain_metadata(surface="orb_residential", feature="voice_tts")
    return _voice_status_payload({"ok": True, **tts_status_payload()})


@router.post("")
async def orb_voice_tts(
    payload: ORBVoiceTTSRequest,
    current_user: dict[str, Any] = Depends(require_orb_voice_premium),
):
    user_id = _user_id_from(current_user)
    spoken = (payload.text or "").strip()
    enforce_daily_ai_call_budget(user_id)
    enforce_transcript_length(spoken, user_id=user_id)

    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "tts_disabled",
                "message": "Premium ORB Voice is not enabled on this server.",
            },
        )

    try:
        result = await synthesize_spoken_reply(
            text=spoken,
            voice_id=payload.voice_id,
            voice_style=payload.voice_style,
            audio_format=payload.format or "mp3",
        )
    except ORBVoiceTTSError as exc:
        logger.info(
            "orb_voice_tts_request_failed code=%s user_id=%s text_len=%s",
            exc.code,
            user_id,
            len(spoken),
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error": exc.code, "message": exc.message},
        ) from exc

    logger.info(
        "orb_voice_tts_request_ok user_id=%s voice_id=%s style=%s text_len=%s bytes=%s",
        user_id,
        result.voice_id,
        result.voice_style,
        len(spoken),
        len(result.audio_bytes),
    )

    return Response(
        content=result.audio_bytes,
        media_type=result.content_type,
        headers={
            "X-ORB-Voice-Id": result.voice_id,
            "X-ORB-Voice-Style": result.voice_style,
            "X-ORB-TTS-Provider": result.provider,
            "X-ORB-Voice-Name": result.voice_name,
            "X-ORB-TTS-Fallback": "true" if result.fallback_used else "false",
            "Cache-Control": "no-store",
        },
    )
