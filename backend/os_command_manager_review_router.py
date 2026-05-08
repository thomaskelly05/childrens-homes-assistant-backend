from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Manager Reviews'])


class ManagerReviewRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    staff_id: int | None = None
    review_type: str
    status: str
    title: str
    context_summary: str
    analysis: str | None = None
    manager_evaluation: str | None = None
    child_impact: str | None = None
    safeguarding_judgement: str | None = None
    actions_required: list = []
    ai_assisted: bool
    ai_confidence: float | None = None
    ai_limitations: str | None = None
    reviewed_by: int | None = None
    reviewed_at: str | None = None
    approved_by: int | None = None
    approved_at: str | None = None
    created_at: str
    updated_at: str
    board_state: str


class GenerateManagerReviewPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    review_type: str = 'safeguarding_review'
    title: str | None = None


class ApproveManagerReviewPayload(BaseModel):
    manager_evaluation: str
    child_impact: str | None = None
    safeguarding_judgement: str | None = None


@router.get('/os-command/manager-reviews', response_model=list[ManagerReviewRow])
async def get_manager_reviews(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    review_type: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_manager_review_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR status = $3)
              AND ($4::text IS NULL OR review_type = $4)
            ORDER BY
              CASE board_state
                WHEN 'overdue_draft' THEN 0
                WHEN 'awaiting_review' THEN 1
                WHEN 'in_review' THEN 2
                ELSE 3
              END,
              created_at DESC
            LIMIT 500
            ''',
            home_id,
            young_person_id,
            status,
            review_type,
        )

    return [dict(r) for r in rows]


@router.post('/os-command/manager-reviews/generate')
async def generate_manager_review(
    payload: GenerateManagerReviewPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        review_id = await conn.fetchval(
            '''
            SELECT public.os_manager_review_generate(
              $1, $2, $3, $4::os_manager_review_type, $5, $6
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            payload.review_type,
            payload.title,
            user.id,
        )

    return {'id': str(review_id), 'status': 'draft'}


@router.post('/os-command/manager-reviews/{review_id}/approve')
async def approve_manager_review(
    review_id: UUID,
    payload: ApproveManagerReviewPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        approved_id = await conn.fetchval(
            '''
            SELECT public.os_manager_review_approve($1, $2, $3, $4, $5)
            ''',
            review_id,
            payload.manager_evaluation,
            payload.child_impact,
            payload.safeguarding_judgement,
            user.id,
        )

    return {'id': str(approved_id), 'status': 'approved'}
