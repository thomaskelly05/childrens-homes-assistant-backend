from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb import OrbContext, OrbSessionEventRequest, OrbSessionStartRequest
from services.orb_operational_events_service import orb_operational_events_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_identity_service import orb_identity_service
from services.orb_intent_router import route_orb_intent
from services.orb_observability_service import orb_observability_service
from services.orb_operational_context_service import build_orb_context, build_orb_response
from services.orb_productivity_service import orb_productivity_service
from services.orb_realtime_provider_service import orb_realtime_provider_service
from services.orb_session_store import orb_session_store
from services.orb_voice_session_service import orb_voice_session_service
from services.orb_web_search_service import orb_web_search_service
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


def _orb_context_for_payload(payload: OrbConversationRequest) -> OrbContext:
    return OrbContext(
        route="/orb",
        workspace=payload.scope,
        page_title="ORB",
        selected_young_person_id=payload.young_person_id,
        home_id=payload.home_id,
        assistant_context={
            "staff_id": payload.staff_id,
            "conversation_id": payload.conversation_id,
            "surface": "typed_orb",
        },
    )


def _normalised_sources(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for index, item in enumerate(items[:8], start=1):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or item.get("label") or item.get("source_type") or "External source")
        record_type = str(item.get("record_type") or item.get("source_type") or item.get("tool") or "external_tool")
        record_id = str(item.get("record_id") or item.get("source_id") or item.get("url") or title)
        sources.append(
            {
                "title": title,
                "record_type": record_type,
                "record_id": record_id,
                "route": item.get("route"),
                "date": item.get("date"),
                "citation_ref": str(item.get("citation_ref") or f"[{index}]"),
                "summary": item.get("summary") or item.get("snippet") or item.get("url") or "",
            }
        )
    return sources


def _non_care_conversation_response(payload: OrbConversationRequest, decision: Any, assistant_data: dict[str, Any]) -> dict[str, Any]:
    tools_used = [str(tool) for tool in assistant_data.get("tools_used") or decision.tool_categories or []]
    answer = str(assistant_data.get("answer") or "I can help with that, but I could not form a response just now.")
    return {
        "ok": True,
        "answer": answer,
        "summary": answer.split("\n", 1)[0][:220],
        "sources": _normalised_sources(list(assistant_data.get("sources") or [])),
        "citations": [],
        "actions": [],
        "confidence": "medium",
        "guardrails": [
            "No IndiCare care records were retrieved for this answer.",
            "For care, safeguarding, chronology, evidence or inspection decisions, ask an IndiCare scoped question so ORB can use permitted records and citations.",
        ],
        "context_used": {
            "scope": payload.scope,
            "intent": decision.assistant_mode,
            "brain": decision.brain,
            "projection_keys": [],
            "live_tables": [],
            "snapshot_hit": False,
            "care_retrieval": False,
            "tools_used": tools_used,
            "tool_status": assistant_data.get("tool_status"),
        },
        "projection_keys": [],
        "live_status": {"care_retrieval": False, "tools_used": tools_used},
        "conversation_id": payload.conversation_id,
    }


def _orb_health_payload() -> dict[str, Any]:
    return {
        "success": True,
        "data": {
            **orb_observability_service.health(),
            "session_store": orb_session_store.health(),
        },
    }


async def _conversation_response(
    payload: OrbConversationRequest,
    *,
    conn: Any,
    current_user: dict[str, Any],
):
    decision = route_orb_intent(
        message=payload.message,
        current_user=current_user,
        selected_mode="auto",
        context=_orb_context_for_payload(payload),
    )

    if not decision.care_scope_required:
        if decision.brain == "web_research_brain":
            assistant_data = await orb_web_search_service.answer(payload.message)
        elif decision.brain == "productivity_brain":
            assistant_data = await orb_productivity_service.answer(payload.message)
        else:
            assistant_data = await orb_general_assistant_service.answer(payload.message)
        return _non_care_conversation_response(payload, decision, assistant_data)

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
    response.setdefault("context_used", {})
    response["context_used"]["brain"] = decision.brain
    response["context_used"]["care_retrieval"] = True
    if payload.conversation_id:
        response["conversation_id"] = payload.conversation_id
    return response


@router.post("/conversation")
async def orb_conversation(
    payload: OrbConversationRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await _conversation_response(payload, conn=conn, current_user=current_user)


@compat_router.post("/conversation")
async def api_orb_conversation(
    payload: OrbConversationRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await _conversation_response(payload, conn=conn, current_user=current_user)


@router.get("/health")
async def orb_health(current_user=Depends(require_assistant_access)):
    return _orb_health_payload()


@compat_router.get("/health")
async def api_orb_health(current_user=Depends(require_assistant_access)):
    return _orb_health_payload()
