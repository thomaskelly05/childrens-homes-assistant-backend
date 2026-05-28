from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(prefix='/api', tags=['OS Command Resilient Workspace'])

WORKSPACE_TABLES = [
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
    'health_records',
    'education_records',
    'family_contact_records',
    'handover_records',
    'chronology_events',
    'manager_review_queue',
]


def q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


async def table_exists(conn, table: str, errors: list[dict[str, str]]) -> bool:
    try:
        return bool(await conn.fetchval('SELECT to_regclass(%s) IS NOT NULL', f'public.{table}'))
    except Exception as exc:
        errors.append({'section': 'table_exists', 'table': table, 'error': str(exc)})
        return False


async def function_exists(conn, function_name: str, errors: list[dict[str, str]]) -> bool:
    try:
        return bool(await conn.fetchval("""
            SELECT EXISTS (
              SELECT 1 FROM pg_proc p
              JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname = %s
            )
        """, function_name))
    except Exception as exc:
        errors.append({'section': 'function_exists', 'function': function_name, 'error': str(exc)})
        return False


async def columns(conn, table: str, errors: list[dict[str, str]]) -> set[str]:
    try:
        rows = await conn.fetch("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
        """, table)
        return {str(row.get('column_name')) for row in rows if row.get('column_name')}
    except Exception as exc:
        errors.append({'section': 'columns', 'table': table, 'error': str(exc)})
        return set()


async def schema_status(conn, errors: list[dict[str, str]]) -> dict[str, bool]:
    status = {table: await table_exists(conn, table, errors) for table in WORKSPACE_TABLES}
    status['os_command_live_feed'] = await function_exists(conn, 'os_command_live_feed', errors)
    return status


async def select_rows(
    conn,
    table: str,
    *,
    young_person_id: int | None = None,
    home_id: int | None = None,
    provider_id: int | None = None,
    limit: int = 100,
    order_candidates: tuple[str, ...] = ('occurred_at', 'event_datetime', 'created_at', 'updated_at', 'id'),
    errors: list[dict[str, str]],
) -> list[dict[str, Any]]:
    try:
        if not await table_exists(conn, table, errors):
            return []
        cols = await columns(conn, table, errors)
        where: list[str] = []
        params: list[Any] = []
        if young_person_id is not None:
            if 'young_person_id' in cols:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            elif 'child_id' in cols:
                where.append('child_id = %s')
                params.append(young_person_id)
            elif table in {'young_people', 'vw_os_young_person_profile'} and 'id' in cols:
                where.append('id = %s')
                params.append(young_person_id)
        if home_id is not None and 'home_id' in cols:
            where.append('home_id = %s')
            params.append(home_id)
        if provider_id is not None and 'provider_id' in cols:
            where.append('provider_id = %s')
            params.append(provider_id)
        if 'archived' in cols:
            where.append('COALESCE(archived, FALSE) = FALSE')
        where_sql = 'WHERE ' + ' AND '.join(where) if where else ''
        order_col = next((candidate for candidate in order_candidates if candidate in cols), None)
        order_sql = f'ORDER BY {q(order_col)} DESC NULLS LAST' if order_col else ''
        params.append(max(1, min(int(limit or 100), 500)))
        sql = f'SELECT * FROM public.{q(table)} {where_sql} {order_sql} LIMIT %s'
        return [dict(row) for row in await conn.fetch(sql, *params)]
    except Exception as exc:
        errors.append({'section': 'select', 'table': table, 'error': str(exc)})
        return []


async def command_items(conn, *, home_id: int | None, young_person_id: int | None, limit: int, errors: list[dict[str, str]]) -> list[dict[str, Any]]:
    try:
        if not await function_exists(conn, 'os_command_live_feed', errors):
            return []
        rows = await conn.fetch(
            'SELECT * FROM public.os_command_live_feed(%s, %s, NULL, NULL, %s)',
            home_id,
            young_person_id,
            max(1, min(int(limit or 100), 500)),
        )
        return [dict(row) for row in rows]
    except Exception as exc:
        errors.append({'section': 'os_command_live_feed', 'error': str(exc)})
        return []


@router.get('/os-command/young-person/{young_person_id}/workspace')
async def resilient_workspace(
    young_person_id: int,
    request: Request,
    home_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute('select set_config(%s, %s, true)', 'app.user_id', str(user.id))
        errors: list[dict[str, str]] = []
        status = await schema_status(conn, errors)
        profile_table = 'vw_os_young_person_profile' if status.get('vw_os_young_person_profile') else 'young_people'
        profile_rows = await select_rows(conn, profile_table, young_person_id=young_person_id, home_id=home_id, provider_id=user.provider_id, limit=1, errors=errors)
        timeline = await select_rows(conn, 'vw_os_young_person_timeline' if status.get('vw_os_young_person_timeline') else 'chronology_events', young_person_id=young_person_id, home_id=home_id, limit=limit, errors=errors)
        care_records = await select_rows(conn, 'vw_os_young_person_care_record_feed' if status.get('vw_os_young_person_care_record_feed') else 'daily_notes', young_person_id=young_person_id, home_id=home_id, limit=limit, errors=errors)
        if not care_records:
            for table in ('daily_notes', 'incidents', 'handover_records'):
                care_records.extend(await select_rows(conn, table, young_person_id=young_person_id, home_id=home_id, limit=50, errors=errors))
            care_records = care_records[:limit]
        care_plan_reviews = await select_rows(conn, 'vw_os_care_plan_review_board', young_person_id=young_person_id, home_id=home_id, limit=100, order_candidates=('next_review_due', 'review_date', 'created_at', 'updated_at', 'id'), errors=errors)
        safeguarding_patterns = await select_rows(conn, 'safeguarding_records', young_person_id=young_person_id, home_id=home_id, limit=100, errors=errors)
        chronology_intelligence = await select_rows(conn, 'chronology_events', young_person_id=young_person_id, home_id=home_id, limit=limit, errors=errors)
        recording_summary = await select_rows(conn, 'manager_review_queue', young_person_id=young_person_id, home_id=home_id, limit=20, errors=errors)
        appointments = await select_rows(conn, 'young_person_appointments', young_person_id=young_person_id, home_id=home_id, limit=50, order_candidates=('appointment_date', 'created_at', 'updated_at', 'id'), errors=errors)
        voice = await select_rows(conn, 'child_voice_entries', young_person_id=young_person_id, home_id=home_id, limit=50, order_candidates=('voice_date', 'created_at', 'updated_at', 'id'), errors=errors)
        commands = await command_items(conn, home_id=home_id, young_person_id=young_person_id, limit=limit, errors=errors)
    return {
        'ok': True,
        'source': 'resilient_workspace_router',
        'young_person_id': young_person_id,
        'child_id': young_person_id,
        'home_id': home_id,
        'provider_id': user.provider_id,
        'profile': profile_rows[0] if profile_rows else None,
        'timeline': timeline,
        'care_records': care_records,
        'care_plan_reviews': care_plan_reviews,
        'command_items': commands,
        'safeguarding_patterns': safeguarding_patterns,
        'placement_stability': None,
        'network': [],
        'alerts': [],
        'chronology_intelligence': chronology_intelligence,
        'recording_summary': recording_summary,
        'appointments': appointments,
        'child_voice': voice,
        'schema_status': status,
        'schema_errors': errors,
        'counts': {
            'timeline': len(timeline),
            'care_records': len(care_records),
            'care_plan_reviews': len(care_plan_reviews),
            'command_items': len(commands),
            'safeguarding_patterns': len(safeguarding_patterns),
            'chronology_intelligence': len(chronology_intelligence),
            'recording_summary': len(recording_summary),
            'appointments': len(appointments),
            'child_voice': len(voice),
        },
    }


@router.get('/os-command/young-people')
async def resilient_young_people(
    request: Request,
    home_id: int | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)
    async with pool.acquire() as conn:
        await conn.execute('select set_config(%s, %s, true)', 'app.user_id', str(user.id))
        errors: list[dict[str, str]] = []
        table = 'vw_os_young_person_profile' if await table_exists(conn, 'vw_os_young_person_profile', errors) else 'young_people'
        rows = await select_rows(conn, table, home_id=home_id, provider_id=user.provider_id, limit=limit, order_candidates=('display_name', 'last_name', 'preferred_name', 'created_at', 'id'), errors=errors)
    return {'ok': True, 'source': 'resilient_workspace_router', 'young_people': rows, 'items': rows, 'count': len(rows), 'schema_errors': errors}
