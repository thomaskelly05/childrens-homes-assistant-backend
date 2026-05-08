from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Chronology'])


class ChronologyEvent(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    event_type: str
    event_title: str
    event_summary: str | None = None
    event_at: str
    source_table: str | None = None
    source_id: int | None = None
    command_item_id: str | None = None
    sccif_area: str | None = None
    regulation_refs: list[str] = []
    evidence_refs: list[dict[str, Any]] = []
    visibility: str
    is_sensitive: bool
    created_by: int | None = None
    created_at: str
    metadata: dict[str, Any] = {}


class CreateChronologyEventPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    staff_id: int | None = None
    event_type: str
    event_title: str
    event_summary: str | None = None
    event_at: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    command_item_id: str | None = None
    sccif_area: str | None = None
    regulation_refs: list[str] = []
    evidence_refs: list[dict[str, Any]] = []
    visibility: str = 'manager'
    is_sensitive: bool = False
    metadata: dict[str, Any] = {}


@router.get('/os-command/chronology', response_model=list[ChronologyEvent])
async def get_chronology(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    event_type: str | None = Query(default=None),
    sccif_area: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT id, provider_id, home_id, young_person_id, staff_id, event_type, event_title,
                   event_summary, event_at, source_table, source_id, command_item_id, sccif_area,
                   regulation_refs, evidence_refs, visibility, is_sensitive, created_by, created_at, metadata
            FROM public.os_chronology_events
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR event_type = $3)
              AND ($4::text IS NULL OR sccif_area = $4)
            ORDER BY event_at DESC, created_at DESC
            LIMIT $5
            ''',
            home_id,
            young_person_id,
            event_type,
            sccif_area,
            limit,
        )

    return [dict(r) for r in rows]


@router.post('/os-command/chronology')
async def create_chronology_event(
    payload: CreateChronologyEventPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        event_id = await conn.fetchval(
            '''
            SELECT public.os_chronology_add_event(
              $1, $2, $3, $4, $5, $6, $7, coalesce($8::timestamptz, now()),
              $9, $10, $11::uuid, $12, $13::text[], $14::jsonb, $15, $16, $17, $18::jsonb
            )
            ''',
            payload.event_type,
            payload.event_title,
            payload.event_summary,
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            payload.staff_id,
            payload.event_at,
            payload.source_table,
            payload.source_id,
            payload.command_item_id,
            payload.sccif_area,
            payload.regulation_refs,
            payload.evidence_refs,
            payload.visibility,
            payload.is_sensitive,
            user.id,
            payload.metadata,
        )

    return {'id': str(event_id), 'status': 'created'}


@router.get('/os-command/chronology/evidence-pack')
async def get_chronology_evidence_pack(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_command_evidence_pack
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
            ORDER BY created_at DESC
            LIMIT 500
            ''',
            home_id,
            young_person_id,
        )

    return [dict(r) for r in rows]
