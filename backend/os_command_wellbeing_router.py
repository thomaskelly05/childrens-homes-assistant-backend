from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Staff Wellbeing'])


class StaffWellbeingRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    staff_id: int
    period_start: str
    period_end: str
    wellbeing_score: float
    burnout_risk_score: float
    risk_level: str
    overtime_hours: float
    sleep_in_count: int
    safeguarding_command_count: int
    critical_command_count: int
    incident_exposure_count: int
    missing_episode_exposure_count: int
    medication_escalation_count: int
    shift_task_count: int
    completed_shift_task_count: int
    rota_instability_score: float
    emotional_load_score: float
    leadership_concern: bool
    recommendations: list = []
    risk_factors: list = []
    created_at: str
    risk_sort: int


class HomeResilienceRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    period_start: str
    period_end: str
    resilience_score: float
    staffing_pressure_score: float
    safeguarding_workforce_pressure: float
    high_risk_staff_count: int
    critical_risk_staff_count: int
    open_workforce_commands: int
    rota_pressure_count: int
    leadership_summary: str | None = None
    recommendations: list = []
    created_at: str
    resilience_state: str


class WellbeingResponse(BaseModel):
    staff: list[StaffWellbeingRow]
    homes: list[HomeResilienceRow]


class GenerateStaffWellbeingPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    staff_id: int
    period_start: str | None = None
    period_end: str | None = None


class GenerateHomeResiliencePayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    period_start: str | None = None
    period_end: str | None = None


@router.get('/os-command/staff-wellbeing', response_model=WellbeingResponse)
async def get_staff_wellbeing(
    request: Request,
    home_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        staff_rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_staff_wellbeing_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR staff_id = $2)
              AND ($3::text IS NULL OR risk_level = $3)
            ORDER BY risk_sort, burnout_risk_score DESC, created_at DESC
            LIMIT 500
            ''',
            home_id,
            staff_id,
            risk_level,
        )

        home_rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_home_resilience_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY
              CASE resilience_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              resilience_score ASC
            LIMIT 200
            ''',
            home_id,
        )

    return {'staff': [dict(r) for r in staff_rows], 'homes': [dict(r) for r in home_rows]}


@router.post('/os-command/staff-wellbeing/generate-staff')
async def generate_staff_wellbeing(
    payload: GenerateStaffWellbeingPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        snapshot_id = await conn.fetchval(
            '''
            SELECT public.os_generate_staff_wellbeing_snapshot(
              $1, $2, $3, $4::date, $5::date, $6
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.staff_id,
            payload.period_start,
            payload.period_end,
            user.id,
        )

    return {'id': str(snapshot_id), 'status': 'generated'}


@router.post('/os-command/staff-wellbeing/generate-home')
async def generate_home_resilience(
    payload: GenerateHomeResiliencePayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        snapshot_id = await conn.fetchval(
            '''
            SELECT public.os_generate_home_resilience_snapshot(
              $1, $2, $3::date, $4::date, $5
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.period_start,
            payload.period_end,
            user.id,
        )

    return {'id': str(snapshot_id), 'status': 'generated'}
