from __future__ import annotations

import datetime
import decimal
import re
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection
from services.child_documents_service import ChildDocumentsService
from services.document_ai_service import review_document

router = APIRouter(prefix='/api/document-intelligence', tags=['Universal Document Intelligence'])
child_documents_service = ChildDocumentsService()


class AnalyseDocumentRequest(BaseModel):
    attachment_id: str | None = None
    source_record_id: str | None = None
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    file_name: str | None = None
    mime_type: str | None = None
    source_text: str | None = None
    created_by: int | None = None
    create_reminders: bool = True
    create_tasks: bool = True
    route_now: bool = True
    create_child_document: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class RouteDocumentRequest(BaseModel):
    route_now: bool = True
    routed_by: int | None = None


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


def classify_document(text: str, file_name: str | None = None) -> tuple[str, str]:
    haystack = f'{file_name or ""} {text or ""}'.lower()
    rules = [
        ('ehcp', ['education health and care plan', 'ehcp']),
        ('pep', ['personal education plan', 'pep meeting', 'pep review']),
        ('education_plan', ['education plan', 'school report', 'attendance', 'virtual school']),
        ('placement_plan', ['placement plan', 'delegated authority', 'placement agreement']),
        ('care_plan', ['care plan', 'care planning']),
        ('risk_assessment', ['risk assessment', 'risk management', 'identified risks']),
        ('support_plan', ['support plan', 'behaviour support', 'emotional regulation plan']),
        ('health_plan', ['health plan', 'health assessment', 'medical plan']),
        ('medication_document', ['medication', 'mar chart', 'prescription']),
        ('therapy_report', ['therapy report', 'camhs', 'therapeutic assessment']),
        ('lac_review', ['lac review', 'looked after child review', 'statutory review']),
        ('pathway_plan', ['pathway plan', 'leaving care']),
        ('court_order', ['court order', 'interim care order', 'care order']),
        ('safeguarding_document', ['safeguarding', 'strategy meeting', 'section 47', 'child protection']),
        ('missing_protocol', ['missing protocol', 'missing from care', 'mfc']),
        ('consent_form', ['consent form', 'consent to']),
        ('staff_training', ['training certificate', 'certificate of completion']),
        ('staff_supervision', ['supervision record', 'staff supervision']),
        ('safer_recruitment', ['dbs', 'right to work', 'safer recruitment', 'reference']),
        ('policy', ['policy', 'procedure']),
        ('insurance', ['insurance certificate', 'employers liability', 'public liability']),
        ('reg44', ['regulation 44', 'reg 44', 'independent visitor']),
        ('reg45', ['regulation 45', 'reg 45', 'quality of care review']),
        ('inspection_report', ['ofsted', 'inspection report']),
    ]
    for category, needles in rules:
        if any(n in haystack for n in needles):
            return category, category.replace('_', ' ').title()
    return 'other', (file_name or 'Uploaded document')


def route_for_category(category: str) -> str:
    mapping = {
        'ehcp': 'education', 'pep': 'education', 'education_plan': 'education',
        'health_plan': 'health', 'medication_document': 'health', 'therapy_report': 'health',
        'care_plan': 'care_plan', 'placement_plan': 'placement', 'risk_assessment': 'risk',
        'support_plan': 'care_plan', 'lac_review': 'care_plan', 'pathway_plan': 'care_plan',
        'court_order': 'legal', 'safeguarding_document': 'safeguarding', 'missing_protocol': 'safeguarding',
        'consent_form': 'legal', 'staff_training': 'staff_record', 'staff_supervision': 'staff_record',
        'safer_recruitment': 'staff_record', 'policy': 'home_compliance', 'home_certificate': 'home_compliance',
        'insurance': 'home_compliance', 'reg44': 'reg44', 'reg45': 'reg45', 'inspection_report': 'quality',
    }
    return mapping.get(category, 'documents')


def child_document_type_for_category(category: str) -> str | None:
    mapping = {
        'ehcp': 'Personal Education Plan',
        'pep': 'Personal Education Plan',
        'education_plan': 'Personal Education Plan',
        'placement_plan': 'Placement Plan',
        'care_plan': 'Care Plan',
        'lac_review': 'Care Plan',
        'pathway_plan': 'Care Plan',
        'risk_assessment': 'Risk Assessment',
        'missing_protocol': 'Missing From Care Plan',
        'support_plan': 'Behaviour Support Plan',
        'health_plan': 'Health Care Plan',
        'medication_document': 'Health Care Plan',
        'therapy_report': 'Health Care Plan',
    }
    return mapping.get(category)


def parse_dates(text: str) -> dict[str, datetime.date | None]:
    dates: list[datetime.date] = []
    today = datetime.date.today()
    for match in re.finditer(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', text or ''):
        day, month, year = match.groups()
        year = int(year) + (2000 if int(year) < 100 else 0)
        try:
            dates.append(datetime.date(year, int(month), int(day)))
        except ValueError:
            pass
    for match in re.finditer(r'(\d{4})-(\d{1,2})-(\d{1,2})', text or ''):
        year, month, day = match.groups()
        try:
            dates.append(datetime.date(int(year), int(month), int(day)))
        except ValueError:
            pass
    future_dates = sorted([d for d in dates if d >= today])
    past_dates = sorted([d for d in dates if d < today], reverse=True)
    lower = text.lower() if text else ''
    expiry = future_dates[0] if future_dates and any(word in lower for word in ['expiry', 'expires', 'valid until', 'renewal due']) else None
    review = future_dates[0] if future_dates and any(word in lower for word in ['review date', 'next review', 'review due', 'pep review', 'annual review']) else None
    if not expiry and not review and future_dates:
        review = future_dates[0]
    return {'document_date': past_dates[0] if past_dates else None, 'effective_date': past_dates[0] if past_dates else None, 'expiry_date': expiry, 'review_date': review, 'next_action_date': expiry or review}


def make_summary(text: str, category: str) -> dict[str, str | None]:
    preview = ' '.join((text or '').split())[:900]
    return {
        'summary': preview or None,
        'key_information': preview or None,
        'education_summary': preview if category in {'pep', 'ehcp', 'education_plan'} else None,
        'health_summary': preview if category in {'health_plan', 'medication_document', 'therapy_report'} else None,
        'placement_summary': preview if category in {'placement_plan', 'care_plan', 'support_plan'} else None,
        'safeguarding_summary': preview if category in {'risk_assessment', 'safeguarding_document', 'missing_protocol'} else None,
        'compliance_summary': preview if category in {'policy', 'insurance', 'reg44', 'reg45', 'inspection_report', 'home_certificate'} else None,
    }


def create_route(cursor: Any, job_id: str, category: str, route_target: str, title: str, summary: str | None, review: dict[str, Any], target_record_id: str | None = None) -> str:
    cursor.execute(
        '''
        INSERT INTO public.document_intelligence_routes (job_id, route_target, target_table, target_record_id, route_title, route_summary, extracted_payload)
        VALUES (%s::uuid,%s,%s,%s,%s,%s,%s::jsonb)
        RETURNING id
        ''',
        (job_id, route_target, route_target, target_record_id, title, summary, {'category': category, 'review': review}),
    )
    row = cursor.fetchone()
    return str(row[0] if not isinstance(row, dict) else row.get('id'))


def create_reminders(cursor: Any, job: dict[str, Any], actor_id: int | None, create_tasks: bool = True) -> list[str]:
    reminders: list[str] = []
    for date_field, reminder_type in [('expiry_date', 'document_expiry'), ('review_date', 'document_review')]:
        target = job.get(date_field)
        if not target:
            continue
        target_date = datetime.date.fromisoformat(str(target)[:10]) if not isinstance(target, datetime.date) else target
        reminder_date = max(target_date - datetime.timedelta(days=30), datetime.date.today())
        cursor.execute(
            '''
            INSERT INTO public.document_expiry_reminders (job_id, attachment_id, provider_id, home_id, young_person_id, staff_id, adult_id, reminder_type, title, description, reminder_date, due_date, priority, created_by)
            VALUES (%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
            ''',
            (job['id'], job.get('attachment_id'), job.get('provider_id'), job.get('home_id'), job.get('young_person_id'), job.get('staff_id'), job.get('adult_id'), reminder_type, f"Review {job.get('detected_title') or job.get('file_name') or 'document'}", f"Document is due for {'expiry' if reminder_type == 'document_expiry' else 'review'} on {target_date.isoformat()}.", reminder_date, target_date, 'high' if reminder_type == 'document_expiry' else 'normal', actor_id),
        )
        row = cursor.fetchone()
        reminder_id = str(row[0] if not isinstance(row, dict) else row.get('id'))
        reminders.append(reminder_id)
        if create_tasks:
            cursor.execute('SELECT public.document_intelligence_create_task_for_reminder(%s::uuid,%s)', (reminder_id, actor_id))
    return reminders


def create_child_document_from_intelligence(payload: AnalyseDocumentRequest, category: str, detected_title: str, dates: dict[str, Any], summaries: dict[str, Any], review: dict[str, Any], actor_id: int | None) -> dict[str, Any] | None:
    doc_type = child_document_type_for_category(category)
    if not doc_type or not payload.young_person_id:
        return None
    sections = {
        'Imported document summary': summaries.get('summary') or '',
        'Key information extracted': summaries.get('key_information') or '',
        'AI review': review.get('summary') or '',
        'Safeguarding considerations': '\n'.join(review.get('safeguarding_considerations') or []),
        'Linked record suggestions': '\n'.join([f"{item.get('record_type')}: {item.get('reason')}" for item in (review.get('linked_record_suggestions') or [])]),
        'Review notes': f"Document date: {dates.get('document_date') or 'unknown'}\nReview date: {dates.get('review_date') or 'unknown'}\nExpiry date: {dates.get('expiry_date') or 'not applicable'}",
    }
    current_user = {'id': actor_id, 'user_id': actor_id, 'home_id': payload.home_id, 'provider_id': payload.provider_id, 'role': 'manager'}
    return child_documents_service.create_document(
        payload={
            'young_person_id': payload.young_person_id,
            'home_id': payload.home_id,
            'provider_id': payload.provider_id,
            'document_type': doc_type,
            'title': detected_title,
            'editable_title': detected_title,
            'sections': sections,
            'document_date': (dates.get('document_date') or datetime.date.today()).isoformat(),
            'metadata': {'created_from_document_intelligence': True, 'detected_category': category, 'attachment_id': payload.attachment_id, 'source_record_id': payload.source_record_id},
        },
        current_user=current_user,
    )


@router.post('/analyse', status_code=201)
async def analyse_document(payload: AnalyseDocumentRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'document_intelligence_jobs'):
                raise HTTPException(status_code=503, detail='Document intelligence schema is not installed')
            source_text = payload.source_text or ''
            attachment = None
            if payload.attachment_id and relation_exists(cursor, 'universal_record_attachments'):
                cursor.execute('SELECT * FROM public.universal_record_attachments WHERE id::text = %s LIMIT 1', (payload.attachment_id,))
                rows = rows_to_dicts(cursor, cursor.fetchall())
                attachment = rows[0] if rows else None
                if attachment:
                    source_text = source_text or attachment.get('extracted_text') or attachment.get('description') or ''
            file_name = payload.file_name or (attachment or {}).get('original_file_name') or (attachment or {}).get('file_name')
            mime_type = payload.mime_type or (attachment or {}).get('mime_type')
            category, detected_title = classify_document(source_text, file_name)
            route_target = route_for_category(category)
            dates = parse_dates(source_text)
            summaries = make_summary(source_text, category)
            existing_review = review_document(document_type=category, payload={'file_name': file_name, 'source_text': source_text, **{k: v for k, v in dates.items() if v}}, actions=['classify', 'route', 'expiry_reminders'])
            requires_review = category == 'other' or not source_text.strip()
            review_reason = 'Document could not be confidently classified or has no extracted text.' if requires_review else None
            child_document = create_child_document_from_intelligence(payload, category, detected_title, dates, summaries, existing_review, actor_id) if payload.create_child_document and payload.route_now and not requires_review else None
            child_document_id = child_document.get('document', {}).get('id') if child_document and child_document.get('ok') else None
            cursor.execute(
                '''
                INSERT INTO public.document_intelligence_jobs (
                  attachment_id, source_record_id, provider_id, home_id, young_person_id, staff_id, adult_id,
                  file_name, mime_type, source_text, status, detected_category, detected_title,
                  document_date, effective_date, expiry_date, review_date, next_action_date,
                  summary, key_information, child_voice, professional_recommendations,
                  safeguarding_summary, education_summary, health_summary, placement_summary, compliance_summary,
                  confidence_score, requires_human_review, review_reason, created_by, metadata
                ) VALUES (%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,'classified',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                RETURNING *
                ''',
                (payload.attachment_id, payload.source_record_id, payload.provider_id, payload.home_id, payload.young_person_id, payload.staff_id, payload.adult_id, file_name, mime_type, source_text, category, detected_title, dates['document_date'], dates['effective_date'], dates['expiry_date'], dates['review_date'], dates['next_action_date'], summaries['summary'], summaries['key_information'], None, None, summaries['safeguarding_summary'], summaries['education_summary'], summaries['health_summary'], summaries['placement_summary'], summaries['compliance_summary'], 0.70 if not requires_review else 0.35, requires_review, review_reason, actor_id, {**payload.metadata, 'existing_document_ai_review': existing_review, 'route_target': route_target, 'child_document_id': child_document_id}),
            )
            job = rows_to_dicts(cursor, cursor.fetchall())[0]
            route_id = create_route(cursor, job['id'], category, route_target, detected_title, summaries['summary'], existing_review, str(child_document_id) if child_document_id else None)
            reminders = create_reminders(cursor, job, actor_id, create_tasks=payload.create_tasks) if payload.create_reminders else []
            status = 'routed' if payload.route_now and not requires_review else 'review_required' if requires_review else 'classified'
            cursor.execute('UPDATE public.document_intelligence_jobs SET status = %s, routed_at = CASE WHEN %s THEN now() ELSE routed_at END WHERE id::text = %s', (status, payload.route_now, job['id']))
            if payload.route_now:
                cursor.execute('UPDATE public.document_intelligence_routes SET routed = true, routed_by = %s, routed_at = now() WHERE id::text = %s', (actor_id, route_id))
            cursor.execute('INSERT INTO public.document_intelligence_audit_events (job_id, route_id, event_type, event_summary, actor_id, after_snapshot) VALUES (%s::uuid,%s::uuid,%s,%s,%s,%s::jsonb)', (job['id'], route_id, 'document_analysed', 'Document analysed, classified and routed', actor_id, {'category': category, 'route_target': route_target, 'reminders': reminders, 'child_document_id': child_document_id}))
            conn.commit()
            return {'job': job, 'route_id': route_id, 'reminders': reminders, 'review': existing_review, 'child_document': child_document, 'status': status}
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


@router.get('/queue')
async def queue(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), status: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_document_intelligence_queue'):
                return {'jobs': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if young_person_id is not None:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            if status:
                where.append('status::text = %s')
                params.append(status)
            sql = 'SELECT * FROM public.vw_document_intelligence_queue'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY created_at DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'jobs': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/reminders')
async def reminders(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), due_within_days: int = Query(default=60, ge=1, le=365)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'document_expiry_reminders'):
                return {'reminders': [], 'status': 'missing_schema'}
            where = ["status = 'open'", 'reminder_date <= %s']
            params: list[Any] = [datetime.date.today() + datetime.timedelta(days=due_within_days)]
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if young_person_id is not None:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            cursor.execute('SELECT * FROM public.document_expiry_reminders WHERE ' + ' AND '.join(where) + ' ORDER BY reminder_date ASC', tuple(params))
            return {'reminders': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/routes/{route_id}/mark-routed')
async def mark_routed(route_id: str, payload: RouteDocumentRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.routed_by)
        with conn.cursor() as cursor:
            cursor.execute('UPDATE public.document_intelligence_routes SET routed = true, routed_by = %s, routed_at = now() WHERE id::text = %s RETURNING *', (actor_id, route_id))
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Route not found')
            conn.commit()
            return {'route': rows[0], 'status': 'routed'}
    finally:
        if conn is not None:
            release_db_connection(conn)
