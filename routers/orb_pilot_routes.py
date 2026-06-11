"""ORB Residential closed-pilot feedback routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from auth.permissions import require_founder
from db.connection import get_db
from schemas.orb_pilot import OrbPilotFeedbackCreate
from services.orb_pilot_service import orb_pilot_service

router = APIRouter(prefix="/orb/pilot", tags=["ORB Pilot"])


def _success(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


@router.post("/feedback")
async def submit_orb_pilot_feedback(
    payload: OrbPilotFeedbackCreate,
    conn=Depends(get_db),
    current_user=Depends(require_rich_orb_premium_access),
):
    user_id = int(current_user.get("user_id") or current_user.get("id") or 0) or None
    role = current_user.get("role") if isinstance(current_user.get("role"), str) else None
    try:
        result = orb_pilot_service.submit_feedback(conn, user_id=user_id, role=role, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _success(result.model_dump(by_alias=True))


@router.get("/feedback/admin")
async def list_orb_pilot_feedback_admin(
    conn=Depends(get_db),
    _founder=Depends(require_founder),
    limit: int = Query(default=200, ge=1, le=500),
):
    rows = orb_pilot_service.list_admin(conn, limit=limit)
    return _success([row.model_dump(by_alias=True) for row in rows])


@router.get("/summary/admin")
async def orb_pilot_summary_admin(
    conn=Depends(get_db),
    _founder=Depends(require_founder),
):
    summary = orb_pilot_service.build_summary(conn)
    return _success(summary)
