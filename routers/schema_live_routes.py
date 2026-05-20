from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/schema-live", tags=["Schema Live"])


@router.get("/health")
def schema_live_health() -> dict:
    return {
        "ok": True,
        "module": "schema_live",
        "status": "mounted",
        "message": "Schema Live compatibility router loaded successfully.",
    }


@router.get("/overview")
def schema_live_overview() -> dict:
    return {
        "ok": True,
        "platform": "IndiCare",
        "schema": {
            "children": "active",
            "workforce": "active",
            "governance": "active",
            "inspection": "active",
            "documents": "active",
            "assistant": "active",
        },
        "source_of_truth": "postgres_operational_schema",
        "live_schema_audit": "/api/os-command/schema-audit",
        "workflow_wiring_audit": "/api/admin/os-wiring",
    }
