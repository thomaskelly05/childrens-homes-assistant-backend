"""ISN notification digest routes — metadata-only operational surfaces."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from urllib.parse import unquote

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.isn_notifications import IsnNotificationActionRequest
from schemas.os_notifications import OsNotificationActionRequest
from services.isn_digest_service import isn_digest_service
from services.isn_notification_lifecycle_service import isn_notification_lifecycle_service
from services.os_notification_state_service import os_notification_state_service

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


def _isn_item_id_from_key(item_id: str) -> str:
    key = unquote(item_id).strip()
    if key.startswith("isn:"):
        return key.split(":", 1)[1]
    return key


@router.post("/action")
async def isn_notification_action_body(
    payload: IsnNotificationActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    item_id = _text(payload.metadata.get("item_id"))
    if not item_id:
        raise HTTPException(status_code=400, detail="metadata.item_id required for ISN action")
    return await _run_isn_action(item_id, payload, current_user, conn)


@router.post("/{item_id:path}/action")
async def isn_notification_action(
    item_id: str,
    payload: IsnNotificationActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await _run_isn_action(item_id, payload, current_user, conn)


async def _run_isn_action(
    item_id: str,
    payload: IsnNotificationActionRequest,
    current_user: dict[str, Any],
    conn: Any,
) -> dict[str, Any]:
    isn_id = _isn_item_id_from_key(item_id)
    os_action = OsNotificationActionRequest(
        action=payload.action,  # type: ignore[arg-type]
        note=payload.note,
        owner_user_id=payload.owner_user_id,
        owner_name=payload.owner_name,
        metadata={
            **payload.metadata,
            "item_type": payload.metadata.get("item_type", "isn_safeguarding_alert"),
        },
    )
    os_notification_state_service.set_state(
        f"isn:{isn_id}",
        os_action,
        current_user,
        source="isn",
        category="safeguarding_network",
        related_id=isn_id,
        item_type=os_action.metadata.get("item_type"),
        conn=conn,
    )
    result = isn_notification_lifecycle_service.apply_action(
        isn_id, os_action, current_user, conn=conn
    )
    return _success(result.model_dump())


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


@compat_router.post("/action")
async def compat_isn_notification_action_body(
    payload: IsnNotificationActionRequest = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_action_body(payload=payload, current_user=current_user, conn=conn)


@compat_router.post("/{item_id:path}/action")
async def compat_isn_notification_action(
    item_id: str,
    payload: IsnNotificationActionRequest = Body(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    return await isn_notification_action(
        item_id=item_id,
        payload=payload,
        current_user=current_user,
        conn=conn,
    )
