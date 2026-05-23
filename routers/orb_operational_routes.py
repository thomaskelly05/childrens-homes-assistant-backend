"""Operational OS ORB routes — /assistant/orb/* only; never used by standalone /orb."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from auth.permissions import require_assistant_access
from db.connection import get_db
from schemas.orb_operational import (
    OrbOperationalActionsCreateRequest,
    OrbOperationalActionsDraftRequest,
    OrbOperationalBriefingRequest,
    OrbOperationalDraftAction,
    OrbOperationalHealth,
    OrbOperationalRequest,
    OrbOperationalResponse,
)
from services.orb_intelligence_bridge_service import orb_intelligence_bridge_service
from services.orb_operational_action_builder_service import orb_operational_action_builder_service
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


@router.get("/context-cards")
async def operational_orb_context_cards(
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
    scope: str = "current_user",
    mode: str = "general_operational_question",
    home_id: int | None = None,
    child_id: int | None = None,
    staff_id: int | None = None,
):
    request = OrbOperationalRequest(
        message="Context cards",
        mode=mode,  # type: ignore[arg-type]
        scope=scope,  # type: ignore[arg-type]
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
    )
    context = orb_operational_context_bridge.build_context(request, current_user, conn=conn)
    cards = orb_operational_context_bridge.build_context_cards(context, request)
    status = orb_operational_context_bridge.build_context_status(context, request)
    return {
        "success": True,
        "data": {
            "context_cards": cards,
            "context_status": status,
            "permissions": context.get("permissions"),
            "os_linked": True,
            "standalone_only": False,
            "permissioned_context": True,
        },
    }


@compat_router.get("/context-cards")
async def api_operational_orb_context_cards(
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
    scope: str = "current_user",
    mode: str = "general_operational_question",
    home_id: int | None = None,
    child_id: int | None = None,
    staff_id: int | None = None,
):
    return await operational_orb_context_cards(
        conn=conn,
        current_user=current_user,
        scope=scope,
        mode=mode,
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
    )


@router.post("/actions/draft")
async def operational_orb_actions_draft(
    payload: OrbOperationalActionsDraftRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    request = OrbOperationalRequest(
        message=payload.message,
        mode=payload.mode,
        scope=payload.scope,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
        days=payload.days,
    )
    context = orb_operational_context_bridge.build_context(request, current_user, conn=conn)
    answer = payload.answer or ""
    recommendations = orb_operational_action_builder_service.build_recommendations(context, answer, request)
    drafts = orb_operational_action_builder_service.build_draft_actions(recommendations, request)
    return {
        "success": True,
        "data": {
            "draft_actions": [d.model_dump() for d in drafts],
            "recommendations": [r.model_dump() for r in recommendations],
            "review_prompts": orb_operational_context_bridge.build_review_prompts(context, request),
            "notice": "Draft actions are suggestions only — not persisted until explicitly created.",
            "os_linked": True,
            "standalone_only": False,
        },
    }


@compat_router.post("/actions/draft")
async def api_operational_orb_actions_draft(
    payload: OrbOperationalActionsDraftRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_actions_draft(payload=payload, conn=conn, current_user=current_user)


@router.post("/actions/create")
async def operational_orb_actions_create(
    payload: OrbOperationalActionsCreateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    drafts = list(payload.drafts)
    if not drafts:
        return _error_response(400, "no_drafts", "Provide at least one draft action to create.")
    for draft in drafts:
        if draft.priority in {"high", "urgent"} or payload.require_manager_review:
            draft.review_required = True
    result = orb_operational_action_builder_service.create_actions_from_drafts(
        drafts,
        current_user,
        conn=conn,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
    )
    return {
        "success": True,
        "data": {
            **result,
            "os_linked": True,
            "standalone_only": False,
        },
    }


@compat_router.post("/actions/create")
async def api_operational_orb_actions_create(
    payload: OrbOperationalActionsCreateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_actions_create(payload=payload, conn=conn, current_user=current_user)


@router.post("/briefings/create")
async def operational_orb_briefings_create(
    payload: OrbOperationalBriefingRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    request = OrbOperationalRequest(
        message=payload.message,
        mode=payload.mode,
        scope=payload.scope,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
        days=payload.days,
    )
    context = orb_operational_context_bridge.build_context(request, current_user, conn=conn)
    answer = payload.answer or ""
    briefing = orb_operational_action_builder_service.build_briefing(
        context,
        answer or "Operational briefing prepared from permissioned context.",
        request,
        force=True,
    )
    return {
        "success": True,
        "data": {
            "briefing": briefing.model_dump() if briefing else None,
            "persisted": False,
            "notice": "Briefing is for copy/export — OS operational output store not required for this pass.",
            "os_linked": True,
            "standalone_only": False,
        },
    }


@compat_router.post("/briefings/create")
async def api_operational_orb_briefings_create(
    payload: OrbOperationalBriefingRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_briefings_create(payload=payload, conn=conn, current_user=current_user)


@router.post("/briefings/save")
async def operational_orb_briefings_save(
    payload: OrbOperationalBriefingRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    request = OrbOperationalRequest(
        message=payload.message,
        mode=payload.mode,
        scope=payload.scope,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
        days=payload.days,
    )
    context = orb_operational_context_bridge.build_context(request, current_user, conn=conn)
    briefing = orb_operational_action_builder_service.build_briefing(
        context,
        payload.answer or "",
        request,
        force=True,
    )
    if not briefing:
        return {
            "success": True,
            "data": {
                "briefing": None,
                "export_payload": None,
                "warning": "No briefing could be built from the current context.",
                "saved_as_output_id": None,
                "os_linked": True,
            },
        }
    export_payload = briefing.model_dump()
    warning = (
        "OS operational briefing store is not yet wired; use copy/export payload below. "
        "Standalone saved outputs are not used for OS operational data."
    )
    saved_id = None
    if payload.save:
        warning = (
            "Persistence to a dedicated OS operational output store is not available in this pass. "
            "Briefing returned as export payload only."
        )
    return {
        "success": True,
        "data": {
            "briefing": export_payload,
            "export_payload": export_payload,
            "warning": warning,
            "saved_as_output_id": saved_id,
            "os_linked": True,
            "standalone_only": False,
        },
    }


@compat_router.post("/briefings/save")
async def api_operational_orb_briefings_save(
    payload: OrbOperationalBriefingRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_briefings_save(payload=payload, conn=conn, current_user=current_user)
