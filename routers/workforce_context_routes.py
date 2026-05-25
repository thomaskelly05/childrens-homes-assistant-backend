"""Workforce context routes — metadata-only, auth-gated operational summaries."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from db.connection import get_db
from services.workforce_context_service import workforce_context_service

router = APIRouter(prefix="/workforce/context", tags=["Workforce Context"])
compat_router = APIRouter(prefix="/api/workforce/context", tags=["Workforce Context API"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/health")
async def workforce_context_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(workforce_context_service.get_health(conn=conn).model_dump())


@router.get("/dashboard")
async def workforce_context_dashboard(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    dashboard = workforce_context_service.build_dashboard(current_user, conn=conn)
    return _success(dashboard.model_dump())


@router.get("/shift")
async def workforce_shift_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    shift = workforce_context_service.build_shift_context(current_user, conn=conn)
    staff = workforce_context_service.build_staff_on_shift(current_user, conn=conn)
    return _success({"shift": shift.model_dump(), "staff_on_shift": [i.model_dump() for i in staff]})


@router.get("/actions")
async def workforce_actions_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    items = workforce_context_service.build_staff_actions(current_user, conn=conn)
    return _success({"items": [i.model_dump() for i in items]})


@router.get("/training")
async def workforce_training_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    items = workforce_context_service.build_training_indicators(current_user, conn=conn)
    return _success({"items": [i.model_dump() for i in items]})


@router.get("/supervision")
async def workforce_supervision_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    items = workforce_context_service.build_supervision_indicators(current_user, conn=conn)
    return _success({"items": [i.model_dump() for i in items]})


@compat_router.get("/health")
async def api_workforce_context_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_context_health(current_user=current_user, conn=conn)


@compat_router.get("/dashboard")
async def api_workforce_context_dashboard(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_context_dashboard(current_user=current_user, conn=conn)


@compat_router.get("/shift")
async def api_workforce_shift_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_shift_context(current_user=current_user, conn=conn)


@compat_router.get("/actions")
async def api_workforce_actions_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_actions_context(current_user=current_user, conn=conn)


@compat_router.get("/training")
async def api_workforce_training_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_training_context(current_user=current_user, conn=conn)


@compat_router.get("/supervision")
async def api_workforce_supervision_context(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await workforce_supervision_context(current_user=current_user, conn=conn)
