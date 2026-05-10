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
    return rows_to_dicts(cursor, cursor.fetchall())


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


def make_basic_answer(payload: OSAssistantAskRequest, context: dict[str, Any]) -> str:
    records = context.get('records', [])
    tasks = context.get('tasks', [])
    calendar = context.get('calendar', [])
    connect = context.get('connect_messages', [])
    evidence = context.get('evidence', [])
    safeguarding = [r for r in records if r.get('safeguarding_relevant')]
    review = [r for r in records if r.get('manager_review_required') or r.get('review_state') in {'required', 'returned'}]
    high_risk = [r for r in records if str(r.get('risk_level') or '').lower() in {'high', 'critical'}]
    overdue = [t for t in tasks if t.get('due_at') and str(t.get('status')) not in {'completed', 'cancelled'}]

    lines = [
        f"I found {len(records)} records, {len(tasks)} tasks, {len(calendar)} diary events, {len(connect)} Connect messages and {len(evidence)} evidence items for this context.",
    ]
    if safeguarding:
        lines.append(f"Safeguarding appears in {len(safeguarding)} recent records. The latest is: {safeguarding[0].get('title') or safeguarding[0].get('summary') or 'Untitled safeguarding record'}.")
    if high_risk:
        lines.append(f"There are {len(high_risk)} high/critical risk records in the returned context.")
    if review:
        lines.append(f"There are {len(review)} records requiring or awaiting management review.")
    if overdue:
        lines.append(f"There are {len(overdue)} tasks with due dates that may need checking for completion or escalation.")
    if calendar:
        lines.append(f"The latest diary item is: {calendar[0].get('title')} on {calendar[0].get('starts_at')}.")
    if records[:5]:
        lines.append('Key recent records: ' + '; '.join([str(r.get('title') or r.get('record_type') or 'Record') for r in records[:5]]) + '.')
    lines.append('For LAC, Reg 44 or Reg 45 reporting, ask me to produce the specific report summary and I will structure the answer by safeguarding, progress, health, education, family time, incidents, risks, management oversight and actions.')
    return '\n\n'.join(lines)


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
            answer = make_basic_answer(payload, context)
            sources = []
            for record in context['records'][:10]:
                sources.append({'type': 'record', 'id': record.get('id'), 'title': record.get('title'), 'record_type': record.get('record_type'), 'created_at': record.get('created_at')})
            for task in context['tasks'][:5]:
                sources.append({'type': 'task', 'id': task.get('id'), 'title': task.get('title'), 'status': task.get('status')})
            for event in context['calendar'][:5]:
                sources.append({'type': 'calendar', 'id': event.get('id'), 'title': event.get('title'), 'starts_at': event.get('starts_at')})
            return {
                'ok': True,
                'answer': answer,
                'scope': context['scope'],
                'context': context,
                'sources': sources,
                'suggested_questions': [
                    'Summarise the last 30 days for LAC review.',
                    'What safeguarding patterns are emerging?',
                    'Prepare a Reg 44 summary for this home.',
                    'What should the RI or CEO be aware of?',
                    'Which records need manager review?',
                ],
            }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
    finally:
        if conn is not None:
            release_db_connection(conn)
