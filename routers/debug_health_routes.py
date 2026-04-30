from __future__ import annotations

import traceback
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from auth.current_user import get_current_user
from db.connection import get_db, get_db_connection, release_db_connection


router = APIRouter(prefix="/debug", tags=["debug-health"])


def safe_type(value: Any) -> str:
    return f"{type(value).__module__}.{type(value).__name__}"


def serialise_row(row: Any) -> Any:
    if row is None:
        return None
    if isinstance(row, dict):
        return dict(row)
    return str(row)


@router.get("/health")
async def debug_get_health():
    return {
        "ok": True,
        "method": "GET",
        "message": "Debug GET health route is reachable.",
    }


@router.post("/echo")
async def debug_echo(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = None

    return {
        "ok": True,
        "message": "Echo route reached without auth/db dependencies.",
        "body": body,
    }


@router.post("/manual-health")
async def debug_manual_health(request: Request):
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

    except Exception as error:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error_type": type(error).__name__,
                "error": str(error),
                "traceback": traceback.format_exc(),
            },
        )

    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/post-health")
async def debug_post_health(
    request: Request,
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
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
            "current_user_type": safe_type(current_user),
            "current_user": {
                "id": current_user.get("id"),
                "user_id": current_user.get("user_id"),
                "email": current_user.get("email"),
                "role": current_user.get("role"),
                "home_id": current_user.get("home_id"),
                "provider_id": current_user.get("provider_id"),
                "allowed_home_ids": current_user.get("allowed_home_ids"),
            },
            "conn_type": safe_type(conn),
            "conn_closed": bool(getattr(conn, "closed", True)),
            "db_check": serialise_row(db_check),
        }

    except Exception as error:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error_type": type(error).__name__,
                "error": str(error),
                "traceback": traceback.format_exc(),
            },
        )
