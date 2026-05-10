from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.permissions import require_admin
from db.connection import get_db, get_db_connection, release_db_connection

router = APIRouter(prefix="/debug", tags=["debug-health"])


def _debug_enabled() -> bool:
    env = os.getenv("ENV", os.getenv("APP_ENV", "development")).lower()
    return env not in {"production", "prod"} and os.getenv("ENABLE_DEBUG_ROUTES", "false").lower() == "true"


def _require_debug_enabled() -> None:
    if not _debug_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def safe_type(value: Any) -> str:
    return f"{type(value).__module__}.{type(value).__name__}"


def serialise_row(row: Any) -> Any:
    if row is None:
        return None
    if isinstance(row, dict):
        return dict(row)
    return str(row)


@router.get("/health")
async def debug_get_health(current_user=Depends(require_admin)):
    _require_debug_enabled()
    return {"ok": True, "method": "GET", "message": "Debug GET health route is reachable."}


@router.post("/echo")
async def debug_echo(request: Request, current_user=Depends(require_admin)):
    _require_debug_enabled()
    try:
        body = await request.json()
    except Exception:
        body = None
    return {"ok": True, "message": "Echo route reached.", "body": body}


@router.post("/manual-health")
async def debug_manual_health(request: Request, current_user=Depends(require_admin)):
    _require_debug_enabled()
    conn = None
    try:
        try:
            body = await request.json()
        except Exception:
            body = None
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            db_row = cur.fetchone()
        return {
            "ok": True,
            "method": "POST",
            "message": "Manual DB health route reached.",
            "body": body,
            "conn_type": safe_type(conn),
            "conn_closed": bool(getattr(conn, "closed", True)),
            "db_row": serialise_row(db_row),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Debug health check failed")
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/post-health")
async def debug_post_health(
    request: Request,
    current_user=Depends(require_admin),
    conn=Depends(get_db),
):
    _require_debug_enabled()
    try:
        try:
            body = await request.json()
        except Exception:
            body = None
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS ok")
            db_check = cur.fetchone()
        return {
            "ok": True,
            "method": "POST",
            "message": "Debug POST health route is reachable.",
            "body": body,
            "current_user": {
                "id": current_user.get("id"),
                "role": current_user.get("role"),
                "home_id": current_user.get("home_id"),
                "provider_id": current_user.get("provider_id"),
            },
            "conn_type": safe_type(conn),
            "conn_closed": bool(getattr(conn, "closed", True)),
            "db_check": serialise_row(db_check),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Debug post health failed")
