from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Risk Analytics'])


class RiskHeatmapRow(BaseModel):
    home_id: int
    young_person_id: int | None = None
    overall_risk_level: str
    overall_risk_score: float
    safeguarding_score: float
    missing_risk_score: float
    medication_risk_score: float
    workforce_risk_score: float
    compliance_risk_score: float
    inspection_risk_score: float
    ai_summary: str | None = None
    calculated_at: str
    heatmap_colour: str


class CrossHomeTrendRow(BaseModel):
    provider_id: int | None = None
    reporting_week: str
    critical_risk_homes: int
    high_risk_homes: int
    avg_risk_score: float | None = None
    avg_safeguarding_score: float | None = None
    avg_missing_risk_score: float | None = None
    avg_compliance_risk_score: float | None = None
    avg_inspection_risk_score: float | None = None


class GenerateRiskPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None


class RiskAnalyticsResponse(BaseModel):
    heatmap: list[RiskHeatmapRow]
    trends: list[CrossHomeTrendRow]


@router.get('/os-command/risk-analytics', response_model=RiskAnalyticsResponse)
async def get_risk_analytics(
    request: Request,
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        heatmap = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_risk_heatmap
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY
              CASE overall_risk_level
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'moderate' THEN 2
                ELSE 3
              END,
              overall_risk_score DESC
            ''',
            home_id,
        )

        trends = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_cross_home_trends
            WHERE ($1::int4 IS NULL OR provider_id = $1)
            ORDER BY reporting_week DESC
            LIMIT 26
            ''',
            provider_id,
        )

    return {
        'heatmap': [dict(r) for r in heatmap],
        'trends': [dict(r) for r in trends],
    }


@router.post('/os-command/risk-analytics/generate')
async def generate_risk_snapshot(
    payload: GenerateRiskPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        snapshot_id = await conn.fetchval(
            '''
            SELECT public.os_generate_risk_snapshot(
              $1, $2, $3, $4
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            user.id,
        )

    return {
        'id': str(snapshot_id),
        'status': 'generated',
    }
