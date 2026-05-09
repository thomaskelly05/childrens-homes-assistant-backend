from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/connect/groups', tags=['IndiCare Connect Groups'])


class CreateGroupRequest(BaseModel):
    name: str
    description: str | None = None
    group_type: str = 'custom'
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    created_by: int | None = None
    is_private: bool = False
    restricted: bool = False
    safeguarding_relevant: bool = False
    inspection_relevant: bool = False
    create_default_channel: bool = True
    create_default_calendar: bool = True
    members: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AddGroupMemberRequest(BaseModel):
    user_id: int | None = None
    staff_id: int | None = None
    young_person_id: int | None = None
    adult_id: int | None = None
    external_name: str | None = None
    external_email: str | None = None
    external_phone: str | None = None
    organisation: str | None = None
    group_role: str = 'member'
    can_post: bool = True
    can_upload: bool = True
    can_invite: bool = False
    can_manage: bool = False
    can_view_restricted: bool = False
    added_by: int | None = None
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


def actor_id_from_request(request: Request, fallback: int | None = None) -> int | None:
    if fallback is not None:
        return fallback
    try:
        return int(request.headers.get('X-User-Id') or 0) or None
    except Exception:
        return None


@router.get('')
async def list_groups(
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    group_type: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_groups'):
                return {'groups': [], 'status': 'missing_schema'}
            source = 'public.vw_connect_group_list' if relation_exists(cursor, 'vw_connect_group_list') else 'public.connect_groups'
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
            if group_type:
                where.append('group_type::text = %s')
                params.append(group_type)
            if q:
                where.append('(name ILIKE %s OR description ILIKE %s)')
                params.extend([f'%{q}%', f'%{q}%'])
            cursor.execute(f'SELECT * FROM {source} WHERE ' + ' AND '.join(where) + ' ORDER BY group_type, name LIMIT %s', tuple(params + [limit]))
            return {'groups': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('', status_code=201)
async def create_group(payload: CreateGroupRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_groups'):
                raise HTTPException(status_code=503, detail='Connect groups schema is not installed')
            cursor.execute(
                '''
                SELECT public.connect_create_group(
                  %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb
                )
                ''',
                (
                    payload.name,
                    payload.group_type,
                    actor_id,
                    payload.provider_id,
                    payload.home_id,
                    payload.young_person_id,
                    payload.description,
                    payload.is_private,
                    payload.restricted,
                    payload.safeguarding_relevant,
                    payload.inspection_relevant,
                    payload.create_default_channel,
                    payload.create_default_calendar,
                    payload.metadata,
                ),
            )
            row = cursor.fetchone()
            group_id = str(row[0] if row and not isinstance(row, dict) else row.get('connect_create_group'))
            for member in payload.members:
                cursor.execute(
                    '''
                    INSERT INTO public.connect_group_members (
                      group_id, user_id, staff_id, young_person_id, adult_id,
                      external_name, external_email, external_phone, organisation,
                      group_role, can_post, can_upload, can_invite, can_manage, can_view_restricted,
                      added_by, metadata
                    )
                    VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                    ON CONFLICT DO NOTHING
                    ''',
                    (
                        group_id,
                        member.get('user_id'), member.get('staff_id'), member.get('young_person_id'), member.get('adult_id'),
                        member.get('external_name'), member.get('external_email'), member.get('external_phone'), member.get('organisation'),
                        member.get('group_role', 'member'), member.get('can_post', True), member.get('can_upload', True),
                        member.get('can_invite', False), member.get('can_manage', False), member.get('can_view_restricted', False),
                        actor_id, member.get('metadata', {}),
                    ),
                )
            conn.commit()
            return {'id': group_id, 'status': 'created'}
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


@router.get('/{group_id}')
async def get_group(group_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_groups'):
                raise HTTPException(status_code=503, detail='Connect groups schema is not installed')
            cursor.execute('SELECT * FROM public.connect_groups WHERE id::text = %s LIMIT 1', (group_id,))
            groups = rows_to_dicts(cursor, cursor.fetchall())
            if not groups:
                raise HTTPException(status_code=404, detail='Group not found')
            members: list[dict[str, Any]] = []
            channels: list[dict[str, Any]] = []
            calendars: list[dict[str, Any]] = []
            if relation_exists(cursor, 'connect_group_member_feed'):
                cursor.execute('SELECT * FROM public.vw_connect_group_member_feed WHERE group_id::text = %s ORDER BY group_role, added_at', (group_id,))
                members = rows_to_dicts(cursor, cursor.fetchall())
            elif relation_exists(cursor, 'connect_group_members'):
                cursor.execute('SELECT * FROM public.connect_group_members WHERE group_id::text = %s AND removed_at IS NULL ORDER BY group_role, added_at', (group_id,))
                members = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'connect_group_channels'):
                cursor.execute('SELECT gc.*, c.name, c.channel_type, c.safeguarding_relevant FROM public.connect_group_channels gc JOIN public.connect_channels c ON c.id = gc.channel_id WHERE gc.group_id::text = %s ORDER BY gc.is_default DESC, c.name', (group_id,))
                channels = rows_to_dicts(cursor, cursor.fetchall())
            if relation_exists(cursor, 'connect_group_calendars'):
                cursor.execute('SELECT gcal.*, cal.name, cal.calendar_type FROM public.connect_group_calendars gcal JOIN public.connect_calendars cal ON cal.id = gcal.calendar_id WHERE gcal.group_id::text = %s ORDER BY gcal.is_default DESC, cal.name', (group_id,))
                calendars = rows_to_dicts(cursor, cursor.fetchall())
            return {'group': groups[0], 'members': members, 'channels': channels, 'calendars': calendars, 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/{group_id}/members', status_code=201)
async def add_member(group_id: str, payload: AddGroupMemberRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.added_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_group_members'):
                raise HTTPException(status_code=503, detail='Connect groups schema is not installed')
            cursor.execute(
                '''
                INSERT INTO public.connect_group_members (
                  group_id, user_id, staff_id, young_person_id, adult_id,
                  external_name, external_email, external_phone, organisation,
                  group_role, can_post, can_upload, can_invite, can_manage, can_view_restricted,
                  added_by, metadata
                )
                VALUES (%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb)
                ON CONFLICT DO NOTHING
                RETURNING *
                ''',
                (
                    group_id, payload.user_id, payload.staff_id, payload.young_person_id, payload.adult_id,
                    payload.external_name, payload.external_email, payload.external_phone, payload.organisation,
                    payload.group_role, payload.can_post, payload.can_upload, payload.can_invite, payload.can_manage,
                    payload.can_view_restricted, actor_id, payload.metadata,
                ),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            conn.commit()
            return {'member': rows[0] if rows else None, 'status': 'created'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.delete('/{group_id}/members/{member_id}')
async def remove_member(group_id: str, member_id: str, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'connect_group_members'):
                raise HTTPException(status_code=503, detail='Connect groups schema is not installed')
            cursor.execute(
                '''
                UPDATE public.connect_group_members
                SET removed_at = now()
                WHERE group_id::text = %s AND id::text = %s
                RETURNING *
                ''',
                (group_id, member_id),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Group member not found')
            conn.commit()
            return {'member': rows[0], 'status': 'removed'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/{group_id}/channels')
async def group_channels(group_id: str):
    data = await get_group(group_id)
    return {'channels': data.get('channels', []), 'status': 'ok'}


@router.get('/{group_id}/calendars')
async def group_calendars(group_id: str):
    data = await get_group(group_id)
    return {'calendars': data.get('calendars', []), 'status': 'ok'}
