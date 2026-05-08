from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, Query

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/os-command', tags=['OS Runtime Compatibility'])


def serialise(value: Any) -> Any:
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, list):
        return [serialise(item) for item in value]
    if isinstance(value, dict):
        return {key: serialise(item) for key, item in value.items()}
    return value


def rows_to_dicts(cursor: Any, rows: list[Any]) -> list[dict[str, Any]]:
    columns = [column[0] for column in cursor.description or []]
    output: list[dict[str, Any]] = []
    for row in rows:
        if isinstance(row, dict):
            output.append({key: serialise(value) for key, value in row.items()})
        else:
            output.append({columns[index]: serialise(value) for index, value in enumerate(row) if index < len(columns)})
    return output


def relation_exists(cursor: Any, relation_name: str) -> bool:
    cursor.execute(
        '''
        SELECT EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
          AND c.relname = %s
          AND c.relkind IN ('r','v','m')
        )
        ''',
        (relation_name,),
    )
    row = cursor.fetchone()
    if isinstance(row, dict):
        return bool(row.get('exists'))
    return bool(row and row[0])


def function_exists(cursor: Any, function_name: str) -> bool:
    cursor.execute(
        '''
        SELECT EXISTS (
          SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
          AND p.proname = %s
        )
        ''',
        (function_name,),
    )
    row = cursor.fetchone()
    if isinstance(row, dict):
        return bool(row.get('exists'))
    return bool(row and row[0])


def safe_fetch(sql: str, params: tuple[Any, ...] = (), fallback: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return rows_to_dicts(cursor, cursor.fetchall())
    except Exception:
        return fallback or []
    finally:
        if conn is not None:
            release_db_connection(conn)


def safe_fetch_relation(relation_name: str, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, relation_name):
                return []
            cursor.execute(sql, params)
            return rows_to_dicts(cursor, cursor.fetchall())
    except Exception:
        return []
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('')
async def os_command_feed(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    domain: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=50),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if function_exists(cursor, 'os_command_live_feed'):
                cursor.execute(
                    'SELECT * FROM public.os_command_live_feed(%s, %s, %s, %s, %s)',
                    (home_id, young_person_id, domain, priority, max(1, min(limit, 500))),
                )
                items = rows_to_dicts(cursor, cursor.fetchall())
            elif relation_exists(cursor, 'os_command_items'):
                cursor.execute(
                    '''
                    SELECT
                      id::text AS command_item_id,
                      id::text AS feed_id,
                      provider_id,
                      home_id,
                      young_person_id,
                      staff_id,
                      domain::text,
                      priority::text,
                      status::text,
                      title,
                      summary,
                      recommended_action,
                      source_table,
                      source_id,
                      due_at,
                      sccif_area,
                      regulation_refs,
                      evidence_refs,
                      ai_generated,
                      created_at,
                      updated_at
                    FROM public.os_command_items
                    WHERE (%s::int4 IS NULL OR home_id = %s)
                      AND (%s::int4 IS NULL OR young_person_id = %s)
                      AND (%s::text IS NULL OR domain::text = %s)
                      AND (%s::text IS NULL OR priority::text = %s)
                    ORDER BY
                      CASE priority::text WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                      created_at DESC
                    LIMIT %s
                    ''',
                    (home_id, home_id, young_person_id, young_person_id, domain, domain, priority, priority, max(1, min(limit, 500))),
                )
                items = rows_to_dicts(cursor, cursor.fetchall())
            else:
                items = []

            if relation_exists(cursor, 'vw_os_command_summary'):
                cursor.execute(
                    'SELECT * FROM public.vw_os_command_summary WHERE (%s::int4 IS NULL OR home_id = %s)',
                    (home_id, home_id),
                )
                summary = rows_to_dicts(cursor, cursor.fetchall())
            else:
                summary = [{
                    'provider_id': None,
                    'home_id': home_id,
                    'critical_count': sum(1 for item in items if item.get('priority') == 'critical'),
                    'high_count': sum(1 for item in items if item.get('priority') == 'high'),
                    'overdue_count': 0,
                    'safeguarding_count': sum(1 for item in items if item.get('domain') == 'safeguarding'),
                    'reg40_count': 0,
                    'risk_count': sum(1 for item in items if item.get('domain') == 'risk'),
                    'quality_count': sum(1 for item in items if item.get('domain') == 'quality'),
                    'open_total': len(items),
                }]

            return {'summary': summary, 'items': items, 'status': 'ok'}
    except Exception as error:
        return {'summary': [], 'items': [], 'status': 'degraded', 'message': str(error)}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/provider-command-centre')
async def provider_command_centre(provider_id: int | None = Query(default=None), home_id: int | None = Query(default=None)):
    command_centre = safe_fetch_relation(
        'vw_os_provider_command_centre',
        '''
        SELECT * FROM public.vw_os_provider_command_centre
        WHERE (%s::int4 IS NULL OR provider_id = %s)
        ORDER BY created_at DESC
        LIMIT 10
        ''',
        (provider_id, provider_id),
    )
    matrix = safe_fetch_relation(
        'vw_os_provider_home_command_matrix',
        '''
        SELECT * FROM public.vw_os_provider_home_command_matrix
        WHERE (%s::int4 IS NULL OR home_id = %s)
        ORDER BY critical_commands DESC, immediate_actions DESC
        LIMIT 100
        ''',
        (home_id, home_id),
    )
    return {'command_centre': command_centre, 'home_matrix': matrix, 'status': 'ok'}


@router.post('/provider-command-centre/generate')
async def generate_provider_command_centre(provider_id: int | None = None):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if function_exists(cursor, 'os_generate_provider_command_snapshot'):
                cursor.execute('SELECT public.os_generate_provider_command_snapshot(%s, NULL)', (provider_id,))
                row = cursor.fetchone()
                conn.commit()
                return {'id': str(row[0] if row and not isinstance(row, dict) else row.get('os_generate_provider_command_snapshot')), 'status': 'generated'}
    except Exception as error:
        if conn is not None:
            conn.rollback()
        return {'id': None, 'status': 'degraded', 'message': str(error)}
    finally:
        if conn is not None:
            release_db_connection(conn)
    return {'id': None, 'status': 'not_available'}


@router.get('/chronology-intelligence')
async def chronology_intelligence(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), limit: int = Query(default=40)):
    rows = safe_fetch_relation(
        'vw_os_chronology_intelligence',
        '''
        SELECT * FROM public.vw_os_chronology_intelligence
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        ORDER BY event_at DESC
        LIMIT %s
        ''',
        (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 300))),
    )
    return rows


@router.get('/safeguarding-patterns')
async def safeguarding_patterns(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    patterns = safe_fetch_relation(
        'os_safeguarding_patterns',
        '''
        SELECT
          id::text,
          provider_id,
          home_id,
          young_person_id,
          pattern_type::text,
          severity::text,
          title,
          summary,
          recommended_actions,
          escalation_status::text,
          detected_at,
          updated_at
        FROM public.os_safeguarding_patterns
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        ORDER BY detected_at DESC
        LIMIT 100
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    return {'patterns': patterns, 'contextual_risks': [], 'status': 'ok'}


@router.post('/safeguarding-patterns/detect')
async def detect_safeguarding_patterns():
    return {'status': 'queued_or_not_available'}


@router.get('/staff-wellbeing')
async def staff_wellbeing(home_id: int | None = Query(default=None)):
    staff = safe_fetch_relation(
        'vw_os_staff_wellbeing_board',
        'SELECT * FROM public.vw_os_staff_wellbeing_board WHERE (%s::int4 IS NULL OR home_id = %s) LIMIT 200',
        (home_id, home_id),
    )
    homes = safe_fetch_relation(
        'vw_os_home_resilience_board',
        'SELECT * FROM public.vw_os_home_resilience_board WHERE (%s::int4 IS NULL OR home_id = %s) LIMIT 100',
        (home_id, home_id),
    )
    return {'staff': staff, 'homes': homes, 'status': 'ok'}


@router.get('/safeguarding-network')
async def safeguarding_network(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    nodes = safe_fetch_relation(
        'vw_os_safeguarding_network',
        '''
        SELECT * FROM public.vw_os_safeguarding_network
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        LIMIT 200
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    alerts = safe_fetch_relation(
        'vw_os_network_risk_alert_board',
        '''
        SELECT * FROM public.vw_os_network_risk_alert_board
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        LIMIT 100
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    return {'nodes': nodes, 'alerts': alerts, 'status': 'ok'}


@router.post('/safeguarding-network/detect-shared-risks')
async def detect_shared_risks():
    return {'status': 'queued_or_not_available'}


@router.get('/inspection/workspaces')
async def inspection_workspaces(home_id: int | None = Query(default=None)):
    workspaces = safe_fetch_relation(
        'vw_os_inspection_workspaces',
        'SELECT * FROM public.vw_os_inspection_workspaces WHERE (%s::int4 IS NULL OR home_id = %s) LIMIT 100',
        (home_id, home_id),
    )
    return {'workspaces': workspaces, 'items': [], 'status': 'ok'}


@router.get('/placement-stability')
async def placement_stability(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    placements = safe_fetch_relation(
        'vw_os_placement_stability_board',
        '''
        SELECT * FROM public.vw_os_placement_stability_board
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        LIMIT 200
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    return {'placements': placements, 'status': 'ok'}


@router.get('/care-recording')
async def care_recording(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), limit: int = Query(default=80)):
    records = safe_fetch_relation(
        'vw_os_young_person_care_record_feed',
        '''
        SELECT * FROM public.vw_os_young_person_care_record_feed
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        ORDER BY occurred_at DESC
        LIMIT %s
        ''',
        (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 300))),
    )
    summary = safe_fetch_relation(
        'vw_os_young_person_recording_summary',
        '''
        SELECT * FROM public.vw_os_young_person_recording_summary
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        LIMIT 500
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    plans = safe_fetch_relation(
        'vw_os_care_plan_review_board',
        '''
        SELECT * FROM public.vw_os_care_plan_review_board
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::int4 IS NULL OR young_person_id = %s)
        LIMIT 200
        ''',
        (home_id, home_id, young_person_id, young_person_id),
    )
    return {'records': records, 'summary': summary, 'care_plan_reviews': plans, 'status': 'ok'}


@router.get('/young-people')
async def young_people(home_id: int | None = Query(default=None), include_archived: bool = Query(default=False)):
    rows = safe_fetch_relation(
        'vw_os_young_person_profile',
        '''
        SELECT * FROM public.vw_os_young_person_profile
        WHERE (%s::int4 IS NULL OR home_id = %s)
          AND (%s::boolean = true OR archived = false)
        ORDER BY
          CASE os_state WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'monitor' THEN 2 ELSE 3 END,
          display_name ASC
        LIMIT 500
        ''',
        (home_id, home_id, include_archived),
    )

    if not rows:
        rows = safe_fetch_relation(
            'young_people',
            '''
            SELECT
              id AS young_person_id,
              home_id,
              first_name,
              last_name,
              preferred_name,
              COALESCE(preferred_name, first_name, 'Young person') AS display_name,
              date_of_birth,
              CASE WHEN date_of_birth IS NULL THEN NULL ELSE date_part('year', age(current_date, date_of_birth))::int4 END AS age,
              placement_status,
              summary_risk_level,
              archived,
              created_at,
              updated_at,
              0 AS records_today,
              0 AS manager_review_count,
              0 AS open_commands,
              0 AS critical_commands,
              'stable' AS os_state
            FROM public.young_people
            WHERE (%s::int4 IS NULL OR home_id = %s)
              AND (%s::boolean = true OR archived = false)
            ORDER BY display_name ASC
            LIMIT 500
            ''',
            (home_id, home_id, include_archived),
        )
    return {'young_people': rows, 'status': 'ok'}


@router.get('/young-person/{young_person_id}/workspace')
async def young_person_workspace(young_person_id: int, home_id: int | None = Query(default=None), limit: int = Query(default=100)):
    people = await young_people(home_id=home_id, include_archived=True)
    profile = next((p for p in people.get('young_people', []) if p.get('young_person_id') == young_person_id), None)
    timeline = safe_fetch_relation(
        'vw_os_young_person_timeline',
        '''
        SELECT * FROM public.vw_os_young_person_timeline
        WHERE young_person_id = %s
          AND (%s::int4 IS NULL OR home_id = %s)
        ORDER BY occurred_at DESC
        LIMIT %s
        ''',
        (young_person_id, home_id, home_id, max(1, min(limit, 300))),
    )
    care = await care_recording(home_id=home_id, young_person_id=young_person_id, limit=limit)
    command = await os_command_feed(home_id=home_id, young_person_id=young_person_id, limit=limit)
    patterns = await safeguarding_patterns(home_id=home_id, young_person_id=young_person_id)
    placement = await placement_stability(home_id=home_id, young_person_id=young_person_id)
    network_data = await safeguarding_network(home_id=home_id, young_person_id=young_person_id)
    chronology = await chronology_intelligence(home_id=home_id, young_person_id=young_person_id, limit=limit)
    return {
        'profile': profile,
        'timeline': timeline,
        'care_records': care.get('records', []),
        'care_plan_reviews': care.get('care_plan_reviews', []),
        'command_items': command.get('items', []),
        'safeguarding_patterns': patterns.get('patterns', []),
        'placement_stability': (placement.get('placements') or [None])[0],
        'network': network_data.get('nodes', []),
        'alerts': network_data.get('alerts', []),
        'chronology_intelligence': chronology,
        'recording_summary': care.get('summary', []),
        'status': 'ok',
    }
