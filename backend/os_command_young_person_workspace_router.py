from __future__ import annotations

import json
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


class SaveWorkspaceItemPayload(BaseModel):
    item_id: str | None = None
    item_type: str
    title: str
    summary: str | None = None
    status: str | None = 'draft'
    priority: str | None = 'normal'
    evidence: str | None = None
    action: str | None = None
    owner: str | None = None
    payload: dict[str, Any] = {}


class OrbWorkspaceQuestionPayload(BaseModel):
    question: str
    draft_text: str | None = None
    context: dict[str, Any] = {}


async def _table_exists(conn, table_name: str) -> bool:
    exists = await conn.fetchval(
        """
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        )
        """,
        table_name,
    )
    return bool(exists)


async def _latest_by_keywords(
    conn,
    *,
    young_person_id: int,
    keywords: list[str],
    home_id: int | None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    search_terms = [f"%{keyword.lower()}%" for keyword in keywords]
    if not search_terms:
        return []
    rows = await conn.fetch(
        """
        SELECT *
        FROM public.vw_os_young_person_timeline
        WHERE young_person_id = $1
          AND ($2::int4 IS NULL OR home_id = $2)
          AND (
            lower(coalesce(title, '')) LIKE ANY($3::text[])
            OR lower(coalesce(summary, '')) LIKE ANY($3::text[])
            OR lower(coalesce(event_type, '')) LIKE ANY($3::text[])
            OR lower(coalesce(category, '')) LIKE ANY($3::text[])
          )
        ORDER BY occurred_at DESC NULLS LAST
        LIMIT $4
        """,
        young_person_id,
        home_id,
        search_terms,
        limit,
    )
    return [dict(row) for row in rows]


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


@router.post('/os-command/young-person/{young_person_id}/workspace/items')
async def save_young_person_workspace_item(
    young_person_id: int,
    payload: SaveWorkspaceItemPayload,
    request: Request,
    home_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    """Save an editable workspace item when the optional OS draft table exists.

    This endpoint is deliberately safe during staged rollout. If the database
    has not yet received the persistence table, the UI still receives an
    accepted response and can continue to work locally instead of failing.
    """
    pool = get_pool(request)
    record = payload.model_dump()
    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        if not await _table_exists(conn, 'os_workspace_item_drafts'):
            return {
                'ok': True,
                'saved': False,
                'mode': 'local_fallback',
                'message': 'Workspace item accepted. Persistence table not present yet.',
                'item': record,
            }

        saved = await conn.fetchrow(
            """
            INSERT INTO public.os_workspace_item_drafts (
              young_person_id,
              home_id,
              item_id,
              item_type,
              title,
              summary,
              status,
              priority,
              evidence,
              action,
              owner,
              payload,
              created_by,
              updated_by,
              created_at,
              updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$13,NOW(),NOW())
            ON CONFLICT (young_person_id, item_id) DO UPDATE SET
              item_type = EXCLUDED.item_type,
              title = EXCLUDED.title,
              summary = EXCLUDED.summary,
              status = EXCLUDED.status,
              priority = EXCLUDED.priority,
              evidence = EXCLUDED.evidence,
              action = EXCLUDED.action,
              owner = EXCLUDED.owner,
              payload = EXCLUDED.payload,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
            RETURNING *
            """,
            young_person_id,
            home_id,
            payload.item_id or f"draft-{young_person_id}",
            payload.item_type,
            payload.title,
            payload.summary,
            payload.status,
            payload.priority,
            payload.evidence,
            payload.action,
            payload.owner,
            json.dumps(payload.payload or {}),
            user.id,
        )

    return {'ok': True, 'saved': True, 'item': dict(saved) if saved else record}


@router.post('/os-command/young-person/{young_person_id}/workspace/orb')
async def ask_young_person_workspace_orb(
    young_person_id: int,
    payload: OrbWorkspaceQuestionPayload,
    request: Request,
    home_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    question = (payload.question or '').strip()
    lower = question.lower()
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        if 'lac' in lower or 'looked after' in lower or 'statutory review' in lower:
            matches = await _latest_by_keywords(conn, young_person_id=young_person_id, home_id=home_id, keywords=['lac review', 'looked after review', 'statutory review', 'iro'])
            if matches:
                first = matches[0]
                return {
                    'ok': True,
                    'answer': f"The latest LAC/statutory review I found is: {first.get('title') or 'Review'} on {first.get('occurred_at') or first.get('created_at')}. Summary: {first.get('summary') or 'No summary recorded.'}",
                    'evidence': matches,
                }
            return {'ok': True, 'answer': 'I could not find a LAC/statutory review in the workspace data. Check Reviews and Documents, then record this as an evidence gap if missing.', 'evidence': []}

        if 'dentist' in lower or 'dental' in lower:
            matches = await _latest_by_keywords(conn, young_person_id=young_person_id, home_id=home_id, keywords=['dentist', 'dental'])
            if matches:
                first = matches[0]
                return {
                    'ok': True,
                    'answer': f"The latest dental record I found is: {first.get('title') or 'Dental appointment'} on {first.get('occurred_at') or first.get('created_at')}. Summary: {first.get('summary') or 'No summary recorded.'}",
                    'evidence': matches,
                }
            return {'ok': True, 'answer': 'I could not find a dental appointment in the workspace data. Check Health and Documents before marking this as missing evidence.', 'evidence': []}

        if 'therapeutic' in lower or 'rewrite' in lower or 'wording' in lower:
            draft = payload.draft_text or payload.context.get('summary') or ''
            return {
                'ok': True,
                'answer': (
                    'Therapeutic recording guidance: keep it factual, describe what happened before/during/after, include the child voice, avoid blame language, record the adult response, and link any follow-up action. '
                    f"Suggested rewrite: {draft or 'The child became distressed. Staff used calm reassurance, offered space, followed the plan and recorded what helped the child settle.'}"
                ),
                'evidence': [],
            }

        if 'ofsted' in lower or 'inspector' in lower:
            return {
                'ok': True,
                'answer': 'Ofsted lens: evidence should show staff understand the child, risks are known and reviewed, plans guide practice, child voice influences decisions, and managers complete meaningful oversight with clear rationale.',
                'evidence': [],
            }

        command_items = await conn.fetch(
            'SELECT * FROM public.os_command_live_feed($1, $2, NULL, NULL, 20)',
            home_id,
            young_person_id,
        )
        items = [dict(row) for row in command_items]
        if items:
            first = items[0]
            return {
                'ok': True,
                'answer': f"Start with: {first.get('title')}. {first.get('summary') or first.get('recommended_action') or 'Open the command item and review the linked evidence.'}",
                'evidence': items[:5],
            }

    return {
        'ok': True,
        'answer': 'I can help find evidence, explain patterns, draft therapeutically, check review dates and highlight what an inspector or manager may ask next.',
        'evidence': [],
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
