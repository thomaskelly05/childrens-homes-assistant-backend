from fastapi import APIRouter, Depends
from typing import Any

from auth.dependencies import get_current_user
from services.rm_dashboard_service import RMDashboardService

router = APIRouter(prefix="/rm-dashboard", tags=["rm-dashboard"])


@router.get("/home/{home_id}")
def get_rm_dashboard(home_id: int, current_user: dict[str, Any] = Depends(get_current_user)):
    return RMDashboardService().dashboard(home_id=home_id, current_user=current_user)
