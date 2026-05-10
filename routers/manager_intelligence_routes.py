from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.manager_intelligence_service import ManagerIntelligenceService

router = APIRouter(prefix="/manager/intelligence", tags=["manager-intelligence"])

service = ManagerIntelligenceService()


@router.get("/dashboard")
def manager_dashboard(
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.build_dashboard(current_user=current_user, days=days)
