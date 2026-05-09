from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/reg44-trends', tags=['Reg44 Trend Engine'])


class SnapshotRequest(BaseModel):
    home_id: int | None = None
    provider_id: int | None = None
    period_start: datetime.date | None = None
    period_end: datetime.date | None = None
    created_by: int | None = None


class CompareRequest(BaseModel):
    home_id: int | None = None
    provider_id: int | None = None
    months: int = 6


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


@router.post('/snapshots', status_code=201)
async def create_snapshot(payload: SnapshotRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_trend_snapshots'):
                raise HTTPException(status_code=503, detail='Reg44 trend engine schema is not installed')
            cursor.execute(
                'SELECT public.reg44_generate_trend_snapshot(%s,%s,%s,%s,%s)',
                (
                    payload.home_id,
                    payload.provider_id,
                    payload.period_start,
                    payload.period_end,
                    actor_id,
                ),
            )
            row = cursor.fetchone()
            snapshot_id = str(row[0] if not isinstance(row, dict) else row.get('reg44_generate_trend_snapshot'))
            conn.commit()
            return {'snapshot_id': snapshot_id, 'status': 'created'}
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


@router.get('/snapshots')
async def list_snapshots(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_trend_snapshots'):
                return {'snapshots': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            sql = 'SELECT * FROM public.reg44_trend_snapshots'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY created_at DESC LIMIT %s'
            cursor.execute(sql, tuple(params + [limit]))
            return {'snapshots': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/snapshots/{snapshot_id}')
async def get_snapshot(snapshot_id: str):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute('SELECT * FROM public.reg44_trend_snapshots WHERE id::text = %s LIMIT 1', (snapshot_id,))
            snapshots = rows_to_dicts(cursor, cursor.fetchall())
            if not snapshots:
                raise HTTPException(status_code=404, detail='Trend snapshot not found')
            cursor.execute('SELECT * FROM public.reg44_trend_items WHERE snapshot_id::text = %s ORDER BY severity DESC, report_count DESC, evidence_count DESC', (snapshot_id,))
            items = rows_to_dicts(cursor, cursor.fetchall())
            return {'snapshot': snapshots[0], 'items': items, 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post('/compare')
async def compare_reports(payload: CompareRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_reg44_provider_risk_board'):
                raise HTTPException(status_code=503, detail='Reg44 trend engine schema is not installed')

            period_end = datetime.date.today()
            period_start = period_end - datetime.timedelta(days=max(payload.months, 1) * 30)

            cursor.execute(
                'SELECT public.reg44_generate_trend_snapshot(%s,%s,%s,%s,%s)',
                (
                    payload.home_id,
                    payload.provider_id,
                    period_start,
                    period_end,
                    actor_id_from_request(request),
                ),
            )
            row = cursor.fetchone()
            snapshot_id = str(row[0] if not isinstance(row, dict) else row.get('reg44_generate_trend_snapshot'))

            cursor.execute('SELECT * FROM public.reg44_trend_snapshots WHERE id::text = %s LIMIT 1', (snapshot_id,))
            snapshots = rows_to_dicts(cursor, cursor.fetchall())
            cursor.execute('SELECT * FROM public.reg44_trend_items WHERE snapshot_id::text = %s ORDER BY severity DESC, repeated_shortfall DESC, safeguarding_relevant DESC, report_count DESC', (snapshot_id,))
            items = rows_to_dicts(cursor, cursor.fetchall())
            conn.commit()
            return {
                'snapshot': snapshots[0] if snapshots else None,
                'trends': items,
                'summary': {
                    'recurring_safeguarding': len([i for i in items if i.get('safeguarding_relevant')]),
                    'repeated_shortfalls': len([i for i in items if i.get('repeated_shortfall')]),
                    'good_practice_themes': len([i for i in items if i.get('good_practice')]),
                    'high_risk_trends': len([i for i in items if i.get('severity') == 'high']),
                },
                'status': 'ok',
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


@router.get('/provider-risk-board')
async def provider_risk_board(provider_id: int | None = Query(default=None), home_id: int | None = Query(default=None)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_reg44_provider_risk_board'):
                return {'items': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            sql = 'SELECT * FROM public.vw_reg44_provider_risk_board'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY CASE risk_rating WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, overdue_action_count DESC, safeguarding_count DESC'
            cursor.execute(sql, tuple(params))
            return {'items': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.get('/themes')
async def recurring_themes(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), safeguarding_only: bool = Query(default=False)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'vw_reg44_theme_counts'):
                return {'themes': [], 'status': 'missing_schema'}
            where = []
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            if safeguarding_only:
                where.append('safeguarding_count > 0')
            sql = 'SELECT * FROM public.vw_reg44_theme_counts'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += ' ORDER BY safeguarding_count DESC, shortfall_count DESC, evidence_count DESC'
            cursor.execute(sql, tuple(params))
            return {'themes': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
