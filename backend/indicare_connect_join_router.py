from __future__ import annotations

import datetime
import decimal
import hashlib
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/connect/join', tags=['IndiCare Connect Join'])


class JoinTokenRequest(BaseModel):
    token: str


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


def token_hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()


@router.get('/{token}')
async def preview_join_token(token: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_secure_join_links'):
                raise HTTPException(status_code=503, detail='Secure join link schema is not installed')
            cursor.execute(
                '''
                SELECT
                  l.id,
                  l.event_id,
                  l.call_id,
                  l.meeting_id,
                  l.attendee_id,
                  l.recipient_name,
                  l.recipient_email,
                  l.one_time_use,
                  l.used,
                  l.expires_at,
                  l.revoked,
                  e.title AS event_title,
                  e.starts_at,
                  e.ends_at,
                  e.location,
                  e.event_type,
                  c.title AS call_title,
                  c.call_type,
                  c.status AS call_status,
                  c.join_url,
                  c.provider AS call_provider,
                  m.title AS meeting_title,
                  m.meeting_url
                FROM public.connect_secure_join_links l
                LEFT JOIN public.connect_calendar_events e ON e.id = l.event_id
                LEFT JOIN public.connect_calls c ON c.id = l.call_id
                LEFT JOIN public.connect_meetings m ON m.id = l.meeting_id
                WHERE l.token_hash = %s
                LIMIT 1
                ''',
                (token_hash(token),),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Join link not found')
            link = rows[0]
            if link.get('revoked'):
                raise HTTPException(status_code=410, detail='Join link has been revoked')
            if link.get('expires_at') and datetime.datetime.fromisoformat(str(link['expires_at']).replace('Z', '+00:00')) < datetime.datetime.now(datetime.timezone.utc):
                raise HTTPException(status_code=410, detail='Join link has expired')
            if link.get('one_time_use') and link.get('used'):
                raise HTTPException(status_code=410, detail='Join link has already been used')
            return {'join': link, 'status': 'valid'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/redeem')
async def redeem_join_token(payload: JoinTokenRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_secure_join_links'):
                raise HTTPException(status_code=503, detail='Secure join link schema is not installed')
            cursor.execute(
                '''
                SELECT *
                FROM public.connect_secure_join_links
                WHERE token_hash = %s
                FOR UPDATE
                ''',
                (token_hash(payload.token),),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Join link not found')
            link = rows[0]
            if link.get('revoked'):
                raise HTTPException(status_code=410, detail='Join link has been revoked')
            if link.get('expires_at') and datetime.datetime.fromisoformat(str(link['expires_at']).replace('Z', '+00:00')) < datetime.datetime.now(datetime.timezone.utc):
                raise HTTPException(status_code=410, detail='Join link has expired')
            if link.get('one_time_use') and link.get('used'):
                raise HTTPException(status_code=410, detail='Join link has already been used')

            cursor.execute(
                '''
                UPDATE public.connect_secure_join_links
                SET used = true,
                    used_at = now(),
                    used_by_ip = %s,
                    used_user_agent = %s
                WHERE id = %s::uuid
                RETURNING *
                ''',
                (request.client.host if request.client else None, request.headers.get('user-agent'), link['id']),
            )
            redeemed = rows_to_dicts(cursor, cursor.fetchall())[0]

            if link.get('attendee_id') and relation_exists(cursor, 'connect_calendar_event_attendees'):
                cursor.execute(
                    '''
                    UPDATE public.connect_calendar_event_attendees
                    SET invite_status = 'used', attended = true, joined_at = COALESCE(joined_at, now()), updated_at = now()
                    WHERE id = %s::uuid
                    RETURNING *
                    ''',
                    (link['attendee_id'],),
                )

            call = None
            if link.get('call_id') and relation_exists(cursor, 'connect_calls'):
                cursor.execute('SELECT * FROM public.connect_calls WHERE id = %s::uuid LIMIT 1', (link['call_id'],))
                call_rows = rows_to_dicts(cursor, cursor.fetchall())
                call = call_rows[0] if call_rows else None
                if call and call.get('status') in {'scheduled', 'ringing'}:
                    cursor.execute('SELECT public.connect_update_call_status(%s::uuid, %s, NULL, %s, %s::jsonb)', (link['call_id'], 'live', 'Secure join link redeemed', {'link_id': link['id']}))

            event = None
            if link.get('event_id') and relation_exists(cursor, 'connect_calendar_events'):
                cursor.execute('SELECT * FROM public.connect_calendar_events WHERE id = %s::uuid LIMIT 1', (link['event_id'],))
                event_rows = rows_to_dicts(cursor, cursor.fetchall())
                event = event_rows[0] if event_rows else None

            meeting = None
            if link.get('meeting_id') and relation_exists(cursor, 'connect_meetings'):
                cursor.execute('SELECT * FROM public.connect_meetings WHERE id = %s::uuid LIMIT 1', (link['meeting_id'],))
                meeting_rows = rows_to_dicts(cursor, cursor.fetchall())
                meeting = meeting_rows[0] if meeting_rows else None

            if relation_exists(cursor, 'connect_invite_delivery_log'):
                cursor.execute(
                    '''
                    INSERT INTO public.connect_invite_delivery_log (
                      event_id, call_id, meeting_id, attendee_id, secure_link_id,
                      delivery_method, recipient, status, sent_at, metadata
                    )
                    VALUES (%s::uuid,%s::uuid,%s::uuid,%s::uuid,%s::uuid,'join_link',%s,'used',now(),%s::jsonb)
                    ''',
                    (
                        link.get('event_id'), link.get('call_id'), link.get('meeting_id'), link.get('attendee_id'), link.get('id'),
                        link.get('recipient_email') or link.get('recipient_phone') or link.get('recipient_name') or 'external attendee',
                        {'ip': request.client.host if request.client else None, 'user_agent': request.headers.get('user-agent')},
                    ),
                )

            conn.commit()
            return {
                'join': redeemed,
                'event': event,
                'call': call,
                'meeting': meeting,
                'launch_url': (call or {}).get('join_url') or (meeting or {}).get('meeting_url'),
                'status': 'redeemed',
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
