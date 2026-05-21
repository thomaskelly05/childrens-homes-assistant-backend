from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from db.connection import get_db_connection, release_db_connection
from services.gold_standard_workflow_audit_service import audit_daily_note_gold_standard
from services.os_workflow_wiring_audit_service import audit_workflow_contracts
from services.platform_operational_integrity_service import platform_operational_integrity_service

router = APIRouter(prefix="/api/admin/os-wiring", tags=["OS Workflow Wiring"])
compat_router = APIRouter(prefix="/api/os-command", tags=["OS Command Compatibility"])


def _audit(request: Request) -> dict[str, Any]:
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


@router.get("")
def get_os_workflow_wiring(request: Request) -> dict[str, Any]:
    return _audit(request)


@compat_router.get("/workflow-wiring-audit")
def get_os_workflow_wiring_command_alias(request: Request) -> dict[str, Any]:
    return _audit(request)


@router.get("/gold-standard")
def get_daily_note_gold_standard_wiring(request: Request) -> dict[str, Any]:
    return audit_daily_note_gold_standard(app=request.app)


@compat_router.get("/workflow-wiring-audit/gold-standard")
def get_daily_note_gold_standard_wiring_alias(request: Request) -> dict[str, Any]:
    return audit_daily_note_gold_standard(app=request.app)


@router.get("/integrity")
def get_platform_operational_integrity(request: Request) -> dict[str, Any]:
    return platform_operational_integrity_service.audit(app=request.app)


@compat_router.get("/workflow-wiring-audit/integrity")
def get_platform_operational_integrity_alias(request: Request) -> dict[str, Any]:
    return platform_operational_integrity_service.audit(app=request.app)


@router.get("/health")
def get_os_workflow_wiring_health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "os-workflow-wiring-audit",
        "endpoint": "/api/admin/os-wiring",
        "compat_endpoint": "/api/os-command/workflow-wiring-audit",
        "gold_standard_endpoint": "/api/admin/os-wiring/gold-standard",
        "integrity_endpoint": "/api/admin/os-wiring/integrity",
    }


@compat_router.get("/workflow-wiring-audit/health")
def get_os_workflow_wiring_health_alias() -> dict[str, Any]:
    return get_os_workflow_wiring_health()
