from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api', tags=['OS Command'])

Priority = Literal['critical', 'high', 'medium', 'low', 'info']
Status = Literal['open', 'in_progress', 'waiting', 'completed', 'dismissed', 'void']


@dataclass
class CurrentUser:
    id: int
    provider_id: int | None = None
    home_ids: list[int] | None = None
    role: str = 'staff'


async def get_current_user(request: Request) -> CurrentUser:
    """Temporary OS auth bridge.

    Production should replace this with the app's real authenticated user dependency.
    For local/demo use, pass X-User-Id, X-Provider-Id and X-Role headers.
    """
    raw_user_id = request.headers.get('x-user-id') or request.headers.get('x-demo-user-id') or '1'
    raw_provider_id = request.headers.get('x-provider-id')
    role = request.headers.get('x-role') or 'manager'

    try:
        user_id = int(raw_user_id)
        provider_id = int(raw_provider_id) if raw_provider_id else None
    except ValueError as exc:
        raise HTTPException(status_code=401, detail='Invalid OS user headers') from exc

    return CurrentUser(id=user_id, provider_id=provider_id, role=role)


class _AcquireConnection:
    def __init__(self):
        self._conn = None
        self._adapter: PsycopgConnectionAdapter | None = None

    async def __aenter__(self):
        self._conn = get_db_connection()
        self._adapter = PsycopgConnectionAdapter(self._conn)
        return self._adapter

    async def __aexit__(self, exc_type, exc, tb):
        if self._conn is None:
            return
        try:
            if exc_type is None:
                self._conn.commit()
            else:
                self._conn.rollback()
        finally:
            release_db_connection(self._conn)


class PsycopgPoolAdapter:
    def acquire(self):
        return _AcquireConnection()


class PsycopgConnectionAdapter:
    def __init__(self, conn):
        self.conn = conn

    def _sql(self, sql: str) -> str:
        # The OS routers were written in asyncpg style. Convert simple positional
        # placeholders for this repo's existing psycopg2 pool.
        converted = sql
        for index in range(1, 51):
            converted = converted.replace(f'${index}', '%s')
        return converted

    async def fetch(self, sql: str, *params: Any) -> list[dict[str, Any]]:
        with self.conn.cursor() as cur:
            cur.execute(self._sql(sql), params)
            rows = cur.fetchall()
            return [dict(row) for row in rows]

    async def fetchrow(self, sql: str, *params: Any) -> dict[str, Any] | None:
        with self.conn.cursor() as cur:
            cur.execute(self._sql(sql), params)
            row = cur.fetchone()
            return dict(row) if row else None

    async def fetchval(self, sql: str, *params: Any):
        with self.conn.cursor() as cur:
            cur.execute(self._sql(sql), params)
            row = cur.fetchone()
            if row is None:
                return None
            if isinstance(row, dict):
                return next(iter(row.values()))
            return row[0]

    async def execute(self, sql: str, *params: Any):
        with self.conn.cursor() as cur:
            cur.execute(self._sql(sql), params)
            return cur.rowcount


_OS_POOL = PsycopgPoolAdapter()


def get_pool(request: Request):
    return _OS_POOL


class CommandItem(BaseModel):
    feed_id: str
    command_item_id: UUID | None = None
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    domain: str
    priority: Priority | str
    status: str
    title: str
    summary: str | None = None
    recommended_action: str | None = None
    source_table: str | None = None
    source_id: int | None = None
    due_at: str | None = None
    sccif_area: str | None = None
    regulation_refs: list[str] = []
    evidence_refs: list[dict] = []
    ai_generated: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class CommandSummary(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    critical_count: int
    high_count: int
    overdue_count: int
    safeguarding_count: int
    reg40_count: int
    risk_count: int
    quality_count: int
    open_total: int


class OSCommandResponse(BaseModel):
    summary: list[CommandSummary]
    items: list[CommandItem]


class UpdateCommandPayload(BaseModel):
    status: Status
    decision: str | None = None
    rationale: str | None = None


@router.get('/os-command', response_model=OSCommandResponse)
async def get_os_command(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    domain: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', %s, true)", str(user.id))
        summary_rows = await conn.fetch(
            'SELECT * FROM public.vw_os_command_summary WHERE (%s::int4 IS NULL OR home_id = %s)',
            home_id,
            home_id,
        )

        item_rows = await conn.fetch(
            'SELECT * FROM public.os_command_live_feed(%s, %s, %s, %s, %s)',
            home_id,
            young_person_id,
            domain,
            priority,
            limit,
        )

    return {
        'summary': [dict(r) for r in summary_rows],
        'items': [dict(r) for r in item_rows],
    }


@router.post('/os-command/{feed_id}/capture')
async def capture_feed_item(
    feed_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', %s, true)", str(user.id))
        item_id = await conn.fetchval(
            'SELECT public.os_command_capture_feed_item(%s, %s)',
            feed_id,
            user.id,
        )

    return {'id': str(item_id), 'status': 'open'}


@router.patch('/os-command/items/{item_id}')
async def update_command_item(
    item_id: UUID,
    payload: UpdateCommandPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', %s, true)", str(user.id))
        exists = await conn.fetchrow(
            'SELECT id FROM public.os_command_items WHERE id = %s',
            item_id,
        )

        if not exists:
            raise HTTPException(status_code=404, detail='Command item not found')

        await conn.execute(
            '''
            UPDATE public.os_command_items
            SET status = %s,
                completed_by = CASE WHEN %s = 'completed' THEN %s ELSE completed_by END,
                dismissed_by = CASE WHEN %s = 'dismissed' THEN %s ELSE dismissed_by END
            WHERE id = %s
            ''',
            payload.status,
            payload.status,
            user.id,
            payload.status,
            user.id,
            item_id,
        )

        if payload.decision:
            await conn.execute(
                '''
                INSERT INTO public.os_command_decisions (
                  command_item_id,
                  decision,
                  rationale,
                  decided_by
                ) VALUES (%s, %s, %s, %s)
                ''',
                item_id,
                payload.decision,
                payload.rationale,
                user.id,
            )

    return {'id': str(item_id), 'status': payload.status}
