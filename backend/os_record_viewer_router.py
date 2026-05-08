from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/os-command', tags=['OS Record Viewer'])

ALLOWED_RECORD_TABLES = {
    'daily_notes',
    'incidents',
    'safeguarding_records',
    'missing_episodes',
    'risk_assessments',
    'support_plans',
    'health_records',
    'education_records',
    'family_contact_records',
    'keywork_sessions',
    'tasks',
    'os_young_person_care_records',
    'os_command_items',
    'os_chronology_events',
    'os_safeguarding_patterns',
    'os_manager_reviews',
    'os_placement_stability_snapshots',
    'os_young_person_care_plan_sections',
}


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


def row_to_dict(cursor: Any, row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    if isinstance(row, dict):
        return {key: serialise(value) for key, value in row.items()}
    columns = [column[0] for column in cursor.description or []]
    return {columns[index]: serialise(value) for index, value in enumerate(row) if index < len(columns)}


def relation_exists(cursor: Any, table_name: str) -> bool:
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
        (table_name,),
    )
    row = cursor.fetchone()
    return bool(row.get('exists') if isinstance(row, dict) else row[0])


def columns_for(cursor: Any, table_name: str) -> set[str]:
    cursor.execute(
        '''
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ''',
        (table_name,),
    )
    rows = cursor.fetchall()
    return {str(row.get('column_name') if isinstance(row, dict) else row[0]) for row in rows}


def infer_title(record: dict[str, Any], table_name: str) -> str:
    for field in ('title', 'subject', 'incident_type', 'category', 'record_type', 'plan_type', 'theme', 'topic'):
        value = record.get(field)
        if value:
            return str(value)
    return table_name.replace('_', ' ').title()


def infer_summary(record: dict[str, Any]) -> str | None:
    parts: list[str] = []
    for field in (
        'summary', 'description', 'narrative', 'details', 'concern_details', 'circumstances',
        'presentation', 'behaviour_update', 'activities', 'education_update', 'health_update',
        'family_update', 'actions_required', 'outcome', 'impact_on_child', 'staff_analysis', 'notes'
    ):
        value = record.get(field)
        if value:
            parts.append(str(value))
    return ' | '.join(parts) if parts else None


def infer_occurred_at(record: dict[str, Any]) -> Any:
    for field in ('occurred_at', 'incident_datetime', 'concern_datetime', 'missing_from', 'contact_datetime', 'session_date', 'record_date', 'note_date', 'created_at'):
        if record.get(field):
            return record.get(field)
    return None


def infer_child_voice(record: dict[str, Any]) -> Any:
    for field in ('child_voice', 'young_person_voice', 'wishes_and_feelings'):
        if record.get(field):
            return record.get(field)
    return None


@router.get('/record/{table_name}/{record_id}')
async def get_os_record(
    table_name: str,
    record_id: str,
    young_person_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
) -> dict[str, Any]:
    if table_name not in ALLOWED_RECORD_TABLES:
        raise HTTPException(status_code=400, detail='Record type is not available in the OS viewer')

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, table_name):
                raise HTTPException(status_code=404, detail='Record table not found')

            columns = columns_for(cursor, table_name)
            where = ['id::text = %s']
            params: list[Any] = [record_id]
            if young_person_id is not None and 'young_person_id' in columns:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            if home_id is not None and 'home_id' in columns:
                where.append('home_id = %s')
                params.append(home_id)

            cursor.execute(
                f'SELECT * FROM public."{table_name}" WHERE ' + ' AND '.join(where) + ' LIMIT 1',
                tuple(params),
            )
            record = row_to_dict(cursor, cursor.fetchone())
            if not record:
                raise HTTPException(status_code=404, detail='Record not found')

            young_person = None
            if record.get('young_person_id') and relation_exists(cursor, 'young_people'):
                cursor.execute('SELECT * FROM public.young_people WHERE id = %s LIMIT 1', (record.get('young_person_id'),))
                young_person = row_to_dict(cursor, cursor.fetchone())

            related_command_items: list[dict[str, Any]] = []
            if relation_exists(cursor, 'os_command_items'):
                cursor.execute(
                    '''
                    SELECT *
                    FROM public.os_command_items
                    WHERE source_table = %s
                      AND source_id = %s
                    ORDER BY created_at DESC
                    LIMIT 20
                    ''',
                    (table_name, record_id),
                )
                related_command_items = [row_to_dict(cursor, row) for row in cursor.fetchall()]

            return {
                'table': table_name,
                'record_id': record_id,
                'title': infer_title(record, table_name),
                'summary': infer_summary(record),
                'occurred_at': infer_occurred_at(record),
                'child_voice': infer_child_voice(record),
                'young_person': young_person,
                'record': record,
                'related_command_items': related_command_items,
                'status': 'ok',
            }
    finally:
        if conn is not None:
            release_db_connection(conn)
