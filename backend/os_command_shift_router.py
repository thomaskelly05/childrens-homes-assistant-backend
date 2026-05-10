from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Shift Board'])


class ShiftStartPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    shift_date: str | None = None
    shift_type: str = 'day'
    shift_lead_staff_id: int | None = None


class ShiftTaskCompletePayload(BaseModel):
    completion_note: str | None = None


class ShiftBoardRow(BaseModel):
    shift_session_id: str
    provider_id: int | None = None
    home_id: int
    shift_date: str
    shift_type: str
    shift_status: str
    shift_lead_user_id: int | None = None
    shift_lead_staff_id: int | None = None
    started_at: str | None = None
    ended_at: str | None = None
    open_tasks: int = 0
    critical_tasks: int = 0
    high_tasks: int = 0
    overdue_tasks: int = 0
    handover_items: int = 0
    follow_up_items: int = 0
    shift_state: str


class ShiftTaskRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    shift_session_id: str | None = None
    command_item_id: str | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    title: str
    summary: str | None = None
    priority: str
    status: str
    due_at: str | None = None
    assigned_to_user_id: int | None = None
    assigned_to_staff_id: int | None = None
    completed_by: int | None = None
    completed_at: str | None = None
    created_at: str
    task_state: str


class ShiftBoardResponse(BaseModel):
    shifts: list[ShiftBoardRow]
    tasks: list[ShiftTaskRow]


@router.get('/os-command/shift-board', response_model=ShiftBoardResponse)
async def get_shift_board(
    request: Request,
    home_id: int | None = Query(default=None),
    shift_session_id: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        shifts = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_shift_leader_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::uuid IS NULL OR shift_session_id = $2::uuid)
            ORDER BY
              CASE shift_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
              started_at DESC NULLS LAST
            ''',
            home_id,
            shift_session_id,
        )

        tasks = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_shift_task_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::uuid IS NULL OR shift_session_id = $2::uuid)
              AND status IN ('open','in_progress')
            ORDER BY
              CASE task_state WHEN 'overdue' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
              due_at NULLS LAST,
              created_at DESC
            ''',
            home_id,
            shift_session_id,
        )

    return {'shifts': [dict(r) for r in shifts], 'tasks': [dict(r) for r in tasks]}


@router.post('/os-command/shift-board/start')
async def start_shift(
    payload: ShiftStartPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        shift_id = await conn.fetchval(
            '''
            SELECT public.os_shift_start(
              $1, $2, coalesce($3::date, current_date), $4, $5, $6, $7
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.shift_date,
            payload.shift_type,
            user.id,
            payload.shift_lead_staff_id,
            user.id,
        )

        generated = await conn.fetchval(
            'SELECT public.os_shift_generate_from_commands($1, $2)',
            shift_id,
            user.id,
        )

    return {'id': str(shift_id), 'generated_tasks': generated}


@router.post('/os-command/shift-board/{shift_session_id}/generate')
async def generate_shift_tasks(
    shift_session_id: UUID,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        generated = await conn.fetchval(
            'SELECT public.os_shift_generate_from_commands($1, $2)',
            shift_session_id,
            user.id,
        )

    return {'shift_session_id': str(shift_session_id), 'generated_tasks': generated}


@router.post('/os-command/shift-board/tasks/{task_id}/complete')
async def complete_shift_task(
    task_id: UUID,
    payload: ShiftTaskCompletePayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        completed_id = await conn.fetchval(
            'SELECT public.os_shift_complete_task($1, $2, $3)',
            task_id,
            user.id,
            payload.completion_note,
        )

    return {'id': str(completed_id), 'status': 'completed'}
