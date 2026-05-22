from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.indicare_intelligence import IntelligenceRequest
from schemas.intelligence_actions import (
    IntelligenceActionBulkCreate,
    IntelligenceActionCreate,
    IntelligenceActionDecision,
    IntelligenceActionUpdate,
    IntelligenceOversightReviewCreate,
)
from services.indicare_intelligence_spine_service import indicare_intelligence_spine_service
from services.intelligence_action_service import ACTION_NOTICE, intelligence_action_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE

router = APIRouter(prefix="/intelligence", tags=["intelligence-actions"])


class ProposeActionsPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    request: IntelligenceRequest | None = None
    spine: dict[str, Any] | None = None
    home_id: int | str | None = None
    child_id: int | str | None = None
    staff_id: int | str | None = None
    create_actions: bool = False


class CompleteActionPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    completion_notes: str | None = None


@router.get("/actions/health")
def intelligence_actions_health(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "status": "ready",
            "service": "intelligence_action_service",
            "persistence_available": intelligence_action_service.persistence_available(),
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            "action_notice": ACTION_NOTICE,
            "user_id": current_user.get("id"),
        },
    }


@router.post("/actions/propose")
def propose_intelligence_actions(
    payload: ProposeActionsPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    spine_data: dict[str, Any] | None = payload.spine
    if payload.request and not spine_data:
        spine = indicare_intelligence_spine_service.build_response(
            payload.request,
            conn=conn,
            current_user=current_user,
        )
        spine_data = spine.model_dump(mode="json")
    if not spine_data:
        spine_data = {}
    proposed = intelligence_action_service.propose_actions_from_spine(
        spine_data,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
    )
    if payload.create_actions and proposed:
        proposed = intelligence_action_service.persist_proposed_actions(
            proposed,
            current_user=current_user,
            conn=conn,
        )
    summary = intelligence_action_service.build_action_summary(proposed)
    return {
        "success": True,
        "data": {
            "proposed_actions": [a.model_dump(mode="json") for a in proposed],
            "action_summary": summary.model_dump(mode="json"),
            "action_notice": ACTION_NOTICE,
            "persisted": payload.create_actions,
        },
    }


@router.get("/actions")
def list_intelligence_actions(
    home_id: int | str | None = None,
    child_id: int | str | None = None,
    staff_id: int | str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    actions = intelligence_action_service.list_actions(
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        status=status,
        limit=limit,
        conn=conn,
    )
    return {
        "success": True,
        "data": {
            "actions": [a.model_dump(mode="json") for a in actions],
            "total": len(actions),
            "persistence_available": intelligence_action_service.persistence_available(),
            "action_notice": ACTION_NOTICE,
        },
    }


@router.post("/actions")
def create_intelligence_action(
    payload: IntelligenceActionCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    action = intelligence_action_service.create_action(payload, current_user=current_user, conn=conn)
    return {"success": True, "data": action.model_dump(mode="json")}


@router.post("/actions/bulk-create")
def bulk_create_intelligence_actions(
    payload: IntelligenceActionBulkCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = intelligence_action_service.bulk_create_actions(
        payload.actions,
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
        current_user=current_user,
        conn=conn,
    )
    return {
        "success": True,
        "data": {
            "created": [a.model_dump(mode="json") for a in result.created],
            "failed": result.failed,
            "summary": result.summary.model_dump(mode="json"),
            "action_notice": ACTION_NOTICE,
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        },
    }


@router.get("/actions/attention-feed")
def intelligence_actions_attention_feed(
    home_id: int | str | None = None,
    child_id: int | str | None = None,
    staff_id: int | str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    feed = intelligence_action_service.build_attention_feed(
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        conn=conn,
    )
    return {"success": True, "data": feed.model_dump(mode="json")}


@router.patch("/actions/{action_id}")
def update_intelligence_action(
    action_id: str,
    payload: IntelligenceActionUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    updated = intelligence_action_service.update_action(
        action_id,
        payload,
        current_user=current_user,
        conn=conn,
    )
    if not updated:
        return {"success": False, "error": "action not found"}
    return {"success": True, "data": updated.model_dump(mode="json")}


@router.post("/actions/{action_id}/decision")
def decide_intelligence_action(
    action_id: str,
    payload: IntelligenceActionDecision,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    updated = intelligence_action_service.decide_action(
        action_id,
        payload,
        current_user=current_user,
        conn=conn,
    )
    if not updated:
        return {"success": False, "error": "action not found"}
    return {"success": True, "data": updated.model_dump(mode="json")}


@router.post("/actions/{action_id}/complete")
def complete_intelligence_action(
    action_id: str,
    payload: CompleteActionPayload,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    updated = intelligence_action_service.complete_action(
        action_id,
        completion_notes=payload.completion_notes,
        current_user=current_user,
        conn=conn,
    )
    if not updated:
        return {"success": False, "error": "action not found"}
    return {"success": True, "data": updated.model_dump(mode="json")}


@router.get("/actions/summary")
def intelligence_actions_summary(
    home_id: int | str | None = None,
    child_id: int | str | None = None,
    staff_id: int | str | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    summary = intelligence_action_service.build_action_summary(
        home_id=home_id,
        child_id=child_id,
        staff_id=staff_id,
        conn=conn,
    )
    return {
        "success": True,
        "data": {
            "summary": summary.model_dump(mode="json"),
            "action_notice": ACTION_NOTICE,
        },
    }


@router.post("/oversight-reviews")
def create_oversight_review(
    payload: IntelligenceOversightReviewCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    review = intelligence_action_service.create_oversight_review(
        payload,
        current_user=current_user,
        conn=conn,
    )
    return {"success": True, "data": review.model_dump(mode="json")}
