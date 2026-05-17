from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.connect_contracts import ConnectMessageCreate, ConnectMessageUpdate, ConnectThreadCreate
from services.connect_service import ConnectService


router = APIRouter(prefix="/api/connect", tags=["IndiCare Connect"])
ui_router = APIRouter(prefix="/api", tags=["Personalised Today"])


def _service() -> ConnectService:
    return ConnectService()


@router.get("/threads")
def list_threads(
    home_id: int | None = None,
    q: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().list_threads(conn, current_user, home_id=home_id, q=q, limit=limit)


@router.post("/threads")
def create_thread(
    payload: ConnectThreadCreate,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().create_thread(conn, current_user, payload)


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: int,
    limit: int = Query(default=80, ge=1, le=200),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().get_thread(conn, current_user, thread_id=thread_id, limit=limit)


@router.post("/threads/{thread_id}/messages")
def create_message(
    thread_id: int,
    payload: ConnectMessageCreate,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().create_message(conn, current_user, thread_id=thread_id, payload=payload)


@router.patch("/messages/{message_id}")
def update_message(
    message_id: int,
    payload: ConnectMessageUpdate,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().update_message(conn, current_user, message_id=message_id, payload=payload)


@router.post("/messages/{message_id}/read")
def mark_message_read(
    message_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().mark_message_read(conn, current_user, message_id=message_id)


@router.get("/unread")
def unread_connect(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().unread(conn, current_user)


@ui_router.get("/notifications")
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=50, ge=1, le=100),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().notifications(conn, current_user, unread_only=unread_only, limit=limit)


@ui_router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().mark_notification_read(conn, current_user, notification_id=notification_id)


@ui_router.get("/me/today")
def me_today(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().me_today(conn, current_user)


@ui_router.get("/home/today")
def home_today(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().home_today(conn, current_user, home_id=home_id)


@ui_router.get("/handover/today")
def handover_today(
    home_id: int | None = None,
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().handover_today(conn, current_user, home_id=home_id)


@ui_router.get("/dashboard/preferences")
def get_dashboard_preferences(
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().dashboard_preferences(conn, current_user)


@ui_router.patch("/dashboard/preferences")
def save_dashboard_preferences(
    payload: dict[str, Any],
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _service().save_dashboard_preferences(conn, current_user, payload)
