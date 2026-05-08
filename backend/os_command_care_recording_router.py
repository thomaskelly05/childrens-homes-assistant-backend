from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(prefix='/api', tags=['OS Command Care Recording'])


class CareRecordRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    record_type: str
    status: str
    record_date: str
    occurred_at: str
    title: str
    narrative: str
    child_voice: str | None = None
    staff_analysis: str | None = None
    impact_on_child: str | None = None
    actions_taken: list = []
    follow_up_required: bool
    follow_up_summary: str | None = None
    mood: str | None = None
    presentation: str | None = None
    location: str | None = None
    sccif_area: str | None = None
    safeguarding_relevant: bool
    inspection_relevant: bool
    sensitivity: str
    tags: list[str] = []
    manager_review_required: bool
    reviewed_by: int | None = None
    reviewed_at: str | None = None
    manager_comment: str | None = None
    created_by: int | None = None
    created_at: str
    feed_state: str


class RecordingSummaryRow(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    records_today: int
    manager_review_count: int
    safeguarding_records_7_days: int
    positives_7_days: int
    concerns_7_days: int
    latest_record_at: str | None = None


class CarePlanRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    section_key: str
    section_title: str
    current_summary: str
    needs: str | None = None
    risks: str | None = None
    strengths: str | None = None
    support_actions: list = []
    review_frequency_days: int
    last_reviewed_at: str | None = None
    next_review_due: str | None = None
    status: str
    created_at: str
    updated_at: str
    review_state: str


class CareRecordingResponse(BaseModel):
    records: list[CareRecordRow]
    summary: list[RecordingSummaryRow]
    care_plan_reviews: list[CarePlanRow]


class CreateCareRecordPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    record_type: str = 'daily_record'
    title: str
    narrative: str
    child_voice: str | None = None
    staff_analysis: str | None = None
    impact_on_child: str | None = None
    actions_taken: list[str] = []
    follow_up_required: bool = False
    follow_up_summary: str | None = None
    mood: str | None = None
    presentation: str | None = None
    location: str | None = None
    sccif_area: str | None = None
    safeguarding_relevant: bool = False
    sensitivity: str = 'standard'
    tags: list[str] = []


class ApproveCareRecordPayload(BaseModel):
    manager_comment: str | None = None


@router.get('/os-command/care-recording', response_model=CareRecordingResponse)
async def get_care_recording(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    record_type: str | None = Query(default=None),
    manager_review_required: bool | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        records = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_care_record_feed
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR record_type = $3)
              AND ($4::boolean IS NULL OR manager_review_required = $4)
            ORDER BY occurred_at DESC
            LIMIT $5
            ''',
            home_id,
            young_person_id,
            record_type,
            manager_review_required,
            limit,
        )

        summary = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_recording_summary
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
            ORDER BY latest_record_at DESC NULLS LAST
            LIMIT 500
            ''',
            home_id,
            young_person_id,
        )

        care_plans = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_care_plan_review_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
            ORDER BY
              CASE review_state WHEN 'overdue' THEN 0 WHEN 'due_soon' THEN 1 ELSE 2 END,
              next_review_due ASC NULLS LAST
            LIMIT 200
            ''',
            home_id,
            young_person_id,
        )

    return {
        'records': [dict(r) for r in records],
        'summary': [dict(r) for r in summary],
        'care_plan_reviews': [dict(r) for r in care_plans],
    }


@router.post('/os-command/care-recording')
async def create_care_record(
    payload: CreateCareRecordPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        record_id = await conn.fetchval(
            '''
            SELECT public.os_create_care_record(
              $1, $2, $3, $4::os_care_record_type, $5, $6, $7, $8, $9,
              $10::jsonb, $11, $12, $13, $14, $15, $16, $17,
              $18::os_record_sensitivity, $19::text[], $20
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            payload.record_type,
            payload.title,
            payload.narrative,
            payload.child_voice,
            payload.staff_analysis,
            payload.impact_on_child,
            payload.actions_taken,
            payload.follow_up_required,
            payload.follow_up_summary,
            payload.mood,
            payload.presentation,
            payload.location,
            payload.sccif_area,
            payload.safeguarding_relevant,
            payload.sensitivity,
            payload.tags,
            user.id,
        )

    return {'id': str(record_id), 'status': 'submitted'}


@router.post('/os-command/care-recording/{record_id}/approve')
async def approve_care_record(
    record_id: UUID,
    payload: ApproveCareRecordPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        approved_id = await conn.fetchval(
            'SELECT public.os_approve_care_record($1, $2, $3)',
            record_id,
            payload.manager_comment,
            user.id,
        )

    return {'id': str(approved_id), 'status': 'approved'}
