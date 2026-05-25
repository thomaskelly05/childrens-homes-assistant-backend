"""Manager daily brief routes — metadata-only, auth-gated."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.manager_daily_brief import ManagerDailyBriefReviewRequest
from services.manager_daily_brief_service import manager_daily_brief_service

router = APIRouter(prefix="/manager-daily-brief", tags=["Manager Daily Brief"])
compat_router = APIRouter(prefix="/api/manager-daily-brief", tags=["Manager Daily Brief API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/health")
async def manager_daily_brief_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(manager_daily_brief_service.get_health(conn=conn).model_dump())


@router.get("")
async def get_manager_daily_brief(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    brief = manager_daily_brief_service.build_brief(current_user, conn=conn)
    return _success(brief.model_dump())


@router.post("/mark-reviewed")
async def mark_manager_daily_brief_reviewed(
    body: ManagerDailyBriefReviewRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    result = manager_daily_brief_service.mark_reviewed(current_user, body, conn=conn)
    return _success(result.model_dump())


@compat_router.get("/health")
async def api_manager_daily_brief_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await manager_daily_brief_health(current_user=current_user, conn=conn)


@compat_router.get("")
async def api_get_manager_daily_brief(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await get_manager_daily_brief(current_user=current_user, conn=conn)


@compat_router.post("/mark-reviewed")
async def api_mark_manager_daily_brief_reviewed(
    body: ManagerDailyBriefReviewRequest | None = None,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await mark_manager_daily_brief_reviewed(body=body, current_user=current_user, conn=conn)
