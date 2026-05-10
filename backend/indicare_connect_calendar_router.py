from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/connect/calendar', tags=['IndiCare Connect Calendar'])


class CreateCalendarRequest(BaseModel):
    name: str
    description: str | None = None
    calendar_type: str = 'home'
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    colour: str | None = None
    is_group_calendar: bool = False
    is_default: bool = False
    restricted: bool = False
    safeguarding_visible: bool = False
    inspection_relevant: bool = False
    created_by: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateEventRequest(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    starts_at: datetime.datetime
    ends_at: datetime.datetime | None = None
    event_type: str = 'meeting'
    calendar_id: str | None = None
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    channel_id: str | None = None
    meeting_id: str | None = None
    call_id: str | None = None
    record_id: str | None = None
    task_id: str | None = None
    timezone: str = 'Europe/London'
    recurrence_rule: str | None = None
    safeguarding_relevant: bool = False
    inspection_relevant: bool = False
    restricted: bool = False
    child_visible: bool = False
    created_by: int | None = None
    attendees: list[dict[str, Any]] = Field(default_factory=list)
    create_call: bool = False
    call_type: str = 'video'
    metadata: dict[str, Any] = Field(default_factory=dict)


class AddAttendeeRequest(BaseModel):
    user_id: int | None = None
    staff_id: int | None = None
    young_person_id: int | None = None
    adult_id: int | None = None
    external_name: str | None = None
    external_email: str | None = None
    external_phone: str | None = None
    organisation: str | None = None
    attendee_role: str = 'attendee'
    invited_by: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class GenerateInviteRequest(BaseModel):
    attendee_id: str | None = None
    call_id: str | None = None
    meeting_id: str | None = None
    recipient_name: str | None = None
    recipient_email: str | None = None
    recipient_phone: str | None = None
    expires_at: datetime.datetime | None = None
    created_by: int | None = None
    delivery_method: str = 'email'
    subject: str | None = None
    body: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RespondInviteRequest(BaseModel):
    status: str
    response_note: str | None = None


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


@router.get('/calendars')
async def list_calendars(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    calendar_type: str | None = Query(default=None),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendars'):
                return {'calendars': [], 'status': 'missing_schema'}
            where = ['archived = false']
            params: list[Any] = []
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if young_person_id is not None:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            if staff_id is not None:
                where.append('staff_id = %s')
                params.append(staff_id)
            if calendar_type:
                where.append('calendar_type::text = %s')
                params.append(calendar_type)
            cursor.execute('SELECT * FROM public.connect_calendars WHERE ' + ' AND '.join(where) + ' ORDER BY is_default DESC, name ASC', tuple(params))
            return {'calendars': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/calendars', status_code=201)
async def create_calendar(payload: CreateCalendarRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendars'):
                raise HTTPException(status_code=503, detail='Connect calendar schema is not installed')
            cursor.execute(
                '''
                INSERT INTO public.connect_calendars (
                  provider_id, home_id, young_person_id, staff_id, adult_id,
                  calendar_type, name, description, colour,
                  is_group_calendar, is_default, restricted, safeguarding_visible,
                  inspection_relevant, created_by, metadata
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                RETURNING *
                ''',
                (
                    payload.provider_id, payload.home_id, payload.young_person_id, payload.staff_id, payload.adult_id,
                    payload.calendar_type, payload.name, payload.description, payload.colour,
                    payload.is_group_calendar, payload.is_default, payload.restricted, payload.safeguarding_visible,
                    payload.inspection_relevant, actor_id, payload.metadata,
                ),
            )
            calendar = rows_to_dicts(cursor, cursor.fetchall())[0]
            conn.commit()
            return {'calendar': calendar, 'status': 'created'}
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


@router.get('/events')
async def list_events(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    calendar_id: str | None = Query(default=None),
    date_from: datetime.datetime | None = Query(default=None),
    date_to: datetime.datetime | None = Query(default=None),
    event_type: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendar_events'):
                return {'events': [], 'status': 'missing_schema'}
            where = ['status <> %s']
            params: list[Any] = ['cancelled']
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if young_person_id is not None:
                where.append('young_person_id = %s')
                params.append(young_person_id)
            if staff_id is not None:
                where.append('staff_id = %s')
                params.append(staff_id)
            if calendar_id:
                where.append('calendar_id::text = %s')
                params.append(calendar_id)
            if date_from:
                where.append('starts_at >= %s')
                params.append(date_from)
            if date_to:
                where.append('starts_at <= %s')
                params.append(date_to)
            if event_type:
                where.append('event_type::text = %s')
                params.append(event_type)
            source = 'public.vw_connect_calendar_feed' if relation_exists(cursor, 'vw_connect_calendar_feed') else 'public.connect_calendar_events'
            cursor.execute(f'SELECT * FROM {source} WHERE ' + ' AND '.join(where) + ' ORDER BY starts_at ASC LIMIT %s', tuple(params + [limit]))
            return {'events': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/events', status_code=201)
async def create_event(payload: CreateEventRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendar_events'):
                raise HTTPException(status_code=503, detail='Connect calendar schema is not installed')

            call_id = payload.call_id
            if payload.create_call and relation_exists(cursor, 'connect_calls'):
                cursor.execute(
                    '''
                    SELECT public.connect_create_call(
                      %s,%s,%s,%s,%s,%s,%s,%s,%s::uuid,NULL,%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb
                    )
                    ''',
                    (
                        payload.title,
                        payload.call_type,
                        actor_id,
                        payload.home_id,
                        payload.provider_id,
                        payload.young_person_id,
                        payload.staff_id,
                        payload.adult_id,
                        payload.channel_id,
                        payload.record_id,
                        payload.task_id,
                        payload.starts_at,
                        payload.ends_at,
                        payload.description,
                        'Calendar event call',
                        payload.safeguarding_relevant,
                        payload.inspection_relevant,
                        payload.restricted,
                        payload.metadata,
                    ),
                )
                row = cursor.fetchone()
                call_id = str(row[0] if row and not isinstance(row, dict) else row.get('connect_create_call'))

            cursor.execute(
                '''
                SELECT public.connect_create_calendar_event(
                  %s,%s,%s,%s,%s::uuid,%s,%s,%s,%s,%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s::jsonb
                )
                ''',
                (
                    payload.title,
                    payload.starts_at,
                    payload.ends_at,
                    payload.event_type,
                    payload.calendar_id,
                    payload.home_id,
                    payload.provider_id,
                    payload.young_person_id,
                    payload.staff_id,
                    payload.channel_id,
                    call_id,
                    payload.meeting_id,
                    payload.record_id,
                    payload.task_id,
                    payload.description,
                    payload.location,
                    actor_id,
                    payload.safeguarding_relevant,
                    payload.inspection_relevant,
                    payload.restricted,
                    {**payload.metadata, 'timezone': payload.timezone, 'recurrence_rule': payload.recurrence_rule},
                ),
            )
            row = cursor.fetchone()
            event_id = str(row[0] if row and not isinstance(row, dict) else row.get('connect_create_calendar_event'))

            for attendee in payload.attendees:
                cursor.execute(
                    '''
                    INSERT INTO public.connect_calendar_event_attendees (
                      event_id, user_id, staff_id, young_person_id, adult_id,
                      external_name, external_email, external_phone, organisation,
                      attendee_role, invited_by, invited_at, metadata
                    )
                    VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now(),%s::jsonb)
                    RETURNING id
                    ''',
                    (
                        event_id,
                        attendee.get('user_id'), attendee.get('staff_id'), attendee.get('young_person_id'), attendee.get('adult_id'),
                        attendee.get('external_name'), attendee.get('external_email'), attendee.get('external_phone'), attendee.get('organisation'),
                        attendee.get('attendee_role', 'attendee'), actor_id, attendee.get('metadata', {}),
                    ),
                )
            conn.commit()
            return {'id': event_id, 'call_id': call_id, 'status': 'created'}
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


@router.post('/events/{event_id}/attendees', status_code=201)
async def add_attendee(event_id: str, payload: AddAttendeeRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.invited_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendar_event_attendees'):
                raise HTTPException(status_code=503, detail='Connect calendar schema is not installed')
            cursor.execute(
                '''
                INSERT INTO public.connect_calendar_event_attendees (
                  event_id, user_id, staff_id, young_person_id, adult_id,
                  external_name, external_email, external_phone, organisation,
                  attendee_role, invited_by, invited_at, metadata
                )
                VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now(),%s::jsonb)
                RETURNING *
                ''',
                (
                    event_id, payload.user_id, payload.staff_id, payload.young_person_id, payload.adult_id,
                    payload.external_name, payload.external_email, payload.external_phone, payload.organisation,
                    payload.attendee_role, actor_id, payload.metadata,
                ),
            )
            attendee = rows_to_dicts(cursor, cursor.fetchall())[0]
            conn.commit()
            return {'attendee': attendee, 'status': 'created'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/events/{event_id}/invites', status_code=201)
async def generate_invite(event_id: str, payload: GenerateInviteRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_secure_join_links'):
                raise HTTPException(status_code=503, detail='Secure join links schema is not installed')
            cursor.execute(
                '''
                SELECT * FROM public.connect_generate_secure_join_link(
                  %s::uuid,%s::uuid,%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s::jsonb
                )
                ''',
                (
                    event_id,
                    payload.call_id,
                    payload.meeting_id,
                    payload.attendee_id,
                    payload.recipient_name,
                    payload.recipient_email,
                    payload.recipient_phone,
                    payload.expires_at,
                    actor_id,
                    payload.metadata,
                ),
            )
            link_row = rows_to_dicts(cursor, cursor.fetchall())[0]
            raw_token = link_row.get('raw_token')
            link_id = link_row.get('link_id')
            if relation_exists(cursor, 'connect_invite_delivery_log') and (payload.recipient_email or payload.recipient_phone):
                recipient = payload.recipient_email or payload.recipient_phone
                cursor.execute(
                    '''
                    INSERT INTO public.connect_invite_delivery_log (
                      event_id, call_id, meeting_id, attendee_id, secure_link_id,
                      delivery_method, recipient, subject, body, status, sent_by, metadata
                    )
                    VALUES (%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s,%s,%s,%s,'pending',%s,%s::jsonb)
                    ''',
                    (
                        event_id, payload.call_id, payload.meeting_id, payload.attendee_id, link_id,
                        payload.delivery_method, recipient, payload.subject, payload.body, actor_id, payload.metadata,
                    ),
                )
            conn.commit()
            return {
                'link_id': link_id,
                'token': raw_token,
                'join_url': f'/connect/join/{raw_token}',
                'status': 'created',
            }
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


@router.post('/attendees/{attendee_id}/respond')
async def respond_to_invite(attendee_id: str, payload: RespondInviteRequest):
    if payload.status not in {'accepted', 'declined', 'tentative'}:
        raise HTTPException(status_code=400, detail='Invalid invite response')
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_calendar_event_attendees'):
                raise HTTPException(status_code=503, detail='Connect calendar schema is not installed')
            cursor.execute(
                '''
                UPDATE public.connect_calendar_event_attendees
                SET invite_status = %s, response_note = %s, responded_at = now(), updated_at = now()
                WHERE id::text = %s
                RETURNING *
                ''',
                (payload.status, payload.response_note, attendee_id),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Attendee not found')
            conn.commit()
            return {'attendee': rows[0], 'status': 'updated'}
    finally:
        if conn is not None:
            release_db_connection(conn)
