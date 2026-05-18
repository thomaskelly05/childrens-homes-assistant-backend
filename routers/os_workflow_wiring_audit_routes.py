from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from db.connection import get_db_connection, release_db_connection
from services.gold_standard_workflow_audit_service import audit_daily_note_gold_standard
from services.os_workflow_wiring_audit_service import audit_workflow_contracts

router = APIRouter(prefix="/api/admin/os-wiring", tags=["OS Workflow Wiring"])


@router.get("")
def get_os_workflow_wiring(request: Request) -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            return audit_workflow_contracts(app=request.app, cursor=cursor)
    except Exception as error:
        return {"ok": False, "status": "error", "message": str(error)}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get("/gold-standard")
def get_daily_note_gold_standard_wiring(request: Request) -> dict[str, Any]:
    return audit_daily_note_gold_standard(app=request.app)


@router.get("/health")
def get_os_workflow_wiring_health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "os-workflow-wiring-audit",
        "endpoint": "/api/admin/os-wiring",
        "gold_standard_endpoint": "/api/admin/os-wiring/gold-standard",
    }
