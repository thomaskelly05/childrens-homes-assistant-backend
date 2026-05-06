from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection

router = APIRouter(tags=["home-selector"])


def _fallback_home(current_user: dict[str, Any]) -> list[dict[str, Any]]:
    home_id = current_user.get("home_id") or current_user.get("selected_home_id") or 1
    return [{"id": home_id, "home_id": home_id, "name": current_user.get("home_name") or "Main home", "status": "active"}]


@router.get("/homes")
def list_homes(current_user: dict[str, Any] = Depends(get_current_user)):
    """Safe OS home selector endpoint.

    Attempts common home table names and gracefully falls back to the user's
    current home context so the workspace gate always remains usable.
    """
    conn = None
    try:
        conn = get_db_connection()
        provider_id = current_user.get("provider_id") or current_user.get("providerId")
        home_id = current_user.get("home_id") or current_user.get("selected_home_id")
        role = str(current_user.get("role") or "").lower()
        rows: list[dict[str, Any]] = []
        for table in ["homes", "care_homes", "children_homes"]:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (table,))
                    exists_row = cur.fetchone()
                    exists = exists_row.get("exists") if isinstance(exists_row, dict) else exists_row and exists_row[0]
                    if not exists:
                        continue
                    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table,))
                    cols = {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}
                    id_col = "id" if "id" in cols else "home_id" if "home_id" in cols else None
                    name_col = "name" if "name" in cols else "home_name" if "home_name" in cols else "title" if "title" in cols else None
                    if not id_col or not name_col:
                        continue
                    where = []
                    params: list[Any] = []
                    if role not in {"admin", "administrator", "super_admin", "provider_admin", "ri", "responsible_individual"} and home_id and id_col in cols:
                        where.append(f'"{id_col}" = %s')
                        params.append(home_id)
                    elif provider_id and "provider_id" in cols:
                        where.append("provider_id = %s")
                        params.append(provider_id)
                    where_sql = "WHERE " + " AND ".join(where) if where else ""
                    status_sql = ", status" if "status" in cols else ""
                    cur.execute(f'SELECT "{id_col}" AS id, "{name_col}" AS name{status_sql} FROM public."{table}" {where_sql} ORDER BY "{name_col}" ASC LIMIT 100', tuple(params))
                    rows = [dict(row) for row in cur.fetchall()]
                    if rows:
                        return {"ok": True, "homes": rows, "items": rows, "fallback": False}
            except Exception:
                continue
        rows = _fallback_home(current_user)
        return {"ok": True, "homes": rows, "items": rows, "fallback": True}
    except Exception as exc:
        rows = _fallback_home(current_user)
        return {"ok": True, "homes": rows, "items": rows, "fallback": True, "warning": str(exc)}
    finally:
        if conn is not None:
            release_db_connection(conn)
