from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(prefix='/api', tags=['OS Command Young Person Workspace'])


class YoungPersonWorkspaceResponse(BaseModel):
    profile: dict[str, Any] | None = None
    timeline: list[dict[str, Any]] = []
    care_records: list[dict[str, Any]] = []
    care_plan_reviews: list[dict[str, Any]] = []
    command_items: list[dict[str, Any]] = []
    safeguarding_patterns: list[dict[str, Any]] = []
    placement_stability: dict[str, Any] | None = None
    network: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []
    chronology_intelligence: list[dict[str, Any]] = []
    recording_summary: list[dict[str, Any]] = []


@router.get('/os-command/young-person/{young_person_id}/workspace', response_model=YoungPersonWorkspaceResponse)
async def get_young_person_workspace(
    young_person_id: int,
    request: Request,
    home_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        profile = await conn.fetchrow(
            '''
            SELECT *
            FROM public.vw_os_young_person_profile
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 1
            ''',
            young_person_id,
            home_id,
        )

        timeline = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_timeline
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY occurred_at DESC
            LIMIT $3
            ''',
            young_person_id,
            home_id,
            limit,
        )

        care_records = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_care_record_feed
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY occurred_at DESC
            LIMIT $3
            ''',
            young_person_id,
            home_id,
            limit,
        )

        care_plan_reviews = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_care_plan_review_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY
              CASE review_state WHEN 'overdue' THEN 0 WHEN 'due_soon' THEN 1 ELSE 2 END,
              next_review_due ASC NULLS LAST
            LIMIT 100
            ''',
            young_person_id,
            home_id,
        )

        command_items = await conn.fetch(
            '''
            SELECT *
            FROM public.os_command_live_feed($2, $1, NULL, NULL, $3)
            ''',
            young_person_id,
            home_id,
            limit,
        )

        safeguarding_patterns = await conn.fetch(
            '''
            SELECT
              id,
              provider_id,
              home_id,
              young_person_id,
              pattern_type::text AS pattern_type,
              severity::text AS severity,
              title,
              summary,
              recommended_actions,
              escalation_status::text AS escalation_status,
              detected_at,
              updated_at
            FROM public.os_safeguarding_patterns
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
              AND escalation_status IN ('new','reviewing')
            ORDER BY
              CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              detected_at DESC
            LIMIT 100
            ''',
            young_person_id,
            home_id,
        )

        placement_stability = await conn.fetchrow(
            '''
            SELECT *
            FROM public.vw_os_placement_stability_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 1
            ''',
            young_person_id,
            home_id,
        )

        network = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_safeguarding_network
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY
              CASE risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              created_at DESC
            LIMIT 150
            ''',
            young_person_id,
            home_id,
        )

        alerts = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_network_risk_alert_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY severity_sort, created_at DESC
            LIMIT 100
            ''',
            young_person_id,
            home_id,
        )

        chronology_intelligence = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_chronology_intelligence
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY event_at DESC
            LIMIT $3
            ''',
            young_person_id,
            home_id,
            limit,
        )

        recording_summary = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_recording_summary
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 20
            ''',
            young_person_id,
            home_id,
        )

    return {
        'profile': dict(profile) if profile else None,
        'timeline': [dict(r) for r in timeline],
        'care_records': [dict(r) for r in care_records],
        'care_plan_reviews': [dict(r) for r in care_plan_reviews],
        'command_items': [dict(r) for r in command_items],
        'safeguarding_patterns': [dict(r) for r in safeguarding_patterns],
        'placement_stability': dict(placement_stability) if placement_stability else None,
        'network': [dict(r) for r in network],
        'alerts': [dict(r) for r in alerts],
        'chronology_intelligence': [dict(r) for r in chronology_intelligence],
        'recording_summary': [dict(r) for r in recording_summary],
    }


@router.get('/os-command/young-people')
async def get_os_young_people(
    request: Request,
    home_id: int | None = Query(default=None),
    include_archived: bool = Query(default=False),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_young_person_profile
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::boolean = true OR archived = false)
            ORDER BY
              CASE os_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'monitor' THEN 2 ELSE 3 END,
              display_name ASC
            LIMIT 500
            ''',
            home_id,
            include_archived,
        )

    return {'young_people': [dict(r) for r in rows]}
