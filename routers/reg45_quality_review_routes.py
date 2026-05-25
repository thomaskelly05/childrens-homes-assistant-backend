"""Reg 45 Quality of Care Review routes — draft review workflow, metadata only."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.reg45_quality_review import (
    Reg45ReviewActionRequest,
    Reg45ReviewCreateRequest,
    Reg45ReviewUpdateRequest,
)
from services.reg45_quality_review_registry_service import reg45_quality_review_registry_service
from services.reg45_quality_review_service import reg45_quality_review_service

router = APIRouter(prefix="/reg45", tags=["Reg 45 Quality Review"])
compat_router = APIRouter(prefix="/api/reg45", tags=["Reg 45 Quality Review API"])

MANAGER_ROLES = {
    "admin",
    "administrator",
    "manager",
    "registered_manager",
    "ri",
    "responsible_individual",
    "provider_admin",
    "super_admin",
}


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
        "review_support_only": True,
    }


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


def _ensure_manager_access(user: dict[str, Any]) -> None:
    role = str(user.get("role") or "").strip().lower()
    if role not in MANAGER_ROLES and not reg45_quality_review_service.enforce_access(user):
        raise HTTPException(status_code=403, detail="Manager or senior oversight access required")


def _require_manager(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    return user


@router.get("/health")
async def reg45_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    health = reg45_quality_review_service.get_health(conn=conn)
    payload = health.model_dump()
    payload["disclaimer"] = reg45_quality_review_registry_service.safe_review_disclaimer()
    return _success(payload)


@compat_router.get("/health")
async def api_reg45_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await reg45_health(current_user=current_user, conn=conn)


@router.get("/dashboard")
async def reg45_dashboard(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = _user_dict(current_user)
    _ensure_manager_access(user)
    dashboard = reg45_quality_review_service.build_dashboard(user, conn=conn)
    return _success(dashboard.model_dump())


@compat_router.get("/dashboard")
async def api_reg45_dashboard(
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await reg45_dashboard(current_user=current_user, conn=conn)


@router.post("/reviews/generate")
async def generate_reg45_review(
    body: Reg45ReviewCreateRequest | None = Body(default=None),
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    review = reg45_quality_review_service.generate_review(
        current_user, body or Reg45ReviewCreateRequest(), conn=conn
    )
    return _success(review.model_dump())


@compat_router.post("/reviews/generate")
async def api_generate_reg45_review(
    body: Reg45ReviewCreateRequest | None = Body(default=None),
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await generate_reg45_review(body=body, current_user=current_user, conn=conn)


@router.get("/reviews")
async def list_reg45_reviews(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    reviews = reg45_quality_review_service.list_reviews(current_user, limit=limit, conn=conn)
    return _success({"reviews": reviews})


@compat_router.get("/reviews")
async def api_list_reg45_reviews(
    limit: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await list_reg45_reviews(limit=limit, current_user=current_user, conn=conn)


@router.get("/reviews/{review_id}")
async def get_reg45_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    review = reg45_quality_review_service.get_review(review_id, current_user, conn=conn)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return _success(review.model_dump())


@compat_router.get("/reviews/{review_id}")
async def api_get_reg45_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await get_reg45_review(review_id=review_id, current_user=current_user, conn=conn)


@router.patch("/reviews/{review_id}")
async def update_reg45_review(
    review_id: str,
    body: Reg45ReviewUpdateRequest,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    review = reg45_quality_review_service.update_review(review_id, body, current_user, conn=conn)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return _success(review.model_dump())


@compat_router.patch("/reviews/{review_id}")
async def api_update_reg45_review(
    review_id: str,
    body: Reg45ReviewUpdateRequest,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await update_reg45_review(review_id=review_id, body=body, current_user=current_user, conn=conn)


@router.post("/reviews/{review_id}/action")
async def reg45_review_action(
    review_id: str,
    body: Reg45ReviewActionRequest,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    result = reg45_quality_review_service.apply_action(review_id, body, current_user, conn=conn)
    return _success(result.model_dump())


@compat_router.post("/reviews/{review_id}/action")
async def api_reg45_review_action(
    review_id: str,
    body: Reg45ReviewActionRequest,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await reg45_review_action(review_id=review_id, body=body, current_user=current_user, conn=conn)


@router.get("/reviews/{review_id}/export")
async def export_reg45_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    review = reg45_quality_review_service.get_review(review_id, current_user, conn=conn)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return _success(
        {
            "markdown": reg45_quality_review_service.export_markdown(review),
            "disclaimer": reg45_quality_review_registry_service.safe_review_disclaimer(),
        }
    )


@compat_router.get("/reviews/{review_id}/export")
async def api_export_reg45_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await export_reg45_review(review_id=review_id, current_user=current_user, conn=conn)


@router.post("/reviews/{review_id}/create-actions")
async def create_reg45_actions(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    review = reg45_quality_review_service.get_review(review_id, current_user, conn=conn)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    ids, warning = reg45_quality_review_service.create_actions_from_gaps(review, current_user, conn=conn)
    return _success({"action_ids": ids, "warning": warning})


@compat_router.post("/reviews/{review_id}/create-actions")
async def api_create_reg45_actions(
    review_id: str,
    current_user: dict[str, Any] = Depends(_require_manager),
    conn=Depends(get_db),
):
    return await create_reg45_actions(review_id=review_id, current_user=current_user, conn=conn)


compat_router.include_router(router)
