from fastapi import APIRouter, Depends
from typing import Any

from auth.dependencies import get_current_user
from services.live_alerts_service import LiveAlertsService

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/home/{home_id}")
def home_alerts(home_id: int, current_user: dict[str, Any] = Depends(get_current_user)):
    return LiveAlertsService().home_alerts(home_id=home_id, current_user=current_user)


@router.get("/me")
def my_alerts(current_user: dict[str, Any] = Depends(get_current_user)):
    return LiveAlertsService().my_alerts(current_user=current_user)
