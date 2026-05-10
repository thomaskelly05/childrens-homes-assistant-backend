from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from services.operational_memory_service import OperationalMemoryService

router = APIRouter(prefix="/operational-memory", tags=["operational-memory"])
service = OperationalMemoryService()


@router.get("/children/{young_person_id}")
def child_memory(
    young_person_id: int,
    days: int = Query(default=5, ge=1, le=31),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_memory(
        young_person_id=young_person_id,
        current_user=current_user,
        days=days,
    )


@router.get("/children/{young_person_id}/summary")
def child_memory_summary(
    young_person_id: int,
    days: int = Query(default=5, ge=1, le=31),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    result = service.child_memory(
        young_person_id=young_person_id,
        current_user=current_user,
        days=days,
    )
    if not result.get("ok"):
        return result
    return {
        "ok": True,
        "young_person_id": young_person_id,
        "days": days,
        "summary": result.get("summary"),
        "metrics": result.get("metrics"),
        "emotional_state": result.get("emotional_state"),
        "risk_state": result.get("risk_state"),
        "next_actions": result.get("next_actions"),
    }
