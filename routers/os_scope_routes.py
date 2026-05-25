"""OS scope selection — lightweight home/child workspace gate."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth.dependencies import get_current_user
from db.connection import DatabaseUnavailableError
from schemas.os_scope import OsScopeMenuSummary, OsScopeSelectRequest, OsScopeState, OsScopeType
from services.os_scope_service import os_scope_service

router = APIRouter(prefix="/api/os/scope", tags=["OS Scope"])
compat_router = APIRouter(prefix="/api/os", tags=["OS Scope"])


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


def _success(data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


@router.get("/options")
async def scope_options(
    request: Request,
    home_id: int | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    try:
        state = os_scope_service.get_options(user, request.session, home_id=home_id)
        return _success(state.model_dump())
    except DatabaseUnavailableError as exc:
        state = OsScopeState(
            scope_type="none",
            warnings=[str(exc) or "Database busy — scope selector degraded."],
            degraded=True,
            available_homes=[],
        )
        return _success(state.model_dump())


@router.get("/current")
async def scope_current(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    try:
        state = os_scope_service.get_current(user, request.session)
        return _success(state.model_dump())
    except DatabaseUnavailableError as exc:
        state = OsScopeState(
            scope_type="none",
            warnings=[str(exc) or "Database busy — current scope unavailable."],
            degraded=True,
        )
        return _success(state.model_dump())
    except Exception as exc:
        state = OsScopeState(
            scope_type="none",
            warnings=[f"Scope session could not be loaded: {exc}"],
            degraded=True,
        )
        return _success(state.model_dump())


@router.post("/select")
async def scope_select(
    request: Request,
    payload: OsScopeSelectRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    try:
        state = os_scope_service.select_scope(user, request.session, payload)
        return _success(state.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/clear")
async def scope_clear(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    os_scope_service.clear_scope(request.session)
    state = os_scope_service.get_current(user, request.session)
    return _success(state.model_dump())


@compat_router.get("/menu-summary")
async def menu_summary(
    request: Request,
    home_id: int | None = Query(None),
    child_id: int | None = Query(None),
    scope_type: OsScopeType = Query("none"),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    _ = request
    user = _user_dict(current_user)
    if scope_type == "none" and not home_id and not child_id:
        current = os_scope_service.get_current(user, request.session)
        scope_type = current.scope_type
        home_id = home_id or current.selected_home_id
        child_id = child_id or current.selected_child_id
    try:
        summary = os_scope_service.menu_summary(
            user,
            scope_type=scope_type,
            home_id=home_id,
            child_id=child_id,
        )
        return _success(summary.model_dump())
    except DatabaseUnavailableError as exc:
        summary = OsScopeMenuSummary(
            scope_type=scope_type if scope_type in {"none", "home", "child"} else "none",
            home_id=home_id,
            child_id=child_id,
            warnings=[str(exc) or "Database busy — menu summary degraded."],
            degraded=True,
            cache_status="fast_empty",
        )
        return _success(summary.model_dump())
    except Exception as exc:
        summary = OsScopeMenuSummary(
            scope_type="none",
            warnings=[f"Menu summary unavailable: {exc}"],
            degraded=True,
            cache_status="fast_empty",
        )
        return _success(summary.model_dump())
