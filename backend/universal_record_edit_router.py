from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/universal-records', tags=['Universal Record Editing'])


class UniversalRecordUpdateRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    narrative: str | None = None
    child_voice: str | None = None
    staff_reflection: str | None = None
    staff_analysis: str | None = None
    therapeutic_analysis: str | None = None
    status: str | None = None
    review_state: str | None = None
    priority: str | None = None
    risk_level: str | None = None
    safeguarding_relevant: bool | None = None
    inspection_relevant: bool | None = None
    chronology_visible: bool | None = None
    manager_review_required: bool | None = None
    restricted: bool | None = None
    sccif_area: str | None = None
    tags: list[str] | None = None
    occurred_at: datetime.datetime | None = None
    due_at: datetime.datetime | None = None
    change_reason: str | None = None
    resubmit: bool = False
    updated_by: int | None = None


class UniversalRecordAutosaveRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    narrative: str | None = None
    child_voice: str | None = None
    staff_reflection: str | None = None
    staff_analysis: str | None = None
    therapeutic_analysis: str | None = None
    updated_by: int | None = None


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
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = %s
            AND c.relkind IN ('r','v','m')
        )
        ''',
        (relation_name,),
    )
    row = cursor.fetchone()
    return bool(row.get('exists') if isinstance(row, dict) else row[0])


def actor_id_from_request(request: Request, fallback: int | None = None) -> int | None:
    if fallback is not None:
        return fallback
    try:
        return int(request.headers.get('X-User-Id') or 0) or None
    except Exception:
        return None


def ensure_version_table(cursor: Any) -> None:
    cursor.execute(
        '''
        CREATE TABLE IF NOT EXISTS public.universal_record_versions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          record_id uuid NOT NULL REFERENCES public.universal_records(id) ON DELETE CASCADE,
          version_number integer NOT NULL,
          change_type text NOT NULL DEFAULT 'edit',
          title text NULL,
          summary text NULL,
          narrative text NULL,
          child_voice text NULL,
          staff_reflection text NULL,
          staff_analysis text NULL,
          therapeutic_analysis text NULL,
          status text NULL,
          review_state text NULL,
          changed_by int4 NULL,
          changed_at timestamptz NOT NULL DEFAULT now(),
          change_reason text NULL,
          snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
          CONSTRAINT universal_record_versions_unique UNIQUE (record_id, version_number)
        )
        '''
    )
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_universal_record_versions_record ON public.universal_record_versions(record_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_universal_record_versions_changed_at ON public.universal_record_versions(changed_at DESC)')


def save_version(cursor: Any, record: dict[str, Any], change_type: str, changed_by: int | None, change_reason: str | None) -> int:
    ensure_version_table(cursor)
    cursor.execute('SELECT COALESCE(MAX(version_number), 0) + 1 FROM public.universal_record_versions WHERE record_id::text = %s', (str(record['id']),))
    row = cursor.fetchone()
    version_number = int(row.get('coalesce') if isinstance(row, dict) else row[0])
    cursor.execute(
        '''
        INSERT INTO public.universal_record_versions (
          record_id, version_number, change_type, title, summary, narrative, child_voice,
          staff_reflection, staff_analysis, therapeutic_analysis, status, review_state,
          changed_by, change_reason, snapshot
        )
        VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        ''',
        (
            record['id'],
            version_number,
            change_type,
            record.get('title'),
            record.get('summary'),
            record.get('narrative'),
            record.get('child_voice'),
            record.get('staff_reflection'),
            record.get('staff_analysis'),
            record.get('therapeutic_analysis'),
            record.get('status'),
            record.get('review_state'),
            changed_by,
            change_reason,
            record,
        ),
    )
    return version_number


def record_edit_allowed(record: dict[str, Any]) -> bool:
    status = str(record.get('status') or '').lower()
    review_state = str(record.get('review_state') or '').lower()
    return status in {'draft', 'submitted', 'returned', 'active', 'open'} or review_state in {'returned', 'required'}


@router.patch('/record/{record_id}')
async def update_universal_record(record_id: str, payload: UniversalRecordUpdateRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.updated_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                raise HTTPException(status_code=503, detail='Universal records schema is not installed')

            cursor.execute('SELECT * FROM public.universal_records WHERE id::text = %s LIMIT 1', (record_id,))
            before_rows = rows_to_dicts(cursor, cursor.fetchall())
            if not before_rows:
                raise HTTPException(status_code=404, detail='Record not found')
            before = before_rows[0]

            if not record_edit_allowed(before):
                raise HTTPException(status_code=409, detail='Approved or closed records cannot be edited without a manager unlock')

            save_version(cursor, before, 'edit', actor_id, payload.change_reason or 'Record edited')

            update_values = payload.model_dump(exclude_unset=True, exclude={'change_reason', 'resubmit', 'updated_by'})
            if payload.resubmit:
                update_values['status'] = 'submitted'
                update_values['review_state'] = 'required'
                update_values['manager_review_required'] = True

            allowed = {
                'title', 'summary', 'narrative', 'child_voice', 'staff_reflection', 'staff_analysis',
                'therapeutic_analysis', 'status', 'review_state', 'priority', 'risk_level',
                'safeguarding_relevant', 'inspection_relevant', 'chronology_visible',
                'manager_review_required', 'restricted', 'sccif_area', 'tags', 'occurred_at', 'due_at'
            }
            pairs = [(key, value) for key, value in update_values.items() if key in allowed]
            if not pairs:
                raise HTTPException(status_code=400, detail='No editable fields supplied')

            set_sql = ', '.join([f'{key} = %s' for key, _ in pairs]) + ', updated_by = %s, updated_at = now()'
            params = [value for _, value in pairs] + [actor_id, record_id]
            cursor.execute(f'UPDATE public.universal_records SET {set_sql} WHERE id::text = %s RETURNING *', tuple(params))
            after = rows_to_dicts(cursor, cursor.fetchall())[0]

            if relation_exists(cursor, 'universal_record_audit_events'):
                cursor.execute(
                    '''
                    INSERT INTO public.universal_record_audit_events (
                      record_id, source_table, source_id, event_type, event_summary,
                      before_snapshot, after_snapshot, actor_id, ip_address, user_agent
                    )
                    VALUES (%s::uuid,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s,%s)
                    ''',
                    (
                        record_id,
                        after.get('source_table'),
                        after.get('source_id'),
                        'edited_resubmitted' if payload.resubmit else 'edited',
                        payload.change_reason or ('Record amended and resubmitted' if payload.resubmit else 'Record edited'),
                        before,
                        after,
                        actor_id,
                        request.client.host if request.client else None,
                        request.headers.get('user-agent'),
                    ),
                )

            conn.commit()
            return {'record': after, 'status': 'updated'}
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as error:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/record/{record_id}/autosave')
async def autosave_universal_record(record_id: str, payload: UniversalRecordAutosaveRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.updated_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                raise HTTPException(status_code=503, detail='Universal records schema is not installed')
            cursor.execute('SELECT * FROM public.universal_records WHERE id::text = %s LIMIT 1', (record_id,))
            before_rows = rows_to_dicts(cursor, cursor.fetchall())
            if not before_rows:
                raise HTTPException(status_code=404, detail='Record not found')
            before = before_rows[0]
            if not record_edit_allowed(before):
                raise HTTPException(status_code=409, detail='This record is locked and cannot be autosaved')

            update_values = payload.model_dump(exclude_unset=True, exclude={'updated_by'})
            update_values['status'] = 'draft'
            update_values['review_state'] = 'not_required'
            pairs = [(key, value) for key, value in update_values.items() if key in {'title','summary','narrative','child_voice','staff_reflection','staff_analysis','therapeutic_analysis','status','review_state'}]
            set_sql = ', '.join([f'{key} = %s' for key, _ in pairs]) + ', updated_by = %s, updated_at = now()'
            params = [value for _, value in pairs] + [actor_id, record_id]
            cursor.execute(f'UPDATE public.universal_records SET {set_sql} WHERE id::text = %s RETURNING *', tuple(params))
            after = rows_to_dicts(cursor, cursor.fetchall())[0]
            conn.commit()
            return {'record': after, 'status': 'autosaved'}
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as error:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/record/{record_id}/versions')
async def get_universal_record_versions(record_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                raise HTTPException(status_code=503, detail='Universal records schema is not installed')
            ensure_version_table(cursor)
            cursor.execute(
                '''
                SELECT *
                FROM public.universal_record_versions
                WHERE record_id::text = %s
                ORDER BY version_number DESC
                ''',
                (record_id,),
            )
            return {'versions': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
