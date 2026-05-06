from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.proactive_intelligence_service import ProactiveIntelligenceService

router = APIRouter(prefix="/intelligence/proactive", tags=["proactive-intelligence"])

service = ProactiveIntelligenceService()


@router.get("")
def proactive_alerts(
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.build_alerts(current_user=current_user, days=days)
