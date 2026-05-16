from __future__ import annotations

from collections.abc import Generator
from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from services.realtime_replay_service import realtime_replay_service

router = APIRouter(prefix="/api/realtime", tags=["realtime-replay"])


def _db() -> Generator[Any, None, None]:
    from db.connection import get_db

    yield from get_db()


@router.get("/replay")
def replay_realtime_events(
    home_id: int = Query(...),
    provider_id: int | None = Query(default=None),
    after_cursor: int | None = Query(default=None),
    since: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
    conn: Any = Depends(_db),
) -> dict[str, Any]:
    return realtime_replay_service.replay(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
        entity_type=entity_type,
        entity_id=entity_id,
        after_cursor=after_cursor,
        since=since,
        limit=limit,
    )
