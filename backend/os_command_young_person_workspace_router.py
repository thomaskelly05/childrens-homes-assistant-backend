from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_child_workspace_write_service import function_exists, save_child_workspace_item as save_canonical_child_workspace_item
from .os_child_workspace_write_service import table_exists
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
    appointments: list[dict[str, Any]] = []
    child_voice: list[dict[str, Any]] = []
    schema_status: dict[str, bool] = {}


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


REQUIRED_WORKSPACE_TABLES = [
    'vw_os_young_person_profile',
    'vw_os_young_person_timeline',
    'vw_os_young_person_care_record_feed',
    'vw_os_care_plan_review_board',
    'os_command_items',
    'child_voice_entries',
    'young_person_appointments',
    'daily_notes',
    'incidents',
    'missing_episodes',
    'safeguarding_records',
    'keywork_sessions',
    'direct_work_sessions',
    'health_records',
    'education_records',
    'family_contact_records',
    'life_story_entries',
    'handover_records',
    'chronology_events',
    'manager_review_queue',
]


async def _fetch_if_table(conn, table_name: str, sql: str, *params: Any) -> list[dict[str, Any]]:
    if not await table_exists(conn, table_name):
        return []
    rows = await conn.fetch(sql, *params)
    return [dict(row) for row in rows]


async def _fetchrow_if_table(conn, table_name: str, sql: str, *params: Any) -> dict[str, Any] | None:
    if not await table_exists(conn, table_name):
        return None
    row = await conn.fetchrow(sql, *params)
    return dict(row) if row else None


async def _workspace_schema_status(conn) -> dict[str, bool]:
    status = {name: await table_exists(conn, name) for name in REQUIRED_WORKSPACE_TABLES}
    status['os_command_live_feed'] = await function_exists(conn, 'os_command_live_feed')
    return status


async def _latest_by_keywords(
    conn,
    *,
    young_person_id: int,
    keywords: list[str],
    home_id: int | None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    search_terms = [f"%{keyword.lower()}%" for keyword in keywords]
    if not search_terms or not await table_exists(conn, 'vw_os_young_person_timeline'):
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
        schema_status = await _workspace_schema_status(conn)

        profile = await _fetchrow_if_table(
            conn,
            'vw_os_young_person_profile',
            """
            SELECT *
            FROM public.vw_os_young_person_profile
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 1
            """,
            young_person_id,
            home_id,
        )

        timeline = await _fetch_if_table(
            conn,
            'vw_os_young_person_timeline',
            """
            SELECT *
            FROM public.vw_os_young_person_timeline
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY occurred_at DESC
            LIMIT $3
            """,
            young_person_id,
            home_id,
            limit,
        )

        care_records = await _fetch_if_table(
            conn,
            'vw_os_young_person_care_record_feed',
            """
            SELECT *
            FROM public.vw_os_young_person_care_record_feed
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY occurred_at DESC
            LIMIT $3
            """,
            young_person_id,
            home_id,
            limit,
        )

        care_plan_reviews = await _fetch_if_table(
            conn,
            'vw_os_care_plan_review_board',
            """
            SELECT *
            FROM public.vw_os_care_plan_review_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY
              CASE review_state WHEN 'overdue' THEN 0 WHEN 'due_soon' THEN 1 ELSE 2 END,
              next_review_due ASC NULLS LAST
            LIMIT 100
            """,
            young_person_id,
            home_id,
        )

        command_items = []
        if schema_status.get('os_command_items') and schema_status.get('os_command_live_feed'):
            command_items = [
                dict(row)
                for row in await conn.fetch(
                    "SELECT * FROM public.os_command_live_feed($1, $2, NULL, NULL, $3)",
                    home_id,
                    young_person_id,
                    limit,
                )
            ]

        safeguarding_patterns = await _fetch_if_table(
            conn,
            'os_safeguarding_patterns',
            """
            SELECT
              id,
              'os_safeguarding_patterns'::text AS source_table,
              id::text AS source_id,
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
            """,
            young_person_id,
            home_id,
        )

        placement_stability = await _fetchrow_if_table(
            conn,
            'vw_os_placement_stability_board',
            """
            SELECT *
            FROM public.vw_os_placement_stability_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 1
            """,
            young_person_id,
            home_id,
        )

        network = await _fetch_if_table(
            conn,
            'vw_os_safeguarding_network',
            """
            SELECT *
            FROM public.vw_os_safeguarding_network
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY
              CASE risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              created_at DESC
            LIMIT 150
            """,
            young_person_id,
            home_id,
        )

        alerts = await _fetch_if_table(
            conn,
            'vw_os_network_risk_alert_board',
            """
            SELECT *
            FROM public.vw_os_network_risk_alert_board
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY severity_sort, created_at DESC
            LIMIT 100
            """,
            young_person_id,
            home_id,
        )

        chronology_intelligence = await _fetch_if_table(
            conn,
            'vw_os_chronology_intelligence',
            """
            SELECT *
            FROM public.vw_os_chronology_intelligence
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY event_at DESC
            LIMIT $3
            """,
            young_person_id,
            home_id,
            limit,
        )

        recording_summary = await _fetch_if_table(
            conn,
            'vw_os_young_person_recording_summary',
            """
            SELECT *
            FROM public.vw_os_young_person_recording_summary
            WHERE young_person_id = $1
              AND ($2::int4 IS NULL OR home_id = $2)
            LIMIT 20
            """,
            young_person_id,
            home_id,
        )

        appointments = await _fetch_if_table(
            conn,
            'young_person_appointments',
            """
            SELECT
              id,
              'young_person_appointments'::text AS source_table,
              id::text AS source_id,
              'Appointment' AS type,
              title,
              coalesce(outcome_notes, summary, purpose, follow_up_actions, title) AS summary,
              status,
              appointment_type,
              appointment_date AS occurred_at,
              professional_name,
              professional_role,
              location,
              child_voice,
              follow_up_actions AS recommended_action,
              provider_id
            FROM public.young_person_appointments
            WHERE young_person_id = $1
            ORDER BY appointment_date DESC
            LIMIT 50
            """,
            young_person_id,
        )

        child_voice = await _fetch_if_table(
            conn,
            'child_voice_entries',
            """
            SELECT
              id,
              COALESCE(source_table, 'child_voice_entries') AS source_table,
              COALESCE(source_id::text, id::text) AS source_id,
              'Child voice' AS type,
              context AS title,
              voice_text AS summary,
              status,
              voice_date AS occurred_at,
              how_voice_influenced_care AS recommended_action,
              source_table AS linked_source_table,
              source_id AS linked_source_id,
              recorded_by,
              provider_id,
              home_id
            FROM public.child_voice_entries
            WHERE young_person_id = $1
              AND status <> 'archived'
            ORDER BY voice_date DESC, created_at DESC
            LIMIT 50
            """,
            young_person_id,
        )

    return {
        'profile': profile,
        'timeline': timeline,
        'care_records': care_records,
        'care_plan_reviews': care_plan_reviews,
        'command_items': command_items,
        'safeguarding_patterns': safeguarding_patterns,
        'placement_stability': placement_stability,
        'network': network,
        'alerts': alerts,
        'chronology_intelligence': chronology_intelligence,
        'recording_summary': recording_summary,
        'appointments': appointments,
        'child_voice': child_voice,
        'schema_status': schema_status,
    }


@router.post('/os-command/young-person/{young_person_id}/workspace/items')
async def save_young_person_workspace_item(
    young_person_id: int,
    payload: SaveWorkspaceItemPayload,
    request: Request,
    home_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        saved = await save_canonical_child_workspace_item(
            conn,
            young_person_id=young_person_id,
            home_id=home_id,
            provider_id=user.provider_id,
            user_id=user.id,
            item_type=payload.item_type,
            title=payload.title,
            summary=payload.summary,
            status=payload.status,
            priority=payload.priority,
            evidence=payload.evidence,
            action=payload.action,
            owner=payload.owner,
            payload=payload.payload or {},
        )
    return saved


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

        if 'lac' in lower or 'looked after' in lower or 'statutory review' in lower or 'iro' in lower:
            rows = await _fetch_if_table(
                conn,
                'review_meetings',
                """
                SELECT id, meeting_type AS type, meeting_date AS occurred_at,
                       meeting_type AS title,
                       coalesce(decisions, agenda, actions, child_voice) AS summary,
                       child_voice,
                       next_review_date
                FROM public.review_meetings
                WHERE young_person_id = $1
                  AND lower(meeting_type) SIMILAR TO '%(lac|looked after|statutory|iro|review)%'
                ORDER BY meeting_date DESC
                LIMIT 5
                """,
                young_person_id,
            )
            if not rows:
                rows = await _latest_by_keywords(conn, young_person_id=young_person_id, home_id=home_id, keywords=['lac review', 'looked after review', 'statutory review', 'iro'])
            if rows:
                first = rows[0]
                return {
                    'ok': True,
                    'answer': f"The latest LAC/statutory review I found is {first.get('title') or first.get('type') or 'review'} on {first.get('occurred_at')}. Summary: {first.get('summary') or 'No summary recorded.'}",
                    'evidence': rows,
                }
            return {'ok': True, 'answer': 'I could not find a LAC/statutory review in the workspace data. Check Reviews and Documents, then record this as an evidence gap if missing.', 'evidence': []}

        if 'dentist' in lower or 'dental' in lower:
            rows = await _fetch_if_table(
                conn,
                'young_person_appointments',
                """
                SELECT id, appointment_type AS type, appointment_date AS occurred_at,
                       title, coalesce(outcome_notes, summary, purpose, follow_up_actions) AS summary,
                       status, professional_name, follow_up_actions AS recommended_action
                FROM public.young_person_appointments
                WHERE young_person_id = $1
                  AND (lower(title) LIKE '%dent%' OR lower(appointment_type) LIKE '%dent%')
                ORDER BY appointment_date DESC
                LIMIT 5
                """,
                young_person_id,
            )
            if not rows:
                rows = await _fetch_if_table(
                    conn,
                    'health_records',
                    """
                    SELECT id, record_type AS type, event_datetime AS occurred_at,
                           title, summary, outcome, next_action_date
                    FROM public.health_records
                    WHERE young_person_id = $1
                      AND (lower(title) LIKE '%dent%' OR lower(record_type) LIKE '%dent%' OR lower(coalesce(summary,'')) LIKE '%dent%')
                    ORDER BY event_datetime DESC
                    LIMIT 5
                    """,
                    young_person_id,
                )
            if rows:
                first = rows[0]
                return {
                    'ok': True,
                    'answer': f"The latest dental record I found is {first.get('title') or first.get('type') or 'dental appointment'} on {first.get('occurred_at')}. Summary: {first.get('summary') or first.get('outcome') or 'No summary recorded.'}",
                    'evidence': rows,
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

        command_items = []
        if await table_exists(conn, 'os_command_items') and await function_exists(conn, 'os_command_live_feed'):
            command_items = [
                dict(row)
                for row in await conn.fetch(
                    'SELECT * FROM public.os_command_live_feed($1, $2, NULL, NULL, 20)',
                    home_id,
                    young_person_id,
                )
            ]
        if command_items:
            first = command_items[0]
            return {
                'ok': True,
                'answer': f"Start with: {first.get('title')}. {first.get('summary') or first.get('recommended_action') or 'Open the command item and review the linked evidence.'}",
                'evidence': command_items[:5],
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
        rows = await _fetch_if_table(
            conn,
            'vw_os_young_person_profile',
            """
            SELECT *
            FROM public.vw_os_young_person_profile
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::boolean = true OR archived = false)
            ORDER BY
              CASE os_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'monitor' THEN 2 ELSE 3 END,
              display_name ASC
            LIMIT 500
            """,
            home_id,
            include_archived,
        )

    return {'young_people': rows}


@router.get('/os-command/schema-status')
async def get_os_command_schema_status(
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        return await _workspace_schema_status(conn)
