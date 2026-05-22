from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.current_user import get_current_user
from db.connection import get_db
from services.operational_feed_service import build_operational_feed

router = APIRouter(prefix="/os/operational-feed", tags=["Operational Feed"])
compat_router = APIRouter(prefix="/api/os-command", tags=["Operational Feed Compatibility"])


@router.get("")
def operational_feed(
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return build_operational_feed(conn, young_person_id=young_person_id, home_id=home_id, limit=limit)


@compat_router.get("/operational-feed")
def operational_feed_compat(
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    _current_user=Depends(get_current_user),
    conn=Depends(get_db),
) -> dict[str, Any]:
    return build_operational_feed(conn, young_person_id=young_person_id, home_id=home_id, limit=limit)
