from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb import OrbSessionEventRequest, OrbSessionStartRequest
from services.orb_operational_events_service import orb_operational_events_service
from services.orb_identity_service import orb_identity_service
from services.orb_observability_service import orb_observability_service
from services.orb_operational_context_service import build_orb_context, build_orb_response
from services.orb_realtime_provider_service import orb_realtime_provider_service
from services.orb_session_store import orb_session_store
from services.orb_voice_session_service import orb_voice_session_service
from services.orb_websocket_gateway import orb_websocket_gateway
from services.orb_wake_word_service import orb_wake_word_service

router = APIRouter(prefix="/orb", tags=["Orb Voice Assistant"])
compat_router = APIRouter(prefix="/api/orb", tags=["Orb Operational Assistant"])


class OrbConversationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    scope: str = "home"
    young_person_id: int | None = None
    staff_id: int | None = None
    home_id: int | None = None
    conversation_id: str | None = None
    limit: int = Field(default=50, ge=1, le=80)


def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    body: dict[str, Any] = {"success": False, "error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def _conversation_response(
    payload: OrbConversationRequest,
    *,
    conn: Any,
    current_user: dict[str, Any],
):
    context = build_orb_context(
        conn,
        current_user=current_user,
        scope=payload.scope,
        message=payload.message,
        young_person_id=payload.young_person_id,
        staff_id=payload.staff_id,
        home_id=payload.home_id,
        limit=payload.limit,
    )
    response = build_orb_response(context)
    if payload.conversation_id:
        response["conversation_id"] = payload.conversation_id
    return response


@router.post("/conversation")
async def orb_conversation(
    payload: OrbConversationRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return _conversation_response(payload, conn=conn, current_user=current_user)


@compat_router.post("/conversation")
async def api_orb_conversation(
    payload: OrbConversationRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return _conversation_response(payload, conn=conn, current_user=current_user)


@router.post("/session/start")
async def start_orb_session(
    payload: OrbSessionStartRequest,
    current_user=Depends(require_assistant_access),
):
    try:
        response = await orb_voice_session_service.start_session(request=payload, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except HTTPException:
        raise
    except Exception:
        return _error_response(503, "orb_session_start_failed", "Orb session could not be started. Please try again.", {"retryable": True})


@router.post("/realtime/session")
async def create_orb_realtime_session(
    payload: OrbSessionStartRequest,
    current_user=Depends(require_assistant_access),
):
    """Create a client-safe Orb realtime session.

    When OpenAI realtime is configured, the response includes only the OpenAI
    ephemeral client secret/session payload, never the server OPENAI_API_KEY.
    If realtime is disabled or unconfigured, the mock/text fallback remains
    available and the response states that clearly.
    """

    return await start_orb_session(payload=payload, current_user=current_user)


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
    except Exception:
        return _error_response(503, "orb_session_event_failed", "Orb event could not be processed. Please try again.", {"retryable": True})


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


@router.post("/realtime/session/{session_id}/interrupt")
async def interrupt_orb_realtime_session(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    return await interrupt_orb_session(session_id=session_id, current_user=current_user)


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


@router.post("/realtime/session/{session_id}/end")
async def end_orb_realtime_session(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    return await end_orb_session(session_id=session_id, current_user=current_user)


@router.get("/session/{session_id}/transcript")
async def orb_session_transcript(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = orb_voice_session_service.transcript(session_id, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.get("/realtime/session/{session_id}/transcript")
async def orb_realtime_session_transcript(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    return await orb_session_transcript(session_id=session_id, current_user=current_user)


@router.get("/session/{session_id}/summary")
async def orb_session_summary(
    session_id: str,
    current_user=Depends(require_assistant_access),
):
    try:
        response = orb_voice_session_service.summary(session_id, current_user=current_user)
        return {"success": True, "data": response.model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Orb session not found.")


@router.get("/config")
async def orb_config(current_user=Depends(require_assistant_access)):
    wake_word = orb_wake_word_service.capability()
    event_subscriptions = orb_operational_events_service.subscriptions_for(current_user=current_user, context={})
    return {
        "success": True,
        "data": {
            "name": "Orb powered by IndiCare",
            "wake_phrase": "Hey IndiCare",
            "wake_phrase_status": "optional_disabled_by_default",
            "wake_word": wake_word,
            "brains": [
                "care_brain",
                "inspector_brain",
                "general_assistant_brain",
                "web_research_brain",
                "productivity_brain",
                "report_writer_brain",
                "voice_recording_brain",
            ],
            "default_voice_profile": {
                "name": "IndiCare British Female",
                "accent": "British",
                "tone": "calm, warm, professional",
                "speed": "medium",
                "expressiveness": "natural but not theatrical",
                "use_case": "children's home operational support",
            },
            "states": [
                "passive_listening",
                "listening",
                "thinking",
                "speaking",
                "interrupted",
                "muted",
                "unavailable",
                "private",
                "recording",
                "dictation",
                "safeguarding_sensitive",
                "inspection",
            ],
            "provider_abstraction": ["openai_realtime", "mock_voice", "future_provider_interface"],
            "required_env": [
                "OPENAI_API_KEY",
                "ORB_VOICE_PROVIDER=openai|mock",
                "ORB_DEFAULT_VOICE=shimmer",
                "ORB_REALTIME_ENABLED=true|false",
                "ORB_WEB_SEARCH_ENDPOINT",
                "ORB_WEB_SEARCH_API_KEY",
                "OPENWEATHER_API_KEY",
            ],
            "raw_audio_stored": False,
            "secret_keys_exposed_to_client": False,
            "identity_contract": orb_identity_service.contract().model_dump(),
            "realtime_conversation": {
                "microphone_streaming": "OpenAI Realtime WebRTC when configured.",
                "turn_taking": "Server VAD with client-side silence and backend turn-state coordination.",
                "barge_in": "Realtime spoken interruption when provider transport is active; click/tap interrupt fallback is always available.",
                "direct_writes": False,
            },
            "operational_event_subscriptions": event_subscriptions,
        },
    }


@router.get("/realtime/health")
async def orb_realtime_health(current_user=Depends(require_assistant_access)):
    return {"success": True, "data": orb_realtime_provider_service.health_metrics()}


@router.get("/health")
async def orb_health(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            **orb_observability_service.health(),
            "session_store": orb_session_store.health(),
        },
    }


@router.get("/realtime/metrics")
async def orb_realtime_metrics(current_user=Depends(require_assistant_access)):
    return {"success": True, "data": orb_observability_service.metrics()}


@router.get("/provider/status")
async def orb_provider_status(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": {
            "openai_realtime": orb_realtime_provider_service.provider_status(),
            "observed": orb_observability_service.provider_status(),
        },
    }


@router.websocket("/realtime/ws")
async def orb_realtime_websocket(websocket: WebSocket):
    await orb_websocket_gateway.handle(websocket)


@router.get("/events/subscriptions")
async def orb_event_subscriptions(current_user=Depends(require_assistant_access)):
    return {
        "success": True,
        "data": orb_operational_events_service.subscriptions_for(current_user=current_user, context={}),
    }

