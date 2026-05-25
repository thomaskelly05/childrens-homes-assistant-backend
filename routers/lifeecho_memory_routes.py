"""LifeEcho memory and suggestion routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.lifeecho import LifeEchoMemoryFilter, LifeEchoUploadRequest
from services.lifeecho_memory_service import lifeecho_memory_service

router = APIRouter(prefix="/lifeecho-memories", tags=["LifeEcho Memories"])
compat_router = APIRouter(prefix="/api/lifeecho-memories", tags=["LifeEcho Memories API"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data, "operational_only": True, "standalone_access": False}


@router.get("/{child_id}")
async def list_lifeecho(
    child_id: int,
    include_suggestions: bool = True,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = LifeEchoMemoryFilter(child_id=child_id, include_suggestions=include_suggestions)
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    return _success(lifeecho_memory_service.list_for_child(filters, user, conn=conn).model_dump())


@compat_router.get("/{child_id}")
async def api_list_lifeecho(child_id: int, **kwargs):
    return await list_lifeecho(child_id=child_id, **kwargs)


@router.post("/{child_id}/upload")
async def upload_lifeecho(
    child_id: int,
    request: LifeEchoUploadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    memory = lifeecho_memory_service.upload_memory(child_id, request, user, conn=conn)
    return _success(memory.model_dump())


@compat_router.post("/{child_id}/upload")
async def api_upload_lifeecho(child_id: int, request: LifeEchoUploadRequest, **kwargs):
    return await upload_lifeecho(child_id=child_id, request=request, **kwargs)


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_lifeecho_suggestion(
    suggestion_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    memory = lifeecho_memory_service.approve_suggestion(suggestion_id, user, conn=conn)
    if not memory:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return _success(memory.model_dump())


@compat_router.post("/suggestions/{suggestion_id}/approve")
async def api_approve_lifeecho(suggestion_id: str, **kwargs):
    return await approve_lifeecho_suggestion(suggestion_id=suggestion_id, **kwargs)


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_lifeecho_suggestion(
    suggestion_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    user = current_user if isinstance(current_user, dict) else dict(current_user)
    suggestion = lifeecho_memory_service.reject_suggestion(suggestion_id, user, conn=conn)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return _success(suggestion.model_dump())


@compat_router.post("/suggestions/{suggestion_id}/reject")
async def api_reject_lifeecho(suggestion_id: str, **kwargs):
    return await reject_lifeecho_suggestion(suggestion_id=suggestion_id, **kwargs)
