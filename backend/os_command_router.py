from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

router = APIRouter(tags=['OS Command'])

Priority = Literal['critical', 'high', 'medium', 'low', 'info']
Status = Literal['open', 'in_progress', 'waiting', 'completed', 'dismissed', 'void']


@dataclass
class CurrentUser:
    id: int
    provider_id: int | None = None
    home_ids: list[int] | None = None
    role: str = 'staff'


async def get_current_user() -> CurrentUser:
    raise HTTPException(status_code=500, detail='Wire get_current_user() to your auth system')


def get_pool(request: Request):
    pool = getattr(request.app.state, 'db_pool', None)
    if pool is None:
        raise HTTPException(status_code=500, detail='Database pool not configured')
    return pool


class CommandItem(BaseModel):
    feed_id: str
    command_item_id: UUID | None = None
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    domain: str
    priority: Priority | str
    status: str
    title: str
    summary: str | None = None
    recommended_action: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    due_at: str | None = None
    sccif_area: str | None = None
    regulation_refs: list[str] = []
    evidence_refs: list[dict] = []
    ai_generated: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class CommandSummary(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    critical_count: int
    high_count: int
    overdue_count: int
    safeguarding_count: int
    reg40_count: int
    risk_count: int
    quality_count: int
    open_total: int


class OSCommandResponse(BaseModel):
    summary: list[CommandSummary]
    items: list[CommandItem]


class UpdateCommandPayload(BaseModel):
    status: Status
    decision: str | None = None
    rationale: str | None = None


@router.get('/os-command', response_model=OSCommandResponse)
async def get_os_command(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    domain: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        summary_rows = await conn.fetch(
            'SELECT * FROM public.vw_os_command_summary WHERE ($1::int4 IS NULL OR home_id = $1)',
            home_id,
        )

        item_rows = await conn.fetch(
            'SELECT * FROM public.os_command_live_feed($1, $2, $3, $4, $5)',
            home_id,
            young_person_id,
            domain,
            priority,
            limit,
        )

    return {
        'summary': [dict(r) for r in summary_rows],
        'items': [dict(r) for r in item_rows],
    }


@router.post('/os-command/{feed_id}/capture')
async def capture_feed_item(
    feed_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        item_id = await conn.fetchval(
            'SELECT public.os_command_capture_feed_item($1, $2)',
            feed_id,
            user.id,
        )

    return {'id': str(item_id), 'status': 'open'}


@router.patch('/os-command/items/{item_id}')
async def update_command_item(
    item_id: UUID,
    payload: UpdateCommandPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        exists = await conn.fetchrow(
            'SELECT id FROM public.os_command_items WHERE id = $1',
            item_id,
        )

        if not exists:
            raise HTTPException(status_code=404, detail='Command item not found')

        await conn.execute(
            '''
            UPDATE public.os_command_items
            SET status = $2,
                completed_by = CASE WHEN $2 = 'completed' THEN $3 ELSE completed_by END,
                dismissed_by = CASE WHEN $2 = 'dismissed' THEN $3 ELSE dismissed_by END
            WHERE id = $1
            ''',
            item_id,
            payload.status,
            user.id,
        )

        if payload.decision:
            await conn.execute(
                '''
                INSERT INTO public.os_command_decisions (
                  command_item_id,
                  decision,
                  rationale,
                  decided_by
                ) VALUES ($1, $2, $3, $4)
                ''',
                item_id,
                payload.decision,
                payload.rationale,
                user.id,
            )

    return {'id': str(item_id), 'status': payload.status}
