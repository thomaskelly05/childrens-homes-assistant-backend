"""OS scope selection — lightweight home/child workspace gate."""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth.dependencies import get_current_user
from db.connection import DatabaseUnavailableError
from schemas.os_scope import OsScopeMenuSummary, OsScopeSelectRequest, OsScopeState, OsScopeType, empty_scope_state, scope_state_to_dict
from services.os_scope_service import os_scope_service

logger = logging.getLogger("indicare.os_scope")

router = APIRouter(prefix="/api/os/scope", tags=["OS Scope"])
compat_router = APIRouter(prefix="/api/os", tags=["OS Scope"])


def _user_dict(current_user: Any) -> dict[str, Any]:
    if isinstance(current_user, dict):
        return current_user
    return dict(current_user)


def _success(data: Any) -> dict[str, Any]:
    if isinstance(data, OsScopeState):
        return {"ok": True, "data": scope_state_to_dict(data)}
    if isinstance(data, OsScopeMenuSummary):
        return {"ok": True, "data": data.model_dump()}
    return {"ok": True, "data": data}


def _degraded_scope_state(message: str) -> OsScopeState:
    return empty_scope_state(
        warnings=[message or "Home and child list unavailable. Retry shortly."],
        degraded=True,
    )


@router.get("/options")
async def scope_options(
    request: Request,
    home_id: int | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    started = time.perf_counter()
    state: OsScopeState
    try:
        state = os_scope_service.get_options(user, request.session, home_id=home_id)
    except DatabaseUnavailableError as exc:
        state = _degraded_scope_state(str(exc) or "Home and child list unavailable. Retry shortly.")
    except Exception as exc:
        logger.warning("os_scope_options_failed user_id=%s error=%s", user.get("id"), exc)
        state = _degraded_scope_state("Home and child list unavailable. Retry shortly.")

    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "os_scope_options endpoint total_ms=%.1f user_id=%s home_count=%s child_count=%s degraded=%s warning_count=%s",
        elapsed_ms,
        user.get("id"),
        len(state.available_homes or []),
        len(state.available_children or state.available_children_for_home or []),
        state.degraded,
        len(state.warnings or []),
    )
    return _success(state)


@router.get("/current")
async def scope_current(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    try:
        state = os_scope_service.get_current(user, request.session)
        return _success(state)
    except DatabaseUnavailableError as exc:
        state = _degraded_scope_state(str(exc) or "Database busy — current scope unavailable.")
        return _success(state)
    except Exception as exc:
        state = OsScopeState(
            scope_type="none",
            warnings=[f"Scope session could not be loaded: {exc}"],
            degraded=True,
        )
        return _success(state)


@router.post("/select")
async def scope_select(
    request: Request,
    payload: OsScopeSelectRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user = _user_dict(current_user)
    try:
        state = os_scope_service.select_scope(user, request.session, payload)
        return _success(state)
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
    return _success(state)


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
        return _success(summary)
    except DatabaseUnavailableError as exc:
        summary = OsScopeMenuSummary(
            scope_type=scope_type if scope_type in {"none", "home", "child"} else "none",
            home_id=home_id,
            child_id=child_id,
            warnings=[str(exc) or "Database busy — menu summary degraded."],
            degraded=True,
            cache_status="fast_empty",
        )
        return _success(summary)
    except Exception as exc:
        summary = OsScopeMenuSummary(
            scope_type="none",
            warnings=[f"Menu summary unavailable: {exc}"],
            degraded=True,
            cache_status="fast_empty",
        )
        return _success(summary)
