from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.permissions import require_admin
from core.router_loader import ROUTER_GROUPS, ROUTERS, get_router_registry_summary
from db.connection import get_db, get_db_connection, get_db_status, release_db_connection
from middleware.security_middleware import _csp_mode
from services.orb_build_version import (
    ORB_ACCESS_CONTRACT_VERSION,
    ORB_FRONT_DOOR_CONTRACT_VERSION,
    get_backend_build_marker,
    get_environment_name,
    get_frontend_build_marker,
)
from utils.orb_route_introspection import orb_route_audit_summary

router = APIRouter(prefix="/orb/debug", tags=["ORB Debug"])


def _debug_enabled() -> bool:
    env = get_environment_name()
    if env in {"production", "prod"}:
        return os.getenv("ENABLE_ORB_DEBUG_ROUTES", "false").lower() == "true"
    return os.getenv("ENABLE_ORB_DEBUG_ROUTES", "true").lower() != "false"


def _require_debug_access(current_user=Depends(require_admin)) -> dict[str, Any]:
    if not _debug_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return current_user


def _ai_usage_audit_reachable() -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'ai_usage_audit'
                ) AS table_exists
                """
            )
            row = cur.fetchone()
        return {"reachable": True, "table_exists": bool(row[0] if row else False)}
    except Exception as exc:
        return {"reachable": False, "error": exc.__class__.__name__}
    finally:
        if conn is not None:
            release_db_connection(conn)


def _migration_status(conn) -> dict[str, Any]:
    tables = ("ai_usage_audit", "provider_ai_settings")
    summary: dict[str, Any] = {}
    with conn.cursor() as cur:
        for table in tables:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                )
                """,
                (table,),
            )
            row = cur.fetchone()
            summary[table] = bool(row[0] if row else False)
    return summary


@router.get("/deployment-state")
async def orb_deployment_state(
    request: Request,
    conn=Depends(get_db),
    _admin=Depends(_require_debug_access),
):
    from app import app as fastapi_app

    route_audit = orb_route_audit_summary(fastapi_app)
    return {
        "success": True,
        "data": {
            "environment": get_environment_name(),
            "backend_build": get_backend_build_marker(),
            "frontend_build_expected": get_frontend_build_marker(),
            "contract_versions": {
                "front_door": ORB_FRONT_DOOR_CONTRACT_VERSION,
                "access": ORB_ACCESS_CONTRACT_VERSION,
            },
            "router_registry": get_router_registry_summary(),
            "enabled_route_modules": list(ROUTERS),
            "router_groups": [group.name for group in ROUTER_GROUPS],
            "orb_route_audit": route_audit,
            "database": get_db_status(),
            "ai_usage_audit": _ai_usage_audit_reachable(),
            "migration_tables": _migration_status(conn),
            "csp_mode": _csp_mode(),
            "rate_limit_mode": os.getenv("ORB_RATE_LIMIT_MODE", os.getenv("RATE_LIMIT_MODE", "enabled")),
        },
    }
