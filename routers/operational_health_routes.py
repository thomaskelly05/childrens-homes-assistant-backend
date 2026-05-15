from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.permissions import require_admin
from db.connection import get_db
from services.export_worker_service import export_worker_service
from services.intelligence_cache_service import intelligence_cache_service
from services.operational_metrics_service import operational_metrics_service
from services.operational_queue_service import operational_queue_service
from services.realtime_recovery_service import realtime_recovery_service

router = APIRouter(prefix="/internal/operational-health", tags=["operational-health"])


@router.get("")
def operational_health(conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {
        "ok": True,
        "audience": "internal_admin_only",
        "queue_health": operational_queue_service.health(conn),
        "export_health": export_worker_service.health(conn),
        "websocket_health": realtime_recovery_service.websocket_health(),
        "autosave_health": operational_metrics_service.health_summary()["autosave_health"],
        "reconnect_metrics": operational_metrics_service.health_summary()["websocket_health"],
        "latency_metrics": operational_metrics_service.health_summary()["latency_metrics"],
        "cache_invalidation": intelligence_cache_service.invalidation_health(),
    }
