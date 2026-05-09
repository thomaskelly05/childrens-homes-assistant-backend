from __future__ import annotations

import datetime
import decimal
import re
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/reg44-reader', tags=['Reg 44 Report Reader'])


class Reg44ImportRequest(BaseModel):
    home_id: int
    provider_id: int | None = None
    title: str
    report_month: datetime.date | None = None
    visit_date: datetime.date | None = None
    visitor_name: str | None = None
    visitor_role: str | None = None
    source_attachment_id: str | None = None
    source_file_name: str | None = None
    source_file_url: str | None = None
    source_text: str | None = None
    created_by: int | None = None
    analyse_now: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg44EvidenceRequest(BaseModel):
    evidence_type: str = 'other'
    title: str
    evidence_text: str
    analysis: str | None = None
    impact_on_children: str | None = None
    good_practice: str | None = None
    shortfall: str | None = None
    safeguarding_relevance: str | None = None
    management_oversight: str | None = None
    source_quote: str | None = None
    source_section: str | None = None
    source_page: str | None = None
    sccif_area: str | None = None
    regulation_reference: str | None = None
    quality_standard: str | None = None
    positive: bool = False
    requires_action: bool = False
    safeguarding_relevant: bool = False
    inspection_relevant: bool = True
    reg45_relevant: bool = False
    provider_learning_relevant: bool = False
    confidence_score: float | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    created_by: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Reg44ActionRequest(BaseModel):
    evidence_item_id: str | None = None
    title: str
    action_text: str
    rationale: str | None = None
    expected_outcome: str | None = None
    responsible_person: str | None = None
    assigned_to: int | None = None
    assigned_role: str | None = None
    priority: str = 'normal'
    status: str = 'open'
    due_date: datetime.date | None = None
    safeguarding_relevant: bool = False
    inspection_relevant: bool = True
    reg45_relevant: bool = False
    provider_learning_relevant: bool = False
    young_person_id: int | None = None
    staff_id: int | None = None
    created_by: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyseRequest(BaseModel):
    force: bool = False
    created_by: int | None = None


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


def classify_evidence(sentence: str) -> dict[str, Any]:
    lower = sentence.lower()
    safeguarding_terms = ['safeguarding', 'missing', 'mfc', 'allegation', 'harm', 'risk', 'exploitation', 'self-harm', 'restraint', 'incident']
    good_terms = ['good practice', 'positive', 'warm', 'nurturing', 'child-centred', 'person-centred', 'strength', 'effective', 'improved']
    action_terms = ['must', 'should', 'action', 'recommend', 'required', 'improve', 'ensure', 'review', 'update', 'complete']
    staff_terms = ['staff', 'supervision', 'training', 'rota', 'agency']
    health_terms = ['health', 'medication', 'camhs', 'therapy', 'gp', 'dental']
    education_terms = ['education', 'school', 'attendance', 'learning', 'college']
    child_voice_terms = ['voice of the child', 'child said', 'young person said', 'wishes', 'feelings']
    environment_terms = ['environment', 'bedroom', 'home condition', 'maintenance', 'repair']
    records_terms = ['record', 'chronology', 'log', 'daily note', 'care plan', 'risk assessment']

    evidence_type = 'other'
    if any(t in lower for t in safeguarding_terms):
        evidence_type = 'safeguarding'
    elif any(t in lower for t in good_terms):
        evidence_type = 'good_practice'
    elif any(t in lower for t in staff_terms):
        evidence_type = 'staffing'
    elif any(t in lower for t in health_terms):
        evidence_type = 'health'
    elif any(t in lower for t in education_terms):
        evidence_type = 'education'
    elif any(t in lower for t in child_voice_terms):
        evidence_type = 'voice_of_child'
    elif any(t in lower for t in environment_terms):
        evidence_type = 'environment'
    elif any(t in lower for t in records_terms):
        evidence_type = 'records'

    positive = any(t in lower for t in good_terms) and not any(t in lower for t in ['not', 'lack', 'failed', 'shortfall'])
    requires_action = any(t in lower for t in action_terms)
    safeguarding_relevant = any(t in lower for t in safeguarding_terms)
    reg45_relevant = safeguarding_relevant or requires_action or positive or any(t in lower for t in ['leadership', 'management', 'quality', 'standard'])
    provider_learning_relevant = reg45_relevant or any(t in lower for t in ['provider', 'responsible individual', 'ri', 'registered manager'])

    title = sentence.strip()[:90] + ('...' if len(sentence.strip()) > 90 else '')
    return {
        'evidence_type': evidence_type,
        'title': title or 'Reg 44 finding',
        'evidence_text': sentence.strip(),
        'analysis': 'Automatically extracted from Reg 44 report for manager review.',
        'good_practice': sentence.strip() if positive else None,
        'shortfall': sentence.strip() if requires_action and not positive else None,
        'safeguarding_relevance': sentence.strip() if safeguarding_relevant else None,
        'positive': positive,
        'requires_action': requires_action,
        'safeguarding_relevant': safeguarding_relevant,
        'inspection_relevant': True,
        'reg45_relevant': reg45_relevant,
        'provider_learning_relevant': provider_learning_relevant,
        'confidence_score': 0.62,
    }


def split_findings(text: str) -> list[str]:
    clean = re.sub(r'\s+', ' ', text or '').strip()
    if not clean:
        return []
    rough = re.split(r'(?<=[.!?])\s+|\n+|\u2022|\*| - ', clean)
    findings = []
    for item in rough:
        item = item.strip(' ;:-')
        if len(item) < 35:
            continue
        if len(item) > 900:
            item = item[:900]
        findings.append(item)
    return findings[:80]


def insert_evidence(cursor: Any, report: dict[str, Any], evidence: dict[str, Any], actor_id: int | None) -> str:
    cursor.execute(
        '''
        INSERT INTO public.reg44_report_evidence_items (
          report_import_id, provider_id, home_id, evidence_type, title, evidence_text,
          analysis, impact_on_children, good_practice, shortfall, safeguarding_relevance,
          source_quote, source_section, source_page, positive, requires_action,
          safeguarding_relevant, inspection_relevant, reg45_relevant, provider_learning_relevant,
          confidence_score, created_by, metadata
        )
        VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
        RETURNING id
        ''',
        (
            report['id'], report.get('provider_id'), report['home_id'], evidence['evidence_type'], evidence['title'], evidence['evidence_text'],
            evidence.get('analysis'), evidence.get('impact_on_children'), evidence.get('good_practice'), evidence.get('shortfall'), evidence.get('safeguarding_relevance'),
            evidence.get('source_quote') or evidence['evidence_text'], evidence.get('source_section'), evidence.get('source_page'), evidence.get('positive', False), evidence.get('requires_action', False),
            evidence.get('safeguarding_relevant', False), evidence.get('inspection_relevant', True), evidence.get('reg45_relevant', False), evidence.get('provider_learning_relevant', False),
            evidence.get('confidence_score'), actor_id, evidence.get('metadata', {}),
        ),
    )
    row = cursor.fetchone()
    return str(row[0] if not isinstance(row, dict) else row.get('id'))


def insert_action_from_evidence(cursor: Any, report: dict[str, Any], evidence_id: str, evidence: dict[str, Any], actor_id: int | None) -> str | None:
    if not evidence.get('requires_action'):
        return None
    action_text = evidence.get('shortfall') or evidence.get('evidence_text')
    cursor.execute(
        '''
        INSERT INTO public.reg44_report_actions (
          report_import_id, evidence_item_id, provider_id, home_id, title, action_text,
          rationale, expected_outcome, priority, status, due_date,
          safeguarding_relevant, inspection_relevant, reg45_relevant, provider_learning_relevant,
          created_by, metadata
        )
        VALUES (%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,'open',%s,%s,%s,%s,%s,%s,%s::jsonb)
        RETURNING id
        ''',
        (
            report['id'], evidence_id, report.get('provider_id'), report['home_id'],
            'Reg 44 action - ' + evidence['title'][:70],
            action_text,
            'Action extracted from Reg 44 visitor report and requires manager review.',
            'Evidence of improvement is recorded and available for Reg 44/Reg 45 oversight.',
            'high' if evidence.get('safeguarding_relevant') else 'normal',
            datetime.date.today() + datetime.timedelta(days=14),
            evidence.get('safeguarding_relevant', False), True, evidence.get('reg45_relevant', False), evidence.get('provider_learning_relevant', False),
            actor_id, {'auto_extracted': True},
        ),
    )
    row = cursor.fetchone()
    return str(row[0] if not isinstance(row, dict) else row.get('id'))


def analyse_report(cursor: Any, report_id: str, actor_id: int | None, force: bool = False) -> dict[str, Any]:
    cursor.execute('SELECT * FROM public.reg44_report_imports WHERE id::text = %s LIMIT 1', (report_id,))
    reports = rows_to_dicts(cursor, cursor.fetchall())
    if not reports:
        raise HTTPException(status_code=404, detail='Reg 44 report import not found')
    report = reports[0]
    if report.get('status') == 'analysed' and not force:
        return {'status': 'already_analysed', 'evidence_created': 0, 'actions_created': 0}

    text = report.get('source_text') or ''
    if not text.strip():
        raise HTTPException(status_code=400, detail='No source_text is available to analyse')

    cursor.execute("UPDATE public.reg44_report_imports SET status = 'processing', updated_at = now() WHERE id::text = %s", (report_id,))
    findings = split_findings(text)
    evidence_created = 0
    actions_created = 0
    safeguarding_count = 0
    positive_count = 0
    shortfall_count = 0

    if force:
        cursor.execute('DELETE FROM public.reg44_report_actions WHERE report_import_id::text = %s AND linked_task_id IS NULL', (report_id,))
        cursor.execute('DELETE FROM public.reg44_report_evidence_items WHERE report_import_id::text = %s AND linked_task_id IS NULL', (report_id,))

    for finding in findings:
        evidence = classify_evidence(finding)
        evidence_id = insert_evidence(cursor, report, evidence, actor_id)
        evidence_created += 1
        if evidence.get('safeguarding_relevant'):
            safeguarding_count += 1
        if evidence.get('positive'):
            positive_count += 1
        if evidence.get('requires_action'):
            shortfall_count += 1
            action_id = insert_action_from_evidence(cursor, report, evidence_id, evidence, actor_id)
            if action_id:
                actions_created += 1

    summary = f'Analysed {evidence_created} extracted findings from the Reg 44 report. Identified {positive_count} good practice items, {shortfall_count} action/shortfall items and {safeguarding_count} safeguarding-relevant items.'
    cursor.execute(
        '''
        UPDATE public.reg44_report_imports
        SET status = 'analysed',
            analysis_summary = %s,
            safeguarding_summary = %s,
            good_practice_summary = %s,
            shortfalls_summary = %s,
            provider_learning_summary = %s,
            reg45_relevance_summary = %s,
            confidence_score = %s,
            updated_at = now()
        WHERE id::text = %s
        ''',
        (
            summary,
            f'{safeguarding_count} safeguarding-relevant findings were detected for review.' if safeguarding_count else 'No explicit safeguarding findings were detected in the automated pass.',
            f'{positive_count} positive/good practice findings were detected.' if positive_count else 'No explicit good practice findings were detected in the automated pass.',
            f'{shortfall_count} findings appear to require action or management review.' if shortfall_count else 'No explicit action shortfalls were detected in the automated pass.',
            'Provider learning should review all Reg 45 relevant and safeguarding relevant findings.',
            'Findings marked Reg 45 relevant are available in vw_reg44_to_reg45_learning_feed.',
            0.62,
            report_id,
        ),
    )
    cursor.execute(
        '''
        INSERT INTO public.reg44_report_reader_audit_events (report_import_id, event_type, event_summary, actor_id, after_snapshot)
        VALUES (%s::uuid, 'report_analysed', %s, %s, %s::jsonb)
        ''',
        (report_id, summary, actor_id, {'evidence_created': evidence_created, 'actions_created': actions_created}),
    )
    return {'status': 'analysed', 'evidence_created': evidence_created, 'actions_created': actions_created, 'summary': summary}


@router.post('/imports', status_code=201)
async def create_import(payload: Reg44ImportRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_report_imports'):
                raise HTTPException(status_code=503, detail='Reg 44 report reader schema is not installed')
            cursor.execute(
                '''
                SELECT public.reg44_create_import(%s,%s,%s,%s,%s,%s,%s,%s::uuid,%s,%s,%s,%s,%s::jsonb)
                ''',
                (
                    payload.home_id, payload.title, payload.provider_id, payload.report_month, payload.visit_date,
                    payload.visitor_name, payload.visitor_role, payload.source_attachment_id, payload.source_file_name,
                    payload.source_file_url, payload.source_text, actor_id, payload.metadata,
                ),
            )
            row = cursor.fetchone()
            import_id = str(row[0] if not isinstance(row, dict) else row.get('reg44_create_import'))
            analysis = None
            if payload.analyse_now and payload.source_text:
                analysis = analyse_report(cursor, import_id, actor_id, force=False)
            conn.commit()
            return {'id': import_id, 'analysis': analysis, 'status': 'created'}
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


@router.get('/imports')
async def list_imports(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), status: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_report_imports'):
                return {'imports': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if status:
                where.append('status::text = %s')
                params.append(status)
            sql = 'SELECT * FROM public.reg44_report_imports'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY COALESCE(report_month, visit_date, created_at::date) DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'imports': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/imports/{import_id}')
async def get_import(import_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute('SELECT * FROM public.reg44_report_imports WHERE id::text = %s LIMIT 1', (import_id,))
            imports = rows_to_dicts(cursor, cursor.fetchall())
            if not imports:
                raise HTTPException(status_code=404, detail='Reg 44 import not found')
            cursor.execute('SELECT * FROM public.vw_reg44_report_evidence_table WHERE report_import_id::text = %s ORDER BY created_at DESC', (import_id,))
            evidence = rows_to_dicts(cursor, cursor.fetchall())
            cursor.execute('SELECT * FROM public.vw_reg44_actions_table WHERE report_import_id::text = %s ORDER BY due_date ASC NULLS LAST, created_at DESC', (import_id,))
            actions = rows_to_dicts(cursor, cursor.fetchall())
            return {'import': imports[0], 'evidence': evidence, 'actions': actions, 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/imports/{import_id}/analyse')
async def analyse_import(import_id: str, payload: AnalyseRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            result = analyse_report(cursor, import_id, actor_id, force=payload.force)
            conn.commit()
            return result
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


@router.post('/imports/{import_id}/evidence', status_code=201)
async def add_evidence(import_id: str, payload: Reg44EvidenceRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            cursor.execute('SELECT * FROM public.reg44_report_imports WHERE id::text = %s LIMIT 1', (import_id,))
            reports = rows_to_dicts(cursor, cursor.fetchall())
            if not reports:
                raise HTTPException(status_code=404, detail='Reg 44 import not found')
            evidence = payload.model_dump()
            evidence_id = insert_evidence(cursor, reports[0], evidence, actor_id)
            conn.commit()
            return {'id': evidence_id, 'status': 'created'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/imports/{import_id}/actions', status_code=201)
async def add_action(import_id: str, payload: Reg44ActionRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            cursor.execute('SELECT * FROM public.reg44_report_imports WHERE id::text = %s LIMIT 1', (import_id,))
            reports = rows_to_dicts(cursor, cursor.fetchall())
            if not reports:
                raise HTTPException(status_code=404, detail='Reg 44 import not found')
            report = reports[0]
            cursor.execute(
                '''
                INSERT INTO public.reg44_report_actions (
                  report_import_id, evidence_item_id, provider_id, home_id, young_person_id, staff_id,
                  title, action_text, rationale, expected_outcome, responsible_person, assigned_to,
                  assigned_role, priority, status, due_date, safeguarding_relevant, inspection_relevant,
                  reg45_relevant, provider_learning_relevant, created_by, metadata
                )
                VALUES (%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                RETURNING id
                ''',
                (
                    import_id, payload.evidence_item_id, report.get('provider_id'), report['home_id'], payload.young_person_id, payload.staff_id,
                    payload.title, payload.action_text, payload.rationale, payload.expected_outcome, payload.responsible_person,
                    payload.assigned_to, payload.assigned_role, payload.priority, payload.status, payload.due_date,
                    payload.safeguarding_relevant, payload.inspection_relevant, payload.reg45_relevant, payload.provider_learning_relevant,
                    actor_id, payload.metadata,
                ),
            )
            row = cursor.fetchone()
            conn.commit()
            return {'id': str(row[0] if not isinstance(row, dict) else row.get('id')), 'status': 'created'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/actions/{action_id}/create-task')
async def create_task_from_action(action_id: str, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request)
        with conn.cursor() as cursor:
            cursor.execute('SELECT public.reg44_create_universal_task_from_action(%s::uuid,%s)', (action_id, actor_id))
            row = cursor.fetchone()
            conn.commit()
            return {'task_id': str(row[0] if not isinstance(row, dict) else row.get('reg44_create_universal_task_from_action')), 'status': 'created'}
    except Exception as error:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/evidence')
async def list_evidence(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), reg45_relevant: bool | None = Query(default=None), safeguarding_relevant: bool | None = Query(default=None), limit: int = Query(default=200, ge=1, le=1000)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_reg44_report_evidence_table'):
                return {'evidence': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if reg45_relevant is not None:
                where.append('reg45_relevant = %s')
                params.append(reg45_relevant)
            if safeguarding_relevant is not None:
                where.append('safeguarding_relevant = %s')
                params.append(safeguarding_relevant)
            sql = 'SELECT * FROM public.vw_reg44_report_evidence_table'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY created_at DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'evidence': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/actions')
async def list_actions(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), status: str | None = Query(default=None), limit: int = Query(default=200, ge=1, le=1000)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_reg44_actions_table'):
                return {'actions': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if status:
                where.append('status::text = %s')
                params.append(status)
            sql = 'SELECT * FROM public.vw_reg44_actions_table'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY due_date ASC NULLS LAST, created_at DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'actions': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
