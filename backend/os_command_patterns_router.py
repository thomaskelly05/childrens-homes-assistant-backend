from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Safeguarding Patterns'])


class PatternRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    pattern_type: str
    category: str
    title: str
    summary: str | None = None
    severity: str
    confidence_score: float
    first_detected_at: str
    last_detected_at: str
    occurrence_count: int
    escalation_status: str
    command_item_id: str | None = None
    assigned_manager_id: int | None = None
    risk_indicators: list = []
    recommended_actions: list = []
    severity_sort: int


class ContextualRiskRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    indicator_type: str
    severity: str
    source: str
    summary: str
    linked_pattern_id: str | None = None
    linked_chronology_event_id: str | None = None
    identified_at: str
    requires_strategy_discussion: bool
    created_at: str


class PatternBoardResponse(BaseModel):
    patterns: list[PatternRow]
    contextual_risks: list[ContextualRiskRow]


class DetectPatternsPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None


class UpdatePatternStatusPayload(BaseModel):
    escalation_status: str
    assigned_manager_id: int | None = None
    management_note: str | None = None


@router.get('/os-command/safeguarding-patterns', response_model=PatternBoardResponse)
async def get_safeguarding_patterns(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    severity: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        patterns = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_safeguarding_pattern_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR severity = $3)
            ORDER BY severity_sort, last_detected_at DESC
            ''',
            home_id,
            young_person_id,
            severity,
        )

        contextual = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_contextual_risk_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR severity = $3)
            ORDER BY
              CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              identified_at DESC
            ''',
            home_id,
            young_person_id,
            severity,
        )

    return {'patterns': [dict(r) for r in patterns], 'contextual_risks': [dict(r) for r in contextual]}


@router.post('/os-command/safeguarding-patterns/detect')
async def detect_safeguarding_patterns(
    payload: DetectPatternsPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.os_detect_safeguarding_patterns($1, $2, $3, $4)
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            user.id,
        )

    return {'detected': [dict(r) for r in rows], 'count': len(rows)}


@router.patch('/os-command/safeguarding-patterns/{pattern_id}')
async def update_pattern_status(
    pattern_id: str,
    payload: UpdatePatternStatusPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        row = await conn.fetchrow(
            '''
            UPDATE public.os_safeguarding_patterns
            SET escalation_status = $2,
                assigned_manager_id = coalesce($3, assigned_manager_id),
                metadata = metadata || jsonb_build_object('management_note', $4, 'updated_by', $5),
                updated_at = now()
            WHERE id = $1::uuid
            RETURNING id, home_id, young_person_id, title, severity::text AS severity
            ''',
            pattern_id,
            payload.escalation_status,
            payload.assigned_manager_id,
            payload.management_note,
            user.id,
        )

        if row:
            await conn.execute(
                '''
                SELECT public.os_chronology_add_event(
                  'safeguarding_pattern_reviewed', $1, $2, NULL, $3, $4, NULL, now(),
                  'os_safeguarding_patterns', NULL, NULL, 'helped_and_protected',
                  ARRAY['Safeguarding pattern review'], '[]'::jsonb, 'manager', true, $5,
                  jsonb_build_object('pattern_id', $6, 'status', $7)
                )
                ''',
                'Safeguarding pattern reviewed: ' + row['title'],
                payload.management_note or 'Pattern status updated by manager.',
                row['home_id'],
                row['young_person_id'],
                user.id,
                pattern_id,
                payload.escalation_status,
            )

    return {'id': pattern_id, 'status': payload.escalation_status}
