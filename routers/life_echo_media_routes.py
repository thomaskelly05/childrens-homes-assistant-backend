from __future__ import annotations

from fastapi import APIRouter

from life_echo.media.media_store import life_echo_media_store
from life_echo.media.upload_service import LifeEchoUploadService
from life_echo.storage.memory_vault import LifeEchoMemoryVault
from life_echo.voice.memory_voice_store import life_echo_memory_voice_store
from life_echo.voice.playback_engine import LifeEchoVoicePlaybackEngine

router = APIRouter(prefix="/api/life-echo/media", tags=["LifeEcho Media"])


@router.post("/upload-intent")
def create_upload_intent(payload: dict):
    return LifeEchoUploadService.create_upload(
        child_id=payload.get("child_id", "unknown"),
        filename=payload.get("filename", "memory"),
        media_type=payload.get("media_type", "memory"),
    )


@router.post("/memory")
def add_memory_media(payload: dict):
    return life_echo_media_store.add_media(
        child_id=payload.get("child_id", "unknown"),
        title=payload.get("title", "Memory"),
        media_type=payload.get("media_type", "memory"),
        url=payload.get("url", ""),
        description=payload.get("description"),
        tags=payload.get("tags", []),
    )


@router.get("/vault/{child_id}")
def get_memory_vault(child_id: str):
    return LifeEchoMemoryVault.build(child_id)


@router.post("/voice")
def add_voice_memory(payload: dict):
    return life_echo_memory_voice_store.store(
        child_id=payload.get("child_id", "unknown"),
        title=payload.get("title", "Voice memory"),
        transcript=payload.get("transcript", ""),
        speaker=payload.get("speaker", "Unknown"),
    )


@router.get("/voice/{child_id}")
def get_voice_memories(child_id: str):
    return LifeEchoVoicePlaybackEngine.build(child_id)
