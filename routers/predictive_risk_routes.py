from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.predictive_risk_service import PredictiveRiskService

router = APIRouter(prefix="/intelligence/predictive", tags=["predictive-risk"])

service = PredictiveRiskService()


@router.get("/child/{young_person_id}")
def child_predictive_risk(
    young_person_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_risk(young_person_id=young_person_id, current_user=current_user, days=days)


@router.get("/home/{home_id}")
def home_predictive_risk(
    home_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.home_risk(home_id=home_id, current_user=current_user, days=days)
