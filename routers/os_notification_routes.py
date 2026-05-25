"""Operational notification feed for the existing OS notification bell."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from services.os_notification_adapter_service import os_notification_adapter_service

router = APIRouter(prefix="/api/notifications", tags=["OS Notifications"])
compat_router = APIRouter(prefix="/notifications", tags=["OS Notifications"])


def _success(data: Any) -> dict[str, Any]:
    return {
        "success": True,
        "data": data,
        "operational_only": True,
        "standalone_access": False,
        "metadata_only": True,
    }


@router.get("/operational-feed")
async def operational_notification_feed(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    feed = os_notification_adapter_service.build_feed(
        current_user,
        limit=limit,
        unread_only=unread_only,
        conn=conn,
    )
    return _success(feed.model_dump())


@router.get("/operational-feed/health")
async def operational_notification_feed_health(
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    _ = current_user
    return _success(os_notification_adapter_service.get_health(conn=conn).model_dump())


@compat_router.get("/operational-feed")
async def compat_operational_notification_feed(
    unread_only: bool = False,
    limit: int = Query(30, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await operational_notification_feed(
        unread_only=unread_only,
        limit=limit,
        current_user=current_user,
        conn=conn,
    )
