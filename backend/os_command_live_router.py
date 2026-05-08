from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Live'])


class LiveEvent(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    event_type: str
    entity_table: str
    entity_id: str
    title: str
    payload: dict[str, Any] = {}
    visible_to_roles: list[str] = []
    created_by: int | None = None
    created_at: str


@router.get('/os-command/live-events', response_model=list[LiveEvent])
async def get_live_events(
    request: Request,
    home_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_live_event_stream
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY created_at DESC
            LIMIT $2
            ''',
            home_id,
            limit,
        )

    return [dict(r) for r in rows]


@router.websocket('/ws/os-command')
async def os_command_websocket(websocket: WebSocket, home_id: int | None = None):
    await websocket.accept()

    pool = getattr(websocket.app.state, 'db_pool', None)
    if pool is None:
        await websocket.send_json({'type': 'error', 'message': 'Database pool not configured'})
        await websocket.close(code=1011)
        return

    # This implementation polls the live event table so it works with common asyncpg pools.
    # The database migration also emits pg_notify('os_command_events', ...), so this can be
    # upgraded to LISTEN/NOTIFY without changing the frontend contract.
    last_seen: str | None = None

    try:
      while True:
        async with pool.acquire() as conn:
          rows = await conn.fetch(
              '''
              SELECT *
              FROM public.vw_os_live_event_stream
              WHERE ($1::int4 IS NULL OR home_id = $1)
                AND ($2::uuid IS NULL OR id <> $2::uuid)
              ORDER BY created_at DESC
              LIMIT 25
              ''',
              home_id,
              last_seen,
          )

        events = [dict(r) for r in rows]
        if events:
            last_seen = str(events[0]['id'])
            await websocket.send_json({'type': 'events', 'events': events})

        await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
    except Exception as exc:
        await websocket.send_json({'type': 'error', 'message': str(exc)})
        await websocket.close(code=1011)
