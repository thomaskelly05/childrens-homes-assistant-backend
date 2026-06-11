"""ORB Residential privacy request routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from auth.permissions import require_founder
from db.connection import get_db
from schemas.orb_privacy import OrbPrivacyRequestCreate
from services.orb_privacy_service import orb_privacy_service

router = APIRouter(prefix="/orb/privacy", tags=["ORB Privacy"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.post("/requests")
async def submit_orb_privacy_request(
    payload: OrbPrivacyRequestCreate,
    conn=Depends(get_db),
    current_user=Depends(require_rich_orb_premium_access),
):
    user_id = int(current_user.get("user_id") or current_user.get("id") or 0)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required")
    try:
        result = orb_privacy_service.submit_request(conn, user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _success(result.model_dump(by_alias=True))


@router.get("/requests/mine")
async def list_my_orb_privacy_requests(
    conn=Depends(get_db),
    current_user=Depends(require_rich_orb_premium_access),
):
    user_id = int(current_user.get("user_id") or current_user.get("id") or 0)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in required")
    rows = orb_privacy_service.list_mine(conn, user_id=user_id)
    return _success([row.model_dump(by_alias=True) for row in rows])


@router.get("/requests/admin")
async def list_orb_privacy_requests_admin(
    conn=Depends(get_db),
    _founder=Depends(require_founder),
    limit: int = Query(default=100, ge=1, le=200),
):
    rows = orb_privacy_service.list_admin(conn, limit=limit)
    return _success(rows)
