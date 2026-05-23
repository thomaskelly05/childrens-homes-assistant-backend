"""Operational OS ORB routes — /assistant/orb/* only; never used by standalone /orb."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb_operational import (
    OrbOperationalHealth,
    OrbOperationalRequest,
    OrbOperationalResponse,
)
from services.orb_intelligence_bridge_service import orb_intelligence_bridge_service
from services.orb_operational_assistant_service import orb_operational_assistant_service
from services.orb_operational_context_service import orb_operational_context_bridge

router = APIRouter(prefix="/assistant/orb", tags=["Operational OS ORB"])
compat_router = APIRouter(prefix="/api/assistant/orb", tags=["Operational OS ORB API"])


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message},
            "standalone_only": False,
            "os_linked": True,
            "permissioned_context": True,
        },
    )


def _capabilities_payload() -> dict[str, Any]:
    return {
        "modes": [
            "operational_summary",
            "manager_daily_brief",
            "record_quality_review",
            "safeguarding_themes",
            "ofsted_evidence_review",
            "action_priority",
            "staff_support",
            "child_journey_summary",
            "governance_briefing",
            "general_operational_question",
        ],
        "scopes": ["home", "child", "staff", "provider", "current_user"],
        "boundary": (
            "OS ORB can use permissioned IndiCare context. "
            "It only sees information available to your role."
        ),
        "legacy_conversation": "/api/orb/conversation",
        "operational_intelligence": "/assistant/orb/operational",
    }


@router.get("/health")
async def operational_orb_health(current_user=Depends(require_assistant_access)):
    _ = current_user
    return {
        "success": True,
        "data": OrbOperationalHealth().model_dump(),
    }


@compat_router.get("/health")
async def api_operational_orb_health(current_user=Depends(require_assistant_access)):
    return await operational_orb_health(current_user=current_user)


@router.get("/capabilities")
async def operational_orb_capabilities(current_user=Depends(require_assistant_access)):
    _ = current_user
    return {"success": True, "data": _capabilities_payload()}


@compat_router.get("/capabilities")
async def api_operational_orb_capabilities(current_user=Depends(require_assistant_access)):
    return await operational_orb_capabilities(current_user=current_user)


@router.post("/operational")
async def operational_orb_intelligence(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    result = await orb_intelligence_bridge_service.run_operational_intelligence(
        payload,
        current_user=current_user,
        conn=conn,
    )
    if not result.get("success"):
        return _error_response(403, str(result.get("error") or "forbidden"), str(result.get("message") or "Forbidden"))
    return {"success": True, "data": result.get("data")}


@compat_router.post("/operational")
async def api_operational_orb_intelligence(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_intelligence(payload=payload, conn=conn, current_user=current_user)


@router.post("/conversation")
async def operational_orb_conversation(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    response: OrbOperationalResponse = await orb_operational_assistant_service.answer(
        payload,
        current_user,
        conn=conn,
    )
    orb_intelligence_bridge_service.audit_operational_intelligence_use(payload, response, current_user)
    return {"success": True, "data": response.model_dump()}


@compat_router.post("/conversation")
async def api_operational_orb_conversation(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_conversation(payload=payload, conn=conn, current_user=current_user)


@router.post("/context-summary")
async def operational_orb_context_summary(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    context = orb_operational_context_bridge.build_context(payload, current_user, conn=conn)
    summary = orb_operational_context_bridge.summarise_context(context)
    return {
        "success": True,
        "data": {
            "context_summary": summary,
            "sources": orb_operational_context_bridge.safe_context_sources(context),
            "permissions": context.get("permissions"),
            "os_linked": True,
            "care_record_access": bool(context.get("raw_available")),
            "standalone_only": False,
            "permissioned_context": True,
        },
    }


@compat_router.post("/context-summary")
async def api_operational_orb_context_summary(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_context_summary(payload=payload, conn=conn, current_user=current_user)
