from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb import OrbSessionEventRequest, OrbSessionStartRequest
from services.orb_voice_session_service import orb_voice_session_service

router = APIRouter(prefix="/orb", tags=["Orb Voice Assistant"])


def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    body: dict[str, Any] = {"success": False, "error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


@router.post("/session/start")
async def start_orb_session(
    payload: OrbSessionStartRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        response = await orb_voice_session_service.start_session(request=payload, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except Exception as exc:
        return _error_response(500, "orb_session_start_failed", "Orb session could not be started.", str(exc))


@router.post("/session/{session_id}/event")
async def orb_session_event(
    session_id: str,
    payload: OrbSessionEventRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    try:
        response = await orb_voice_session_service.handle_event(
            session_id=session_id,
            event=payload,
            conn=conn,
            current_user=current_user,
        )
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")
    except HTTPException:
        raise
    except Exception as exc:
        return _error_response(500, "orb_session_event_failed", "Orb event could not be processed.", str(exc))


@router.post("/session/{session_id}/interrupt")
async def interrupt_orb_session(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = await orb_voice_session_service.interrupt(session_id=session_id, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.post("/session/{session_id}/end")
async def end_orb_session(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = await orb_voice_session_service.end(session_id=session_id, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.get("/session/{session_id}/transcript")
async def orb_session_transcript(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = orb_voice_session_service.transcript(session_id)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.get("/session/{session_id}/summary")
async def orb_session_summary(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = orb_voice_session_service.summary(session_id)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.get("/config")
async def orb_config(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            "name": "Orb powered by IndiCare",
            "wake_phrase": "Hey IndiCare",
            "wake_phrase_status": "foundation_placeholder",
            "default_voice_profile": {
                "name": "IndiCare British Female",
                "accent": "British",
                "tone": "calm, warm, professional",
                "speed": "medium",
                "expressiveness": "natural but not theatrical",
                "use_case": "children's home operational support",
            },
            "states": [
                "listening",
                "thinking",
                "speaking",
                "interrupted",
                "muted",
                "private",
                "recording",
                "dictation",
                "safeguarding_sensitive",
                "inspection",
            ],
            "provider_abstraction": ["openai_realtime", "mock_voice", "future_provider_interface"],
            "raw_audio_stored": False,
            "secret_keys_exposed_to_client": False,
        },
    }

