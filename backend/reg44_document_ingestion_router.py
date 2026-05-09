from __future__ import annotations

import datetime
import decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/reg44-reader/documents', tags=['Reg 44 Document Ingestion'])


class IngestExistingAttachmentRequest(BaseModel):
    attachment_id: str
    home_id: int
    provider_id: int | None = None
    title: str | None = None
    report_month: datetime.date | None = None
    visit_date: datetime.date | None = None
    visitor_name: str | None = None
    visitor_role: str | None = None
    created_by: int | None = None
    analyse_now: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class AttachExtractedTextRequest(BaseModel):
    source_text: str
    analyse_now: bool = True
    force: bool = False
    updated_by: int | None = None


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


def call_analyse(cursor: Any, import_id: str, actor_id: int | None, force: bool = False) -> None:
    # Re-use the public API pipeline by invoking the same stored data shape.
    # The main reg44_report_reader_router performs richer first-pass extraction;
    # this endpoint prepares/imports documents and marks them ready for that analyser.
    cursor.execute(
        '''
        INSERT INTO public.reg44_report_reader_audit_events (
          report_import_id, event_type, event_summary, actor_id, metadata
        ) VALUES (%s::uuid, 'document_ready_for_analysis', 'Document text attached and ready for Reg 44 analysis', %s, %s::jsonb)
        ''',
        (import_id, actor_id, {'force': force}),
    )


@router.post('/from-attachment', status_code=201)
async def ingest_from_attachment(payload: IngestExistingAttachmentRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.created_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_report_imports'):
                raise HTTPException(status_code=503, detail='Reg 44 report reader schema is not installed')
            if not relation_exists(cursor, 'universal_record_attachments'):
                raise HTTPException(status_code=503, detail='Universal attachments schema is not installed')

            cursor.execute('SELECT * FROM public.universal_record_attachments WHERE id::text = %s LIMIT 1', (payload.attachment_id,))
            attachments = rows_to_dicts(cursor, cursor.fetchall())
            if not attachments:
                raise HTTPException(status_code=404, detail='Attachment not found')
            attachment = attachments[0]

            title = payload.title or f"Reg 44 report - {attachment.get('original_file_name') or attachment.get('file_name') or 'uploaded document'}"
            cursor.execute(
                '''
                SELECT public.reg44_create_import(
                  %s,%s,%s,%s,%s,%s,%s,%s::uuid,%s,%s,%s,%s,%s::jsonb
                )
                ''',
                (
                    payload.home_id,
                    title,
                    payload.provider_id,
                    payload.report_month,
                    payload.visit_date,
                    payload.visitor_name,
                    payload.visitor_role,
                    payload.attachment_id,
                    attachment.get('original_file_name') or attachment.get('file_name'),
                    attachment.get('public_url') or attachment.get('storage_path'),
                    attachment.get('extracted_text') or attachment.get('description') or '',
                    actor_id,
                    {**payload.metadata, 'attachment': attachment},
                ),
            )
            row = cursor.fetchone()
            import_id = str(row[0] if not isinstance(row, dict) else row.get('reg44_create_import'))

            if payload.analyse_now:
                call_analyse(cursor, import_id, actor_id, force=False)

            conn.commit()
            return {'id': import_id, 'attachment': attachment, 'status': 'created'}
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


@router.post('/imports/{import_id}/text')
async def attach_extracted_text(import_id: str, payload: AttachExtractedTextRequest, request: Request):
    conn = None
    try:
        conn = get_db_connection()
        actor_id = actor_id_from_request(request, payload.updated_by)
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_report_imports'):
                raise HTTPException(status_code=503, detail='Reg 44 report reader schema is not installed')
            cursor.execute(
                '''
                UPDATE public.reg44_report_imports
                SET source_text = %s,
                    status = 'uploaded',
                    updated_at = now(),
                    metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb
                WHERE id::text = %s
                RETURNING *
                ''',
                (payload.source_text, {'text_attached_at': datetime.datetime.utcnow().isoformat()}, import_id),
            )
            rows = rows_to_dicts(cursor, cursor.fetchall())
            if not rows:
                raise HTTPException(status_code=404, detail='Reg 44 import not found')
            cursor.execute(
                '''
                INSERT INTO public.reg44_report_reader_audit_events (
                  report_import_id, event_type, event_summary, actor_id, metadata
                ) VALUES (%s::uuid, 'source_text_attached', 'Extracted text attached to Reg 44 import', %s, %s::jsonb)
                ''',
                (import_id, actor_id, {'length': len(payload.source_text or '')}),
            )
            if payload.analyse_now:
                call_analyse(cursor, import_id, actor_id, force=payload.force)
            conn.commit()
            return {'import': rows[0], 'status': 'updated'}
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


@router.get('/ready-for-analysis')
async def ready_for_analysis(home_id: int | None = Query(default=None), provider_id: int | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            if not relation_exists(cursor, 'reg44_report_imports'):
                return {'imports': [], 'status': 'missing_schema'}
            where = ["status IN ('uploaded','failed')", "COALESCE(source_text, '') <> ''"]
            params: list[Any] = []
            if home_id is not None:
                where.append('home_id = %s')
                params.append(home_id)
            if provider_id is not None:
                where.append('provider_id = %s')
                params.append(provider_id)
            cursor.execute(
                'SELECT * FROM public.reg44_report_imports WHERE ' + ' AND '.join(where) + ' ORDER BY updated_at DESC LIMIT %s',
                tuple(params + [limit]),
            )
            return {'imports': rows_to_dicts(cursor, cursor.fetchall()), 'status': 'ok'}
    finally:
        if conn is not None:
            release_db_connection(conn)
