from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/os-assistant', tags=['OS Assistant Bridge'])


class OSAssistantAskRequest(BaseModel):
    message: str
    scope: str = 'auto'
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    current_record_id: str | None = None
    current_page: str | None = None
    mode: str | None = None
    date_from: datetime.datetime | None = None
    date_to: datetime.datetime | None = None
    limit: int = Field(default=80, ge=1, le=300)
    include_connect: bool = True
    include_tasks: bool = True
    include_calendar: bool = True
    include_evidence: bool = True


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


def scope_from_payload(payload: OSAssistantAskRequest) -> str:
    if payload.scope and payload.scope != 'auto':
        return payload.scope
    if payload.young_person_id:
        return 'child'
    if payload.staff_id or payload.adult_id:
        return 'adult'
    if payload.provider_id and not payload.home_id:
        return 'provider'
    if payload.home_id:
        return 'home'
    return 'global'


def where_for_scope(payload: OSAssistantAskRequest, alias: str = '') -> tuple[str, list[Any]]:
    prefix = f'{alias}.' if alias else ''
    where: list[str] = []
    params: list[Any] = []
    if payload.provider_id is not None:
        where.append(f'{prefix}provider_id = %s')
        params.append(payload.provider_id)
    if payload.home_id is not None:
        where.append(f'{prefix}home_id = %s')
        params.append(payload.home_id)
    if payload.young_person_id is not None:
        where.append(f'{prefix}young_person_id = %s')
        params.append(payload.young_person_id)
    if payload.staff_id is not None:
        where.append(f'{prefix}staff_id = %s')
        params.append(payload.staff_id)
    if payload.adult_id is not None:
        where.append(f'{prefix}adult_id = %s')
        params.append(payload.adult_id)
    if payload.date_from is not None:
        where.append(f'COALESCE({prefix}occurred_at, {prefix}created_at) >= %s')
        params.append(payload.date_from)
    if payload.date_to is not None:
        where.append(f'COALESCE({prefix}occurred_at, {prefix}created_at) <= %s')
        params.append(payload.date_to)
    return (' WHERE ' + ' AND '.join(where)) if where else '', params


def fetch_records(cursor: Any, payload: OSAssistantAskRequest) -> list[dict[str, Any]]:
    if not relation_exists(cursor, 'universal_records'):
        return []
    where, params = where_for_scope(payload)
    cursor.execute(
        f'''
        SELECT id, source_table, source_id, record_type, record_category, entity_type,
               provider_id, home_id, young_person_id, staff_id, adult_id,
               title, summary, narrative, child_voice, staff_reflection, staff_analysis,
               therapeutic_analysis, status, priority, risk_level, review_state,
               safeguarding_relevant, inspection_relevant, chronology_visible,
               manager_review_required, restricted, sccif_area, occurred_at, due_at,
               reviewed_at, created_at, updated_at
        FROM public.universal_records
        {where}
        ORDER BY COALESCE(occurred_at, created_at) DESC
        LIMIT %s
        ''',
        tuple(params + [payload.limit]),
    )
    records = rows_to_dicts(cursor, cursor.fetchall())
    if payload.current_record_id:
        records.sort(key=lambda row: 0 if str(row.get('id')) == str(payload.current_record_id) else 1)
    return records


def fetch_tasks(cursor: Any, payload: OSAssistantAskRequest) -> list[dict[str, Any]]:
    if not payload.include_tasks or not relation_exists(cursor, 'universal_tasks'):
        return []
    where, params = where_for_scope(payload)
    cursor.execute(
        f'''
        SELECT id, task_type, title, description, recommended_action, priority, status,
               due_at, completed_at, assigned_to, assigned_role, safeguarding_relevant,
               inspection_relevant, manager_review_related, record_id, created_at, updated_at,
               provider_id, home_id, young_person_id, staff_id, adult_id
        FROM public.universal_tasks
        {where}
        ORDER BY COALESCE(due_at, created_at) DESC
        LIMIT %s
        ''',
        tuple(params + [min(payload.limit, 80)]),
    )
    return rows_to_dicts(cursor, cursor.fetchall())


def fetch_calendar(cursor: Any, payload: OSAssistantAskRequest) -> list[dict[str, Any]]:
    if not payload.include_calendar or not relation_exists(cursor, 'connect_calendar_events'):
        return []
    where, params = where_for_scope(payload)
    cursor.execute(
        f'''
        SELECT id, event_type, title, description, location, starts_at, ends_at, status,
               priority, safeguarding_relevant, inspection_relevant, restricted, child_visible,
               record_id, task_id, call_id, meeting_id, created_at,
               provider_id, home_id, young_person_id, staff_id, adult_id
        FROM public.connect_calendar_events
        {where}
        ORDER BY starts_at DESC
        LIMIT %s
        ''',
        tuple(params + [min(payload.limit, 80)]),
    )
    return rows_to_dicts(cursor, cursor.fetchall())


def fetch_connect(cursor: Any, payload: OSAssistantAskRequest) -> list[dict[str, Any]]:
    if not payload.include_connect or not relation_exists(cursor, 'connect_messages'):
        return []
    where, params = where_for_scope(payload)
    cursor.execute(
        f'''
        SELECT id, channel_id, message_type, visibility, body, plain_text, created_by,
               safeguarding_relevant, inspection_relevant, promote_to_record, promoted_record_id,
               task_id, record_id, created_at, updated_at,
               provider_id, home_id, young_person_id, staff_id, adult_id
        FROM public.connect_messages
        {where}
        ORDER BY created_at DESC
        LIMIT %s
        ''',
        tuple(params + [min(payload.limit, 80)]),
    )
    return rows_to_dicts(cursor, cursor.fetchall())


def fetch_evidence(cursor: Any, payload: OSAssistantAskRequest) -> list[dict[str, Any]]:
    if not payload.include_evidence or not relation_exists(cursor, 'universal_record_attachments'):
        return []
    where, params = where_for_scope(payload)
    cursor.execute(
        f'''
        SELECT id, record_id, file_name, original_file_name, mime_type, attachment_category,
               attachment_type, title, description, safeguarding_relevant, inspection_relevant,
               restricted, uploaded_by, uploaded_at, created_at,
               provider_id, home_id, young_person_id, staff_id
        FROM public.universal_record_attachments
        {where}
        ORDER BY uploaded_at DESC
        LIMIT %s
        ''',
        tuple(params + [min(payload.limit, 60)]),
    )
    return rows_to_dicts(cursor, cursor.fetchall())


def classify_intent(message: str) -> str:
    text = message.lower()
    if any(term in text for term in ['reg 44', 'reg44', 'regulation 44', 'ofsted', 'inspection']):
        return 'inspection'
    if any(term in text for term in ['lac', 'looked after', 'care review', 'statutory review']):
        return 'lac_review'
    if any(term in text for term in ['handover', 'shift', 'brief']):
        return 'handover'
    if any(term in text for term in ['safeguard', 'risk', 'missing', 'incident', 'pattern']):
        return 'safeguarding'
    if any(term in text for term in ['manager', 'review', 'sign off', 'return']):
        return 'manager_review'
    if any(term in text for term in ['record', 'this record', 'chronology', 'evidence']):
        return 'record_review'
    return 'summary'


def label_record(record: dict[str, Any]) -> str:
    title = record.get('title') or record.get('record_type') or 'Record'
    summary = record.get('summary') or record.get('narrative') or ''
    date = record.get('occurred_at') or record.get('created_at') or ''
    return f"- {title} ({date}): {str(summary)[:220]}"


def make_answer(payload: OSAssistantAskRequest, context: dict[str, Any]) -> tuple[str, list[str]]:
    records = context.get('records', [])
    tasks = context.get('tasks', [])
    calendar = context.get('calendar', [])
    connect = context.get('connect_messages', [])
    evidence = context.get('evidence', [])
    intent = classify_intent(payload.message)
    safeguarding = [r for r in records if r.get('safeguarding_relevant') or str(r.get('risk_level') or '').lower() in {'high', 'critical'}]
    review = [r for r in records if r.get('manager_review_required') or r.get('review_state') in {'required', 'returned', 'submitted'}]
    inspection = [r for r in records if r.get('inspection_relevant')]
    child_voice_missing = [r for r in records if not r.get('child_voice')]
    open_tasks = [t for t in tasks if str(t.get('status') or '').lower() not in {'completed', 'cancelled', 'done'}]
    focused = [r for r in records if payload.current_record_id and str(r.get('id')) == str(payload.current_record_id)]
    if focused:
        records = focused + [r for r in records if str(r.get('id')) != str(payload.current_record_id)]

    heading = {
        'inspection': 'Inspection-ready summary',
        'lac_review': 'LAC / statutory review summary',
        'handover': 'Live handover brief',
        'safeguarding': 'Safeguarding and risk picture',
        'manager_review': 'Manager review position',
        'record_review': 'Record review and follow-up',
        'summary': 'Operational summary',
    }[intent]

    lines = [heading, '']
    lines.append(f"Context returned {len(records)} records, {len(open_tasks)} open tasks, {len(calendar)} diary items, {len(connect)} Connect messages and {len(evidence)} evidence items.")

    if intent == 'handover':
        lines.extend(['', 'What matters for handover:', *(label_record(r) for r in records[:8])])
        if open_tasks:
            lines.extend(['', 'Actions to carry forward:', *(f"- {t.get('title') or t.get('recommended_action') or 'Task'}: {t.get('status') or 'open'}" for t in open_tasks[:6])])
    elif intent == 'inspection':
        lines.extend(['', 'Evidence strength:', *(label_record(r) for r in inspection[:8])])
        lines.extend(['', 'Inspection gaps:', f"- {len(child_voice_missing)} recent records have no child voice attached.", f"- {len(review)} records appear to need manager oversight.", f"- {len(safeguarding)} records carry safeguarding or high-risk relevance."])
    elif intent == 'lac_review':
        lines.extend(['', 'Progress and lived experience:', *(label_record(r) for r in records[:8])])
        if safeguarding:
            lines.extend(['', 'Safeguarding and risk:', *(label_record(r) for r in safeguarding[:5])])
    elif intent == 'safeguarding':
        lines.extend(['', 'Safeguarding signals:', *(label_record(r) for r in safeguarding[:10])])
        lines.extend(['', 'Suggested next checks:', '- Confirm manager oversight and escalation status.', '- Check whether related documents, risk assessments and notifications are linked.', '- Confirm follow-up actions are allocated and dated.'])
    elif intent == 'manager_review':
        lines.extend(['', 'Records needing review:', *(label_record(r) for r in review[:10])])
        if not review:
            lines.append('- No manager-review records were returned in this context.')
    elif intent == 'record_review':
        primary = records[0] if records else None
        if primary:
            lines.extend(['', 'Selected record:', label_record(primary), '', 'Recommended follow-up:', '- Check child voice and impact.', '- Link evidence or relevant plan/risk assessment.', '- Add manager comment if this affects risk, safeguarding or care planning.', '- Continue the chronology if the outcome or next step is not clear.'])
        else:
            lines.append('No record was returned for this context.')
    else:
        lines.extend(['', 'Recent chronology:', *(label_record(r) for r in records[:8])])

    suggested = [
        'What should be carried into handover?',
        'Which records need manager review?',
        'Prepare an inspection evidence support summary.',
        'What safeguarding patterns are emerging?',
        'What follow-up should be recorded next?',
    ]
    return '\n'.join(lines), suggested


@router.post('/ask')
async def ask_os_assistant(payload: OSAssistantAskRequest, request: Request):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail='message is required')
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            context = {
                'scope': scope_from_payload(payload),
                'current_page': payload.current_page,
                'message': payload.message,
                'records': fetch_records(cursor, payload),
                'tasks': fetch_tasks(cursor, payload),
                'calendar': fetch_calendar(cursor, payload),
                'connect_messages': fetch_connect(cursor, payload),
                'evidence': fetch_evidence(cursor, payload),
            }
            answer, suggested_questions = make_answer(payload, context)
            sources = []
            for record in context['records'][:12]:
                sources.append({'type': 'record', 'id': record.get('id'), 'title': record.get('title'), 'record_type': record.get('record_type'), 'created_at': record.get('created_at')})
            for task in context['tasks'][:5]:
                sources.append({'type': 'task', 'id': task.get('id'), 'title': task.get('title'), 'status': task.get('status')})
            for event in context['calendar'][:5]:
                sources.append({'type': 'calendar', 'id': event.get('id'), 'title': event.get('title'), 'starts_at': event.get('starts_at')})
            return {'ok': True, 'answer': answer, 'scope': context['scope'], 'intent': classify_intent(payload.message), 'context': context, 'sources': sources, 'suggested_questions': suggested_questions}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if conn is not None:
            release_db_connection(conn)
