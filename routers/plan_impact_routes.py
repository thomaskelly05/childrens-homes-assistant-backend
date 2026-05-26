"""Plan impact suggestion routes — review required, no silent updates."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.plan_impact import PlanImpactActionRequest, PlanImpactFilter
from services.plan_impact_suggestion_service import plan_impact_suggestion_service

router = APIRouter(prefix="/plan-impacts", tags=["Plan Impacts"])
compat_router = APIRouter(prefix="/api/plan-impacts", tags=["Plan Impacts API"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "operational_only": True, "standalone_access": False}


@router.get("/")
async def list_plan_impacts(
    child_id: int | None = None,
    home_id: int | None = None,
    status: str | None = None,
    suggested_plan_type: str | None = None,
    page: int = 1,
    page_size: int = 50,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = PlanImpactFilter(
        child_id=child_id,
        home_id=home_id,
        status=status,  # type: ignore[arg-type]
        suggested_plan_type=suggested_plan_type,  # type: ignore[arg-type]
        page=page,
        page_size=page_size,
    )
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    return _success(
        plan_impact_suggestion_service.list_suggestions(filters, user, conn=conn).model_dump()
    )


@compat_router.get("/")
async def api_list_plan_impacts(**kwargs):
    return await list_plan_impacts(**kwargs)


@router.post("/{suggestion_id}/decision")
async def plan_impact_decision(
    suggestion_id: str,
    request: PlanImpactActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    result = plan_impact_suggestion_service.apply_decision(
        suggestion_id, request, user, conn=conn
    )
    if not result:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return _success(result.model_dump())


@compat_router.post("/{suggestion_id}/decision")
async def api_plan_impact_decision(suggestion_id: str, request: PlanImpactActionRequest, **kwargs):
    return await plan_impact_decision(suggestion_id=suggestion_id, request=request, **kwargs)
