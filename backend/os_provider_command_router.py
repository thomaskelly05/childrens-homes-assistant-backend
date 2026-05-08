from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Provider Command Centre'])


class ProviderCommandCentreRow(BaseModel):
    id: str
    provider_id: int | None = None
    snapshot_at: str
    total_homes: int
    urgent_homes: int
    critical_commands: int
    immediate_actions: int
    active_missing_episodes: int
    overdue_reg40_count: int
    high_risk_patterns: int
    critical_risk_snapshots: int
    low_resilience_homes: int
    inspection_urgent_homes: int
    average_quality_score: float | None = None
    average_resilience_score: float | None = None
    command_summary: dict = {}
    safeguarding_summary: dict = {}
    inspection_summary: dict = {}
    workforce_summary: dict = {}
    leadership_recommendations: list = []
    created_at: str
    provider_state: str


class ProviderHomeMatrixRow(BaseModel):
    provider_id: int | None = None
    home_id: int
    open_commands: int = 0
    critical_commands: int = 0
    overdue_commands: int = 0
    safeguarding_pressure: int = 0
    quality_pressure: int = 0
    oversight_state: str | None = None
    readiness_state: str | None = None
    resilience_state: str | None = None
    risk_level: str | None = None
    immediate_actions: int = 0
    today_actions: int = 0
    quality_score: float = 0
    matrix_state: str


class ProviderCommandCentreResponse(BaseModel):
    command_centre: list[ProviderCommandCentreRow]
    home_matrix: list[ProviderHomeMatrixRow]


class GenerateProviderSnapshotPayload(BaseModel):
    provider_id: int | None = None


@router.get('/os-command/provider-command-centre', response_model=ProviderCommandCentreResponse)
async def get_provider_command_centre(
    request: Request,
    provider_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        command_centre = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_provider_command_centre
            WHERE ($1::int4 IS NULL OR provider_id = $1)
            ORDER BY
              CASE provider_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'monitor' THEN 2 ELSE 3 END,
              created_at DESC
            ''',
            provider_id,
        )

        matrix = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_provider_home_command_matrix
            WHERE ($1::int4 IS NULL OR provider_id = $1)
            ORDER BY
              CASE matrix_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'workforce_pressure' THEN 2 ELSE 3 END,
              critical_commands DESC,
              immediate_actions DESC,
              overdue_commands DESC
            ''',
            provider_id,
        )

    return {
        'command_centre': [dict(r) for r in command_centre],
        'home_matrix': [dict(r) for r in matrix],
    }


@router.post('/os-command/provider-command-centre/generate')
async def generate_provider_command_snapshot(
    payload: GenerateProviderSnapshotPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        snapshot_id = await conn.fetchval(
            'SELECT public.os_generate_provider_command_snapshot($1, $2)',
            payload.provider_id,
            user.id,
        )

    return {'id': str(snapshot_id), 'status': 'generated'}
