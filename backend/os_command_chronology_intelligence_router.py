from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Chronology Intelligence'])


class ChronologyIntelligenceRow(BaseModel):
    chronology_event_id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    event_type: str
    event_title: str
    event_summary: str | None = None
    event_at: str
    source_table: str | None = None
    source_id: int | None = None
    command_item_id: str | None = None
    sccif_area: str | None = None
    regulation_refs: list[str] = []
    visibility: str
    is_sensitive: bool
    overlays: list[dict[str, Any]] = []
    overlay_count: int = 0
    max_overlay_severity_rank: int | None = None


class GenerateOverlaysPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None


@router.get('/os-command/chronology-intelligence', response_model=list[ChronologyIntelligenceRow])
async def get_chronology_intelligence(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    overlay_type: str | None = Query(default=None),
    sccif_area: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_chronology_intelligence
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR sccif_area = $3)
              AND (
                $4::text IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(overlays) overlay
                  WHERE overlay->>'overlay_type' = $4
                )
              )
            ORDER BY
              coalesce(max_overlay_severity_rank, 0) DESC,
              event_at DESC
            LIMIT $5
            ''',
            home_id,
            young_person_id,
            sccif_area,
            overlay_type,
            limit,
        )

    return [dict(r) for r in rows]


@router.post('/os-command/chronology-intelligence/generate')
async def generate_chronology_overlays(
    payload: GenerateOverlaysPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        generated = await conn.fetchval(
            '''
            SELECT public.os_generate_chronology_overlays($1, $2, $3, $4)
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            user.id,
        )

    return {'generated': generated}
