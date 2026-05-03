from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from services.operational_intelligence_service import build_operational_intelligence

router = APIRouter(prefix="/os", tags=["operational-intelligence"])


@router.get("/intelligence/{scope}")
def get_operational_intelligence(
    scope: str,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return build_operational_intelligence(
        scope=scope,
        current_user=current_user,
        days=days,
    )
