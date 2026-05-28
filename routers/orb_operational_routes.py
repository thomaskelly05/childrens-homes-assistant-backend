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
    OrbOperationalHealth,
    OrbOperationalRequest,
    OrbOperationalResponse,
)
from services.orb_evidence_diagnostic_service import orb_evidence_diagnostic_service
from services.orb_intelligence_bridge_service import orb_intelligence_bridge_service
from services.orb_operational_action_builder_service import orb_operational_action_builder_service
from services.orb_operational_assistant_service import orb_operational_assistant_service
from services.orb_operational_context_service import orb_operational_context_bridge
from services.orb_operational_output_service import orb_operational_output_service
from services.orb_universal_evidence_service import orb_universal_evidence_service

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
            "recording_live_coach",
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
        "runtime_identity": "canonical_operational_os_orb",
        "evidence_spine": "universal_source_labelled_evidence_collector",
        "legacy_conversation": "/api/orb/conversation",
        "operational_intelligence": "/assistant/orb/operational",
        "evidence_diagnostics": "/assistant/orb/evidence-diagnostics",
    }


@router.get("/health")
async def operational_orb_health(current_user=Depends(require_assistant_access)):
    _ = current_user
    return {"success": True, "data": OrbOperationalHealth().model_dump()}


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


@router.post("/evidence-diagnostics")
async def operational_orb_evidence_diagnostics(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    context = orb_operational_context_bridge.build_context(payload, current_user, conn=conn)
    permissions = context.get("permissions")
    provider_id = permissions.provider_id if hasattr(permissions, "provider_id") else None
    evidence = orb_universal_evidence_service.collect(
        conn,
        current_user=current_user,
        scope=payload.scope,
        message=payload.message,
        young_person_id=payload.child_id,
        home_id=payload.home_id,
        provider_id=provider_id,
    )
    diagnostic = orb_evidence_diagnostic_service.from_universal_result(
        evidence,
        scope=payload.scope,
        child_id=payload.child_id,
        home_id=payload.home_id,
        provider_id=provider_id,
        message=payload.message,
    )
    return {
        "success": True,
        "data": {
            "runtime_identity": "canonical_operational_os_orb",
            "scope": payload.scope,
            "mode": payload.mode,
            "question": payload.message,
            "child_id": payload.child_id,
            "home_id": payload.home_id,
            "staff_id": payload.staff_id,
            "evidence_count": len(evidence.get("items") or []),
            "surface_count": evidence.get("surface_count", 0),
            "counts": evidence.get("counts", {}),
            "diagnostic": diagnostic,
            "items": evidence.get("items", [])[:40],
            "errors": evidence.get("errors", []),
            "context_sources": orb_operational_context_bridge.safe_context_sources(context),
            "permissions": context.get("permissions"),
            "os_linked": True,
            "standalone_only": False,
            "permissioned_context": True,
        },
    }


@compat_router.post("/evidence-diagnostics")
async def api_operational_orb_evidence_diagnostics(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_evidence_diagnostics(payload=payload, conn=conn, current_user=current_user)


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
    response: OrbOperationalResponse = await orb_operational_assistant_service.answer(payload, current_user, conn=conn)
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
    result = orb_operational_action_builder_service.create_actions_from_drafts(
        payload.drafts,
        current_user=current_user,
        conn=conn,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
    )
    created_ids = list(result.get("created_ids") or [])
    linked_output = None
    if payload.output_id and created_ids:
        linked = orb_operational_output_service.link_actions(
            payload.output_id,
            created_ids,
            current_user=current_user,
            conn=conn,
        )
        linked_output = linked.model_dump() if linked else None
    result["os_linked"] = True
    result["standalone_only"] = False
    result["permissioned_context"] = True
    result["output_id"] = payload.output_id
    result["linked_output"] = linked_output
    result["manager_review_required"] = payload.require_manager_review
    return {"success": True, "data": result}


@compat_router.post("/actions/create")
async def api_operational_orb_actions_create(
    payload: OrbOperationalActionsCreateRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_actions_create(payload=payload, conn=conn, current_user=current_user)


@router.post("/briefing")
async def operational_orb_briefing(
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
        save_output=payload.save,
        visibility=payload.visibility,
        output_type=payload.output_type or "briefing",
        tags=payload.tags,
        output_title=payload.title,
    )
    response = await orb_operational_assistant_service.answer(request, current_user, conn=conn)
    return {"success": True, "data": response.model_dump()}


@compat_router.post("/briefing")
async def api_operational_orb_briefing(
    payload: OrbOperationalBriefingRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_briefing(payload=payload, conn=conn, current_user=current_user)


@router.post("/outputs")
async def operational_orb_save_output(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    response = await orb_operational_assistant_service.answer(
        payload.model_copy(update={"save_output": True}),
        current_user,
        conn=conn,
    )
    return {"success": True, "data": response.model_dump()}


@compat_router.post("/outputs")
async def api_operational_orb_save_output(
    payload: OrbOperationalRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    return await operational_orb_save_output(payload=payload, conn=conn, current_user=current_user)
