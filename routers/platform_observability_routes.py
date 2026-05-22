from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.current_user import get_current_user
from db.connection import get_db
from services.platform_health_service import platform_health_service

router = APIRouter(prefix="/os", tags=["Platform Observability"])


@router.get("/platform-health")
def platform_health(_current_user=Depends(get_current_user)) -> dict[str, Any]:
    return platform_health_service.platform_health()


@router.get("/performance-metrics")
def performance_metrics(
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return platform_health_service.performance_metrics(conn=conn)
