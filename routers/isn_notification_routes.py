"""ISN notification digest routes — metadata-only operational surfaces."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from services.isn_digest_service import isn_digest_service

router = APIRouter(prefix="/api/isn/notifications", tags=["ISN Notifications"])
compat_router = APIRouter(prefix="/isn/notifications", tags=["ISN Notifications"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/health")
async def isn_notification_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(isn_digest_service.get_health(conn=conn).model_dump())


@router.get("/digest")
async def isn_notification_digest(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    digest = isn_digest_service.build_digest(current_user, conn=conn)
    return _success(digest.model_dump())


@router.get("/badge-summary")
async def isn_notification_badge_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    summary = isn_digest_service.build_badge_summary(current_user, conn=conn)
    return _success(summary.model_dump())


@router.get("/items")
async def isn_notification_items(
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    items = isn_digest_service.list_notification_items(current_user, limit=limit, conn=conn)
    return _success([item.model_dump() for item in items])


@compat_router.get("/health")
async def compat_isn_notification_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_health(current_user=current_user, conn=conn)


@compat_router.get("/digest")
async def compat_isn_notification_digest(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_digest(current_user=current_user, conn=conn)


@compat_router.get("/badge-summary")
async def compat_isn_notification_badge_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_badge_summary(current_user=current_user, conn=conn)


@compat_router.get("/items")
async def compat_isn_notification_items(
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_items(limit=limit, current_user=current_user, conn=conn)
