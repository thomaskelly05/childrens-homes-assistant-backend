from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from auth.dependencies import get_current_user
from db.connection import get_db
from schemas.indicare_intelligence import IntelligenceRequest
from services.continuous_intelligence_state_service import continuous_intelligence_state_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE

router = APIRouter(prefix="/intelligence/state", tags=["continuous-intelligence-state"])


class StatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    home_id: int | str | None = None
    child_id: int | str | None = None
    staff_id: int | str | None = None
    date_from: str | None = None
    date_to: str | None = None
    mode: str | None = None
    scope: str = "home"
    records: list[dict[str, Any]] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    days: int = Field(default=30, ge=1, le=365)
    include_live_records: bool = True
    force_refresh: bool = False


def _build_request(payload: StatePayload) -> IntelligenceRequest:
    return IntelligenceRequest(
        home_id=payload.home_id,
        child_id=payload.child_id,
        staff_id=payload.staff_id,
        date_from=payload.date_from,
        date_to=payload.date_to,
        mode=payload.mode,  # type: ignore[arg-type]
        scope=payload.scope,  # type: ignore[arg-type]
        records=payload.records,
        context=payload.context,
        days=payload.days,
        include_live_records=payload.include_live_records,
        use_snapshot_cache=True,
    )


@router.get("/health")
def continuous_state_health(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "status": "ready",
            "service": "continuous_intelligence_state",
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            "human_review_required": True,
            "user_id": current_user.get("id") or current_user.get("user_id"),
        },
    }


@router.post("/build")
def build_continuous_state(
    payload: StatePayload,
    current_user: dict[str, Any] = Depends(get_current_user),
    conn=Depends(get_db),
):
    request = _build_request(payload)
    data = continuous_intelligence_state_service.build_state(
        request,
        conn=conn,
        current_user=current_user,
        force_refresh=payload.force_refresh,
    )
    return {"success": True, "data": data}
