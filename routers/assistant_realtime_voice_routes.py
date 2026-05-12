from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from services.assistant_security import safe_string

router = APIRouter(prefix="/assistant/realtime", tags=["Assistant Realtime Voice"])

OPENAI_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/sessions"
DEFAULT_REALTIME_MODEL = os.getenv("INDICARE_REALTIME_MODEL", "gpt-4o-realtime-preview")
DEFAULT_REALTIME_VOICE = os.getenv("INDICARE_REALTIME_VOICE", "shimmer")


class RealtimeSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mode: str | None = "intelligence"
    voice: str | None = None
    profile: dict[str, Any] | None = None
    memory_summary: str | None = None
    conversation_id: str | None = None


def _voice_instruction(payload: RealtimeSessionRequest, current_user: dict[str, Any]) -> str:
    profile = payload.profile or {}
    name = safe_string(profile.get("name")) or safe_string(current_user.get("name")) or "the adult"
    role = safe_string(profile.get("role")) or "residential care professional"
    tone = safe_string(profile.get("tone")) or "calm, warm, reflective and practical"
    memory = safe_string(payload.memory_summary)[:4000]
    return (
        "You are IndiCare Intelligence, a realtime British female voice assistant for residential children's homes. "
        "Speak naturally, calmly and humanly. Use short spoken sentences, not long paragraphs. "
        "Default personality: warm British colleague, emotionally mature, non-corporate, professional and reassuring. "
        f"User: {name}. Role/context: {role}. Preferred tone: {tone}. "
        "Start with brief natural acknowledgements only when they fit. Do not over-talk. "
        "Pause naturally. Ask one useful question when more detail is needed. "
        "If safeguarding, risk, allegation, missing episode, restraint, self-harm, harm to others or serious incident is mentioned, slow down, separate facts from interpretation and suggest manager, DSL or professional escalation as appropriate. "
        "Do not claim to be human or conscious. Do not make final legal, safeguarding, employment or clinical decisions. Keep British English. "
        f"Live memory available: {memory or 'No live memory summary supplied yet.'}"
    )


@router.post("/session")
async def create_realtime_voice_session(payload: RealtimeSessionRequest, current_user=Depends(get_current_user)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Realtime voice is not configured.")
    voice = safe_string(payload.voice) or DEFAULT_REALTIME_VOICE
    body = {
        "model": DEFAULT_REALTIME_MODEL,
        "voice": voice,
        "instructions": _voice_instruction(payload, current_user),
        "modalities": ["audio", "text"],
        "input_audio_transcription": {"model": "whisper-1"},
        "turn_detection": {"type": "server_vad", "threshold": 0.5, "prefix_padding_ms": 300, "silence_duration_ms": 650},
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            OPENAI_REALTIME_SESSION_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json", "OpenAI-Beta": "realtime=v1"},
            json=body,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Could not create realtime voice session.")
    data = response.json()
    return {"ok": True, "provider": "openai_realtime", "model": DEFAULT_REALTIME_MODEL, "voice": voice, "session": data, "fallback": "browser_voice"}


@router.get("/health")
async def realtime_voice_health():
    return {"ok": True, "configured": bool(os.getenv("OPENAI_API_KEY")), "provider": "openai_realtime", "model": DEFAULT_REALTIME_MODEL, "voice": DEFAULT_REALTIME_VOICE}
