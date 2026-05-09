from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/connect', tags=['IndiCare Connect'])


class CreateChannelRequest(BaseModel):
    name: str
    description: str | None = None
    channel_type: str = 'team'
    visibility: str = 'staff'
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    adult_id: int | None = None
    is_private: bool = False
    safeguarding_relevant: bool = False
    inspection_relevant: bool = False
    record_linked: bool = False
    created_by: int | None = None
    members: list[int] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PostMessageRequest(BaseModel):
    body: str
    message_type: str = 'message'
    created_by: int | None = None
    record_id: str | None = None
    task_id: str | None = None
    safeguarding_relevant: bool = False
    promote_to_record: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class MarkReadRequest(BaseModel):
    user_id: int | None = None
    staff_id: int | None = None
    message_ids: list[str] = Field(default_factory=list)


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


@router.get('/channels')
async def list_channels(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    channel_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_channels'):
                return {'channels': [], 'status': 'missing_schema'}
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
            if channel_type:
                where.append('channel_type::text = %s')
                params.append(channel_type)
            if q:
                where.append('(name ILIKE %s OR description ILIKE %s)')
                params.extend([f'%{q}%', f'%{q}%'])
            source = 'public.vw_connect_channel_list' if relation_exists(cursor, 'vw_connect_channel_list') else 'public.connect_channels'
            cursor.execute(
                f'SELECT * FROM {source} WHERE ' + ' AND '.join(where) + ' ORDER BY COALESCE(latest_message_at, updated_at, created_at) DESC LIMIT %s',
                tuple(params + [limit]),
            )
            return {'channels': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/channels', status_code=201)
async def create_channel(payload: CreateChannelRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_channels'):
                raise HTTPException(status_code=503, detail='IndiCare Connect schema is not installed')
            cursor.execute(
                '''
                INSERT INTO public.connect_channels (
                  provider_id, home_id, young_person_id, staff_id, adult_id,
                  channel_type, visibility, name, description, is_private,
                  safeguarding_relevant, inspection_relevant, record_linked,
                  created_by, metadata
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                RETURNING *
                ''',
                (
                    payload.provider_id, payload.home_id, payload.young_person_id, payload.staff_id, payload.adult_id,
                    payload.channel_type, payload.visibility, payload.name, payload.description, payload.is_private,
                    payload.safeguarding_relevant, payload.inspection_relevant, payload.record_linked,
                    actor_id, payload.metadata,
                ),
            )
            channel = rows_to_dicts(cursor, cursor.fetchall())[0]
            channel_id = channel['id']
            members = set(payload.members)
            if actor_id:
                members.add(actor_id)
            for member_id in members:
                cursor.execute(
                    '''
                    INSERT INTO public.connect_channel_members (channel_id, user_id, role, can_manage)
                    VALUES (%s::uuid, %s, %s, %s)
                    ON CONFLICT (channel_id, user_id) DO NOTHING
                    ''',
                    (channel_id, member_id, 'owner' if member_id == actor_id else 'member', member_id == actor_id),
                )
            if relation_exists(cursor, 'connect_audit_events'):
                cursor.execute(
                    '''
                    INSERT INTO public.connect_audit_events (channel_id, event_type, event_summary, actor_id, after_snapshot)
                    VALUES (%s::uuid, 'channel_created', 'Connect channel created', %s, %s::jsonb)
                    ''',
                    (channel_id, actor_id, channel),
                )
            conn.commit()
            return {'channel': channel, 'status': 'created'}
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


@router.get('/channels/{channel_id}/messages')
async def list_messages(channel_id: str, limit: int = Query(default=100, ge=1, le=500), before: datetime.datetime | None = Query(default=None)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_messages'):
                return {'messages': [], 'status': 'missing_schema'}
            if before:
                cursor.execute(
                    '''
                    SELECT * FROM public.vw_connect_message_feed
                    WHERE channel_id::text = %s AND created_at < %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    ''',
                    (channel_id, before, limit),
                )
            else:
                cursor.execute(
                    '''
                    SELECT * FROM public.vw_connect_message_feed
                    WHERE channel_id::text = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    ''',
                    (channel_id, limit),
                )
            messages = rows_to_dicts(cursor, cursor.fetchall())
            return {'messages': list(reversed(messages)), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/channels/{channel_id}/messages', status_code=201)
async def post_message(channel_id: str, payload: PostMessageRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_messages'):
                raise HTTPException(status_code=503, detail='IndiCare Connect schema is not installed')
            cursor.execute(
                '''
                SELECT public.connect_post_message(
                  %s::uuid,%s,%s,%s,%s::uuid,%s::uuid,%s,%s,%s::jsonb
                )
                ''',
                (
                    channel_id,
                    payload.body,
                    actor_id,
                    payload.message_type,
                    payload.record_id,
                    payload.task_id,
                    payload.safeguarding_relevant,
                    payload.promote_to_record,
                    payload.metadata,
                ),
            )
            row = cursor.fetchone()
            message_id = str(row[0] if row and not isinstance(row, dict) else row.get('connect_post_message'))
            conn.commit()
            return {'id': message_id, 'status': 'created'}
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


@router.post('/channels/{channel_id}/read')
async def mark_channel_read(channel_id: str, payload: MarkReadRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        user_id = actor_id_from_request(request, payload.user_id)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_message_read_receipts'):
                return {'status': 'missing_schema'}
            message_ids = payload.message_ids
            if not message_ids:
                cursor.execute('SELECT id::text FROM public.connect_messages WHERE channel_id::text = %s AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200', (channel_id,))
                message_ids = [row.get('id') if isinstance(row, dict) else row[0] for row in cursor.fetchall()]
            for message_id in message_ids:
                cursor.execute(
                    '''
                    INSERT INTO public.connect_message_read_receipts (message_id, channel_id, user_id, staff_id)
                    VALUES (%s::uuid, %s::uuid, %s, %s)
                    ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = now()
                    ''',
                    (message_id, channel_id, user_id, payload.staff_id),
                )
            cursor.execute(
                '''
                UPDATE public.connect_channel_members
                SET last_read_at = now()
                WHERE channel_id::text = %s AND user_id = %s
                ''',
                (channel_id, user_id),
            )
            conn.commit()
            return {'status': 'read'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/meetings')
async def list_meetings(home_id: int | None = Query(default=None), young_person_id: int | None = Query(default=None), status: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_meetings'):
                return {'meetings': [], 'status': 'missing_schema'}
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
            sql = 'SELECT * FROM public.vw_connect_meeting_feed'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY scheduled_start DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'meetings': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
