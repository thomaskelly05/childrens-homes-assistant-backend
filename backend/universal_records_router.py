from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, Query, HTTPException, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/universal-records', tags=['Universal Records'])


class UniversalRecordSearchResponse(BaseModel):
    records: list[dict[str, Any]]
    total: int
    status: str = 'ok'


class UniversalRecordCreateRequest(BaseModel):
    source_table: str = 'universal_manual_records'
    source_id: str | None = None
    record_type: str
    record_category: str | None = None
    entity_type: str = 'child'
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    title: str
    summary: str | None = None
    narrative: str | None = None
    child_voice: str | None = None
    staff_reflection: str | None = None
    staff_analysis: str | None = None
    therapeutic_analysis: str | None = None
    status: str = 'submitted'
    priority: str = 'normal'
    risk_level: str = 'low'
    review_state: str = 'not_required'
    safeguarding_relevant: bool = False
    inspection_relevant: bool = True
    chronology_visible: bool = True
    manager_review_required: bool = False
    restricted: bool = False
    sccif_area: str | None = None
    tags: list[str] = Field(default_factory=list)
    occurred_at: datetime.datetime | None = None
    due_at: datetime.datetime | None = None
    created_by: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


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


def function_exists(cursor: Any, function_name: str) -> bool:
    cursor.execute(
        '''
        SELECT EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = %s
        )
        ''',
        (function_name,),
    )
    row = cursor.fetchone()
    return bool(row.get('exists') if isinstance(row, dict) else row[0])


@router.post('', status_code=201)
async def create_universal_record(payload: UniversalRecordCreateRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                raise HTTPException(status_code=503, detail='Universal records schema is not installed')

            source_id = payload.source_id or f"manual:{datetime.datetime.utcnow().isoformat()}"
            created_by = payload.created_by
            if created_by is None:
                try:
                    created_by = int(request.headers.get('X-User-Id') or 0) or None
                except Exception:
                    created_by = None

            raw_snapshot = payload.model_dump(mode='json')
            if function_exists(cursor, 'universal_record_upsert'):
                cursor.execute(
                    '''
                    SELECT public.universal_record_upsert(
                      %s,%s,%s,%s,%s::ur_entity_type,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb
                    )
                    ''',
                    (
                        payload.source_table,
                        source_id,
                        payload.record_type,
                        payload.record_category,
                        payload.entity_type,
                        payload.provider_id,
                        payload.home_id,
                        payload.young_person_id,
                        payload.staff_id,
                        payload.adult_id,
                        payload.title,
                        payload.summary,
                        payload.narrative,
                        payload.child_voice,
                        payload.staff_reflection,
                        payload.staff_analysis,
                        payload.therapeutic_analysis,
                        payload.status,
                        payload.priority,
                        payload.risk_level,
                        payload.review_state,
                        payload.safeguarding_relevant,
                        payload.inspection_relevant,
                        payload.chronology_visible,
                        payload.manager_review_required,
                        payload.restricted,
                        payload.sccif_area,
                        payload.tags,
                        payload.occurred_at,
                        payload.due_at,
                        created_by,
                        payload.metadata,
                        raw_snapshot,
                    ),
                )
                row = cursor.fetchone()
                record_id = str(row[0] if row and not isinstance(row, dict) else row.get('universal_record_upsert'))
            else:
                cursor.execute(
                    '''
                    INSERT INTO public.universal_records (
                      source_table, source_id, record_type, record_category, entity_type,
                      provider_id, home_id, young_person_id, staff_id, adult_id,
                      title, summary, narrative, child_voice, staff_reflection, staff_analysis, therapeutic_analysis,
                      status, priority, risk_level, review_state,
                      safeguarding_relevant, inspection_relevant, chronology_visible, manager_review_required, restricted,
                      sccif_area, tags, occurred_at, due_at, created_by, metadata, raw_snapshot
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb)
                    RETURNING id
                    ''',
                    (
                        payload.source_table, source_id, payload.record_type, payload.record_category, payload.entity_type,
                        payload.provider_id, payload.home_id, payload.young_person_id, payload.staff_id, payload.adult_id,
                        payload.title, payload.summary, payload.narrative, payload.child_voice, payload.staff_reflection, payload.staff_analysis, payload.therapeutic_analysis,
                        payload.status, payload.priority, payload.risk_level, payload.review_state,
                        payload.safeguarding_relevant, payload.inspection_relevant, payload.chronology_visible, payload.manager_review_required, payload.restricted,
                        payload.sccif_area, payload.tags, payload.occurred_at, payload.due_at, created_by, payload.metadata, raw_snapshot,
                    ),
                )
                row = cursor.fetchone()
                record_id = str(row[0] if row and not isinstance(row, dict) else row.get('id'))

            if relation_exists(cursor, 'universal_record_audit_events'):
                cursor.execute(
                    '''
                    INSERT INTO public.universal_record_audit_events (record_id, source_table, source_id, event_type, event_summary, actor_id, ip_address, user_agent, after_snapshot)
                    VALUES (%s::uuid, %s, %s, 'created', 'Record created from IndiCare OS', %s, %s, %s, %s::jsonb)
                    ''',
                    (
                        record_id,
                        payload.source_table,
                        source_id,
                        created_by,
                        request.client.host if request.client else None,
                        request.headers.get('user-agent'),
                        raw_snapshot,
                    ),
                )

            conn.commit()
            return {'id': record_id, 'source_table': payload.source_table, 'source_id': source_id, 'status': 'created'}
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


@router.get('/search', response_model=UniversalRecordSearchResponse)
async def search_universal_records(
    q: str | None = Query(default=None),
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    record_type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    safeguarding: bool | None = Query(default=None),
    manager_review: bool | None = Query(default=None),
    date_from: datetime.datetime | None = Query(default=None),
    date_to: datetime.datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                return {'records': [], 'total': 0, 'status': 'missing_schema'}

            if function_exists(cursor, 'universal_record_search'):
                cursor.execute(
                    '''
                    SELECT *
                    FROM public.universal_record_search(
                      %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                    )
                    ''',
                    (q, provider_id, home_id, young_person_id, staff_id, record_type, category, status, risk_level, safeguarding, manager_review, date_from, date_to, limit, offset),
                )
                records = rows_to_dicts(cursor, cursor.fetchall())
            else:
                where = []
                params: list[Any] = []
                if q:
                    where.append('(title ILIKE %s OR summary ILIKE %s OR narrative ILIKE %s)')
                    like = f'%{q}%'
                    params.extend([like, like, like])
                if home_id is not None:
                    where.append('home_id = %s')
                    params.append(home_id)
                if young_person_id is not None:
                    where.append('young_person_id = %s')
                    params.append(young_person_id)
                if staff_id is not None:
                    where.append('staff_id = %s')
                    params.append(staff_id)
                if record_type:
                    where.append('record_type = %s')
                    params.append(record_type)
                if category:
                    where.append('record_category = %s')
                    params.append(category)
                if safeguarding is not None:
                    where.append('safeguarding_relevant = %s')
                    params.append(safeguarding)
                if manager_review is not None:
                    where.append('manager_review_required = %s')
                    params.append(manager_review)
                sql = 'SELECT * FROM public.universal_records'
                if where:
                    sql += ' WHERE ' + ' AND '.join(where)
                sql += ' ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT %s OFFSET %s'
                params.extend([limit, offset])
                cursor.execute(sql, tuple(params))
                records = rows_to_dicts(cursor, cursor.fetchall())

            cursor.execute('SELECT count(*) FROM public.universal_records')
            row = cursor.fetchone()
            total = int(row.get('count') if isinstance(row, dict) else row[0])
            return {'records': records, 'total': total, 'status': 'ok'}
    except Exception as error:
        return {'records': [], 'total': 0, 'status': 'error', 'message': str(error)}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/record/{record_id}')
async def get_universal_record(record_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'universal_records'):
                return {'record': None, 'status': 'missing_schema'}
            cursor.execute('SELECT * FROM public.universal_records WHERE id::text = %s LIMIT 1', (record_id,))
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                return {'record': None, 'status': 'not_found'}
            record = rows[0]
            links: list[dict[str, Any]] = []
            comments: list[dict[str, Any]] = []
            attachments: list[dict[str, Any]] = []
            audit: list[dict[str, Any]] = []
            quality: list[dict[str, Any]] = []
            if relation_exists(cursor, 'universal_record_links'):
                cursor.execute('SELECT l.*, r.title AS target_title, r.record_type AS target_record_type FROM public.universal_record_links l LEFT JOIN public.universal_records r ON r.id = l.target_record_id WHERE l.source_record_id::text = %s OR l.target_record_id::text = %s ORDER BY l.created_at DESC LIMIT 100', (record_id, record_id))
                links = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'universal_record_comments'):
                cursor.execute('SELECT * FROM public.universal_record_comments WHERE record_id::text = %s ORDER BY created_at DESC LIMIT 100', (record_id,))
                comments = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'universal_record_attachments'):
                cursor.execute('SELECT * FROM public.universal_record_attachments WHERE record_id::text = %s ORDER BY uploaded_at DESC LIMIT 100', (record_id,))
                attachments = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'universal_record_audit_events'):
                cursor.execute('SELECT * FROM public.universal_record_audit_events WHERE record_id::text = %s OR (source_table = %s AND source_id = %s) ORDER BY created_at DESC LIMIT 100', (record_id, record.get('source_table'), record.get('source_id')))
                audit = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'therapeutic_record_quality_checks'):
                cursor.execute('SELECT * FROM public.therapeutic_record_quality_checks WHERE record_id::text = %s ORDER BY checked_at DESC LIMIT 20', (record_id,))
                quality = rows_to_dicts(cursor, cursor.fetchall())
            return {'record': record, 'links': links, 'comments': comments, 'attachments': attachments, 'audit': audit, 'quality_checks': quality, 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/child/{young_person_id}/journey')
async def get_child_journey(young_person_id: int, q: str | None = Query(default=None), category: str | None = Query(default=None), record_type: str | None = Query(default=None), date_from: datetime.datetime | None = Query(default=None), date_to: datetime.datetime | None = Query(default=None), limit: int = Query(default=250, ge=1, le=1000)):
    result = await search_universal_records(q=q, young_person_id=young_person_id, category=category, record_type=record_type, date_from=date_from, date_to=date_to, limit=limit)
    return {'journey': result.records if isinstance(result, UniversalRecordSearchResponse) else result.get('records', []), 'status': 'ok'}


@router.get('/dashboards/home')
async def home_recording_dashboard(home_id: int | None = Query(default=None)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if relation_exists(cursor, 'vw_home_recording_dashboard'):
                cursor.execute('SELECT * FROM public.vw_home_recording_dashboard WHERE (%s::int4 IS NULL OR home_id = %s) ORDER BY home_id', (home_id, home_id))
                return {'homes': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
            return {'homes': [], 'status': 'missing_schema'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/dashboards/provider')
async def provider_recording_dashboard(provider_id: int | None = Query(default=None)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if relation_exists(cursor, 'vw_provider_recording_dashboard'):
                cursor.execute('SELECT * FROM public.vw_provider_recording_dashboard WHERE (%s::int4 IS NULL OR provider_id = %s) ORDER BY provider_id NULLS FIRST', (provider_id, provider_id))
                return {'providers': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
            return {'providers': [], 'status': 'missing_schema'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/therapeutic-forms')
async def get_therapeutic_forms(record_type: str | None = Query(default=None), applies_to: str | None = Query(default=None)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'therapeutic_form_templates'):
                return {'templates': [], 'status': 'missing_schema'}
            cursor.execute(
                '''
                SELECT t.*, COALESCE(jsonb_agg(to_jsonb(f) ORDER BY f.display_order) FILTER (WHERE f.id IS NOT NULL), '[]'::jsonb) AS fields
                FROM public.therapeutic_form_templates t
                LEFT JOIN public.therapeutic_form_fields f ON f.template_id = t.id
                WHERE t.active = true
                  AND (%s::text IS NULL OR t.record_type = %s)
                  AND (%s::text IS NULL OR t.applies_to = %s)
                GROUP BY t.id
                ORDER BY t.record_type, t.title
                ''',
                (record_type, record_type, applies_to, applies_to),
            )
            return {'templates': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
