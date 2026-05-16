from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from services.realtime_event_bus import realtime_event_bus

router = APIRouter(prefix="/api/realtime", tags=["realtime-replay"])


@router.get("/replay")
def replay_realtime_events(
    home_id: int = Query(...),
    after_cursor: int | None = Query(default=None),
    since: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return realtime_event_bus.replay_for_user(
        current_user=current_user,
        home_id=home_id,
        after_cursor=after_cursor,
        since=since,
        limit=limit,
    )
