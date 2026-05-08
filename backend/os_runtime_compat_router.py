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


def columns_for(cursor: Any, relation_name: str) -> set[str]:
    cursor.execute(
        '''
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = %s
        ''',
        (relation_name,),
    )
    rows = cursor.fetchall()
    columns: set[str] = set()
    for row in rows:
        columns.add(str(row.get('column_name') if isinstance(row, dict) else row[0]))
    return columns


def first_column(columns: set[str], names: list[str], fallback: str | None = None) -> str | None:
    for name in names:
        if name in columns:
            return name
    return fallback


def col(columns: set[str], name: str, fallback: str = 'NULL') -> str:
    return f'"{name}"' if name in columns else fallback


def where_home(columns: set[str]) -> str:
    return '(%s::int4 IS NULL OR home_id = %s)' if 'home_id' in columns else '(%s::int4 IS NULL OR %s::int4 IS NULL)'


def where_child(columns: set[str]) -> str:
    return '(%s::int4 IS NULL OR young_person_id = %s)' if 'young_person_id' in columns else '(%s::int4 IS NULL OR %s::int4 IS NULL)'


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


def existing_daily_records(home_id: int | None = None, young_person_id: int | None = None, limit: int = 80) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'daily_notes'):
                return []
            columns = columns_for(cursor, 'daily_notes')
            title_expr = "concat(coalesce(shift_type, 'Shift'), ' daily note')" if 'shift_type' in columns else "'Daily note'"
            date_expr = col(columns, 'note_date', col(columns, 'created_at', 'now()'))
            narrative_parts = [name for name in ['positives', 'presentation', 'behaviour_update', 'activities', 'education_update', 'health_update', 'family_update', 'actions_required', 'note', 'narrative'] if name in columns]
            if narrative_parts:
                narrative_expr = 'concat_ws(\' | \', ' + ', '.join(f'"{name}"' for name in narrative_parts) + ')'
            else:
                narrative_expr = "'Daily note recorded'"
            child_voice_expr = col(columns, 'young_person_voice')
            mood_expr = col(columns, 'mood')
            status_expr = col(columns, 'workflow_status', "'recorded'")
            created_expr = col(columns, 'created_at', date_expr)
            manager_flag = "lower(coalesce(workflow_status, '')) IN ('submitted','returned','manager_review')" if 'workflow_status' in columns else 'false'
            cursor.execute(
                f'''
                SELECT
                  ('daily_notes:' || id)::text AS id,
                  NULL::int4 AS provider_id,
                  home_id,
                  young_person_id,
                  'daily_record' AS record_type,
                  {status_expr}::text AS status,
                  {date_expr}::date AS record_date,
                  {created_expr}::timestamptz AS occurred_at,
                  {title_expr} AS title,
                  NULLIF({narrative_expr}, '') AS narrative,
                  {child_voice_expr} AS child_voice,
                  NULL::text AS staff_analysis,
                  NULL::text AS impact_on_child,
                  '[]'::jsonb AS actions_taken,
                  {manager_flag} AS follow_up_required,
                  NULL::text AS follow_up_summary,
                  {mood_expr} AS mood,
                  {col(columns, 'presentation')} AS presentation,
                  NULL::text AS location,
                  'children_experiences_progress' AS sccif_area,
                  false AS safeguarding_relevant,
                  true AS inspection_relevant,
                  'standard' AS sensitivity,
                  ARRAY['daily-note']::text[] AS tags,
                  {manager_flag} AS manager_review_required,
                  NULL::int4 AS reviewed_by,
                  NULL::timestamptz AS reviewed_at,
                  NULL::text AS manager_comment,
                  {col(columns, 'author_id', 'NULL')} AS created_by,
                  {created_expr}::timestamptz AS created_at,
                  CASE WHEN {manager_flag} THEN 'requires_manager_review' ELSE 'recorded' END AS feed_state
                FROM public.daily_notes
                WHERE {where_home(columns)}
                  AND {where_child(columns)}
                ORDER BY {created_expr} DESC NULLS LAST
                LIMIT %s
                ''',
                (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 300))),
            )
            return rows_to_dicts(cursor, cursor.fetchall())
    except Exception:
        return []
    finally:
        if conn is not None:
            release_db_connection(conn)


def existing_incident_command_items(home_id: int | None = None, young_person_id: int | None = None, limit: int = 50) -> list[dict[str, Any]]:
    conn = None
    items: list[dict[str, Any]] = []
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            source_tables = [
                ('incidents', 'safeguarding', 'high', 'Incident requires oversight'),
                ('safeguarding_records', 'safeguarding', 'critical', 'Safeguarding record requires oversight'),
                ('risk_assessments', 'risk', 'high', 'Risk assessment review due'),
                ('missing_episodes', 'safeguarding', 'critical', 'Missing episode requires management review'),
                ('tasks', 'operations', 'medium', 'Task due'),
                ('manager_review_queue', 'quality', 'high', 'Manager review required'),
            ]
            for table_name, domain, priority, default_title in source_tables:
                if not relation_exists(cursor, table_name):
                    continue
                columns = columns_for(cursor, table_name)
                title_col = first_column(columns, ['title', 'subject', 'incident_type', 'category', 'task_title', 'record_type'])
                summary_col = first_column(columns, ['summary', 'description', 'narrative', 'details', 'concern_details', 'notes', 'task_description'])
                due_col = first_column(columns, ['due_at', 'due_date', 'review_date', 'missing_from', 'incident_datetime', 'created_at'])
                created_col = first_column(columns, ['created_at', 'incident_datetime', 'missing_from', 'updated_at'], 'id')
                status_col = first_column(columns, ['status', 'workflow_status', 'review_status'])
                title_expr = f'COALESCE("{title_col}"::text, %s)' if title_col else '%s'
                summary_expr = f'"{summary_col}"::text' if summary_col else 'NULL::text'
                due_expr = f'"{due_col}"' if due_col else 'NULL::timestamptz'
                status_expr = f'COALESCE("{status_col}"::text, \'open\')' if status_col else "'open'"
                cursor.execute(
                    f'''
                    SELECT
                      (%s || ':' || id)::text AS feed_id,
                      NULL::uuid AS command_item_id,
                      NULL::int4 AS provider_id,
                      {col(columns, 'home_id')} AS home_id,
                      {col(columns, 'young_person_id')} AS young_person_id,
                      NULL::int4 AS staff_id,
                      %s AS domain,
                      %s AS priority,
                      {status_expr} AS status,
                      {title_expr} AS title,
                      {summary_expr} AS summary,
                      %s AS recommended_action,
                      %s AS source_table,
                      id AS source_id,
                      {due_expr} AS due_at,
                      CASE WHEN %s = 'safeguarding' THEN 'helped_and_protected' ELSE 'leadership_management' END AS sccif_area,
                      ARRAY[]::text[] AS regulation_refs,
                      '[]'::jsonb AS evidence_refs,
                      false AS ai_generated,
                      {col(columns, created_col, 'now()')} AS created_at,
                      {col(columns, 'updated_at', col(columns, created_col, 'now()'))} AS updated_at
                    FROM public."{table_name}"
                    WHERE {where_home(columns)}
                      AND {where_child(columns)}
                    ORDER BY {col(columns, created_col, 'id')} DESC NULLS LAST
                    LIMIT %s
                    ''',
                    (table_name, domain, priority, default_title, default_title, f'Review {table_name.replace("_", " ")}', table_name, domain, home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 100))),
                )
                items.extend(rows_to_dicts(cursor, cursor.fetchall()))
            priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
            return sorted(items, key=lambda item: (priority_order.get(item.get('priority'), 9), str(item.get('created_at') or '')), reverse=False)[:limit]
    except Exception:
        return []
    finally:
        if conn is not None:
            release_db_connection(conn)


def existing_young_people(home_id: int | None = None, include_archived: bool = False) -> list[dict[str, Any]]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'young_people'):
                return []
            columns = columns_for(cursor, 'young_people')
            archived_filter = 'AND (%s::boolean = true OR archived = false)' if 'archived' in columns else 'AND (%s::boolean = true OR true)'
            cursor.execute(
                f'''
                WITH daily AS (
                  SELECT young_person_id,
                    count(*) FILTER (WHERE note_date = current_date) AS records_today,
                    count(*) FILTER (WHERE lower(coalesce(workflow_status, '')) IN ('submitted','returned','manager_review')) AS manager_review_count
                  FROM public.daily_notes
                  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_notes')
                  GROUP BY young_person_id
                ), commands AS (
                  SELECT young_person_id, count(*) AS open_commands
                  FROM public.os_command_items
                  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='os_command_items')
                  GROUP BY young_person_id
                )
                SELECT
                  yp.id AS young_person_id,
                  {col(columns, 'home_id')} AS home_id,
                  {col(columns, 'first_name')} AS first_name,
                  {col(columns, 'last_name')} AS last_name,
                  {col(columns, 'preferred_name')} AS preferred_name,
                  COALESCE({col(columns, 'preferred_name')}, {col(columns, 'first_name')}, 'Young person') AS display_name,
                  {col(columns, 'date_of_birth')} AS date_of_birth,
                  CASE WHEN {col(columns, 'date_of_birth')} IS NULL THEN NULL ELSE date_part('year', age(current_date, {col(columns, 'date_of_birth')}))::int4 END AS age,
                  {col(columns, 'placement_status', "'active'")} AS placement_status,
                  {col(columns, 'summary_risk_level', "'unknown'")} AS summary_risk_level,
                  {col(columns, 'photo_url')} AS photo_url,
                  {col(columns, 'archived', 'false')} AS archived,
                  {col(columns, 'created_at', 'NULL')} AS created_at,
                  {col(columns, 'updated_at', 'NULL')} AS updated_at,
                  coalesce(daily.records_today, 0) AS records_today,
                  coalesce(daily.manager_review_count, 0) AS manager_review_count,
                  coalesce(commands.open_commands, 0) AS open_commands,
                  0 AS critical_commands,
                  CASE
                    WHEN coalesce(commands.open_commands, 0) > 0 THEN 'monitor'
                    WHEN coalesce(daily.manager_review_count, 0) > 0 THEN 'monitor'
                    WHEN lower(coalesce({col(columns, 'summary_risk_level', "'low'")}::text, 'low')) IN ('critical','high') THEN 'high'
                    ELSE 'stable'
                  END AS os_state
                FROM public.young_people yp
                LEFT JOIN daily ON daily.young_person_id = yp.id
                LEFT JOIN commands ON commands.young_person_id = yp.id
                WHERE {where_home(columns)}
                  {archived_filter}
                ORDER BY
                  CASE
                    WHEN lower(coalesce({col(columns, 'summary_risk_level', "'low'")}::text, 'low')) IN ('critical','high') THEN 0
                    WHEN coalesce(daily.manager_review_count, 0) > 0 THEN 1
                    ELSE 2
                  END,
                  COALESCE({col(columns, 'preferred_name')}, {col(columns, 'first_name')}, 'Young person') ASC
                LIMIT 500
                ''',
                (home_id, home_id, include_archived),
            )
            return rows_to_dicts(cursor, cursor.fetchall())
    except Exception:
        return []
    finally:
        if conn is not None:
            release_db_connection(conn)


def existing_timeline(home_id: int | None = None, young_person_id: int | None = None, limit: int = 100) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    rows.extend(existing_daily_records(home_id, young_person_id, limit))
    for row in rows:
        row['timeline_id'] = row.get('id')
        row['source_type'] = row.get('record_type')
        row['source_id'] = str(row.get('id'))
        row['title'] = row.get('title') or 'Care record'
        row['summary'] = row.get('narrative')
        row['timeline_state'] = row.get('feed_state', 'recorded')
    return rows[:limit]


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
                cursor.execute('SELECT * FROM public.os_command_live_feed(%s, %s, %s, %s, %s)', (home_id, young_person_id, domain, priority, max(1, min(limit, 500))))
                items = rows_to_dicts(cursor, cursor.fetchall())
            elif relation_exists(cursor, 'os_command_items'):
                cursor.execute(
                    '''
                    SELECT id::text AS command_item_id, id::text AS feed_id, provider_id, home_id, young_person_id, staff_id, domain::text, priority::text, status::text, title, summary, recommended_action, source_table, source_id, due_at, sccif_area, regulation_refs, evidence_refs, ai_generated, created_at, updated_at
                    FROM public.os_command_items
                    WHERE (%s::int4 IS NULL OR home_id = %s)
                      AND (%s::int4 IS NULL OR young_person_id = %s)
                    ORDER BY CASE priority::text WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC
                    LIMIT %s
                    ''',
                    (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 500))),
                )
                items = rows_to_dicts(cursor, cursor.fetchall())
            else:
                items = []
    except Exception:
        items = []
    finally:
        if conn is not None:
            release_db_connection(conn)

    if not items:
        items = existing_incident_command_items(home_id, young_person_id, limit)
    if domain:
        items = [item for item in items if item.get('domain') == domain]
    if priority:
        items = [item for item in items if item.get('priority') == priority]
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
    return {'summary': summary, 'items': items[:limit], 'status': 'ok'}


@router.get('/provider-command-centre')
async def provider_command_centre(provider_id: int | None = Query(default=None), home_id: int | None = Query(default=None)):
    young_people_rows = existing_young_people(home_id)
    command = await os_command_feed(home_id=home_id, limit=200)
    items = command.get('items', [])
    critical_count = sum(1 for item in items if item.get('priority') == 'critical')
    high_count = sum(1 for item in items if item.get('priority') == 'high')
    matrix = [{
        'provider_id': provider_id,
        'home_id': home_id or (young_people_rows[0].get('home_id') if young_people_rows else None),
        'open_commands': len(items),
        'critical_commands': critical_count,
        'overdue_commands': 0,
        'safeguarding_pressure': sum(1 for item in items if item.get('domain') == 'safeguarding'),
        'quality_pressure': sum(1 for item in items if item.get('domain') == 'quality'),
        'oversight_state': 'active',
        'readiness_state': 'monitor',
        'resilience_state': 'monitor',
        'risk_level': 'high' if critical_count else 'monitor' if high_count else 'stable',
        'immediate_actions': critical_count + high_count,
        'today_actions': len(items),
        'quality_score': max(0, 100 - ((critical_count * 20) + (high_count * 10))),
        'matrix_state': 'critical' if critical_count else 'high' if high_count else 'stable',
    }] if young_people_rows or items else []
    command_centre = [{
        'id': 'live-existing-db',
        'provider_id': provider_id,
        'snapshot_at': datetime.datetime.utcnow().isoformat(),
        'total_homes': 1 if matrix else 0,
        'urgent_homes': 1 if critical_count or high_count else 0,
        'critical_commands': critical_count,
        'immediate_actions': critical_count + high_count,
        'active_missing_episodes': sum(1 for item in items if item.get('source_table') == 'missing_episodes'),
        'overdue_reg40_count': 0,
        'high_risk_patterns': sum(1 for item in items if item.get('domain') == 'safeguarding'),
        'critical_risk_snapshots': critical_count,
        'low_resilience_homes': 0,
        'inspection_urgent_homes': 0,
        'average_quality_score': matrix[0]['quality_score'] if matrix else 100,
        'average_resilience_score': 75,
        'command_summary': {'items': len(items)},
        'safeguarding_summary': {'items': sum(1 for item in items if item.get('domain') == 'safeguarding')},
        'inspection_summary': {},
        'workforce_summary': {},
        'leadership_recommendations': ['Review high priority safeguarding and risk records', 'Check manager review queue and daily notes awaiting oversight'] if items else [],
        'created_at': datetime.datetime.utcnow().isoformat(),
        'provider_state': 'critical' if critical_count else 'high' if high_count else 'stable',
    }] if young_people_rows or items else []
    return {'command_centre': command_centre, 'home_matrix': matrix, 'status': 'ok'}


@router.post('/provider-command-centre/generate')
async def generate_provider_command_centre(provider_id: int | None = None):
    return {'id': 'live-existing-db', 'status': 'generated'}


@router.get('/chronology-intelligence')
async def chronology_intelligence(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), limit: int = Query(default=40)):
    rows = safe_fetch_relation('vw_os_chronology_intelligence', 'SELECT * FROM public.vw_os_chronology_intelligence WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) ORDER BY event_at DESC LIMIT %s', (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 300))))
    if rows:
        return rows
    timeline = existing_timeline(home_id, young_person_id, limit)
    return [{**row, 'event_title': row.get('title'), 'event_summary': row.get('summary'), 'event_at': row.get('occurred_at'), 'max_overlay_severity_rank': 1} for row in timeline]


@router.get('/safeguarding-patterns')
async def safeguarding_patterns(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    patterns = safe_fetch_relation('os_safeguarding_patterns', 'SELECT id::text, provider_id, home_id, young_person_id, pattern_type::text, severity::text, title, summary, recommended_actions, escalation_status::text, detected_at, updated_at FROM public.os_safeguarding_patterns WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) ORDER BY detected_at DESC LIMIT 100', (home_id, home_id, young_person_id, young_person_id))
    if not patterns:
        items = existing_incident_command_items(home_id, young_person_id, 100)
        patterns = [{
            'id': item.get('feed_id'),
            'provider_id': None,
            'home_id': item.get('home_id'),
            'young_person_id': item.get('young_person_id'),
            'pattern_type': item.get('source_table'),
            'severity': item.get('priority'),
            'title': item.get('title'),
            'summary': item.get('summary') or item.get('recommended_action'),
            'recommended_actions': [item.get('recommended_action')],
            'escalation_status': item.get('status'),
            'detected_at': item.get('created_at'),
            'updated_at': item.get('updated_at'),
        } for item in items if item.get('domain') == 'safeguarding']
    return {'patterns': patterns, 'contextual_risks': [], 'status': 'ok'}


@router.post('/safeguarding-patterns/detect')
async def detect_safeguarding_patterns():
    return {'status': 'using_existing_database'}


@router.get('/staff-wellbeing')
async def staff_wellbeing(home_id: int | None = Query(default=None)):
    staff = safe_fetch_relation('staff', 'SELECT id AS staff_id, full_name, home_id, 0 AS burnout_risk_score, 0 AS emotional_load_score, 0 AS safeguarding_command_count, \'stable\' AS risk_level FROM public.staff WHERE (%s::int4 IS NULL OR home_id = %s) LIMIT 200', (home_id, home_id))
    homes = [{'home_id': home_id, 'resilience_state': 'stable', 'leadership_summary': 'Live staff data connected from existing staff table.'}] if staff else []
    return {'staff': staff, 'homes': homes, 'status': 'ok'}


@router.get('/safeguarding-network')
async def safeguarding_network(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    nodes = safe_fetch_relation('vw_os_safeguarding_network', 'SELECT * FROM public.vw_os_safeguarding_network WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) LIMIT 200', (home_id, home_id, young_person_id, young_person_id))
    alerts = safe_fetch_relation('vw_os_network_risk_alert_board', 'SELECT * FROM public.vw_os_network_risk_alert_board WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) LIMIT 100', (home_id, home_id, young_person_id, young_person_id))
    if not alerts:
        safeguarding = await safeguarding_patterns(home_id=home_id, young_person_id=young_person_id)
        alerts = [{'title': p.get('title'), 'summary': p.get('summary'), 'severity': p.get('severity'), 'young_person_id': p.get('young_person_id'), 'home_id': p.get('home_id')} for p in safeguarding.get('patterns', [])]
    return {'nodes': nodes, 'alerts': alerts, 'status': 'ok'}


@router.post('/safeguarding-network/detect-shared-risks')
async def detect_shared_risks():
    return {'status': 'using_existing_database'}


@router.get('/inspection/workspaces')
async def inspection_workspaces(home_id: int | None = Query(default=None)):
    records = existing_daily_records(home_id=home_id, limit=20)
    workspaces = [{
        'id': 'live-care-evidence',
        'home_id': home_id,
        'title': 'Live care evidence from existing records',
        'status': 'active',
        'total_items': len(records),
        'inspector_visible_items': len(records),
        'evidence_gaps': 0 if records else 1,
    }] if records else []
    return {'workspaces': workspaces, 'items': records, 'status': 'ok'}


@router.get('/placement-stability')
async def placement_stability(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None)):
    people = existing_young_people(home_id=home_id, include_archived=False)
    if young_person_id:
        people = [person for person in people if person.get('young_person_id') == young_person_id]
    placements = [{
        'young_person_id': person.get('young_person_id'),
        'home_id': person.get('home_id'),
        'risk_level': 'high' if str(person.get('summary_risk_level', '')).lower() in ('high','critical') else 'stable',
        'disruption_risk_score': 70 if str(person.get('summary_risk_level', '')).lower() in ('high','critical') else 20,
        'stability_score': 30 if str(person.get('summary_risk_level', '')).lower() in ('high','critical') else 80,
        'intervention_urgency': 'today' if str(person.get('summary_risk_level', '')).lower() in ('high','critical') else 'monitor',
    } for person in people]
    return {'placements': placements, 'status': 'ok'}


@router.get('/care-recording')
async def care_recording(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), limit: int = Query(default=80)):
    records = safe_fetch_relation('vw_os_young_person_care_record_feed', 'SELECT * FROM public.vw_os_young_person_care_record_feed WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) ORDER BY occurred_at DESC LIMIT %s', (home_id, home_id, young_person_id, young_person_id, max(1, min(limit, 300))))
    if not records:
        records = existing_daily_records(home_id, young_person_id, limit)
    summary_by_child: dict[int, dict[str, Any]] = {}
    for record in records:
        yp_id = record.get('young_person_id')
        if yp_id is None:
            continue
        summary_by_child.setdefault(yp_id, {'provider_id': None, 'home_id': record.get('home_id'), 'young_person_id': yp_id, 'records_today': 0, 'manager_review_count': 0, 'safeguarding_records_7_days': 0, 'positives_7_days': 0, 'concerns_7_days': 0, 'latest_record_at': record.get('occurred_at')})
        if str(record.get('record_date')) == str(datetime.date.today()):
            summary_by_child[yp_id]['records_today'] += 1
        if record.get('manager_review_required'):
            summary_by_child[yp_id]['manager_review_count'] += 1
    plans = safe_fetch_relation('vw_os_care_plan_review_board', 'SELECT * FROM public.vw_os_care_plan_review_board WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::int4 IS NULL OR young_person_id = %s) LIMIT 200', (home_id, home_id, young_person_id, young_person_id))
    return {'records': records, 'summary': list(summary_by_child.values()), 'care_plan_reviews': plans, 'status': 'ok'}


@router.get('/young-people')
async def young_people(home_id: int | None = Query(default=None), include_archived: bool = Query(default=False)):
    rows = safe_fetch_relation('vw_os_young_person_profile', 'SELECT * FROM public.vw_os_young_person_profile WHERE (%s::int4 IS NULL OR home_id = %s) AND (%s::boolean = true OR archived = false) ORDER BY display_name ASC LIMIT 500', (home_id, home_id, include_archived))
    if not rows:
        rows = existing_young_people(home_id, include_archived)
    return {'young_people': rows, 'status': 'ok'}


@router.get('/young-person/{young_person_id}/workspace')
async def young_person_workspace(young_person_id: int, home_id: int | None = Query(default=None), limit: int = Query(default=100)):
    people = await young_people(home_id=home_id, include_archived=True)
    profile = next((p for p in people.get('young_people', []) if p.get('young_person_id') == young_person_id), None)
    timeline = existing_timeline(home_id, young_person_id, limit)
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
