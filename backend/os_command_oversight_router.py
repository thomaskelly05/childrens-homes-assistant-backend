from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Oversight'])


class ProviderOversightRow(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    open_commands: int = 0
    critical_commands: int = 0
    high_commands: int = 0
    overdue_commands: int = 0
    safeguarding_pressure: int = 0
    quality_pressure: int = 0
    ai_generated_open: int = 0
    latest_command_at: str | None = None
    oversight_state: str


class InspectionReadinessRow(BaseModel):
    home_id: int | None = None
    critical_open: int = 0
    high_open: int = 0
    overdue_open: int = 0
    active_missing: int = 0
    missing_followup_overdue: int = 0
    reg40_overdue: int = 0
    reg40_required: int = 0
    strong_evidence: int = 0
    evidence_gaps: int = 0
    children_experiences_progress_open: int = 0
    helped_and_protected_open: int = 0
    leadership_management_open: int = 0
    children_experiences_progress_evidence: int = 0
    helped_and_protected_evidence: int = 0
    leadership_management_evidence: int = 0
    readiness_state: str


class SCCIFEvidenceSummaryRow(BaseModel):
    home_id: int | None = None
    sccif_area: str
    evidence_items: int = 0
    strong_count: int = 0
    adequate_count: int = 0
    weak_count: int = 0
    gap_count: int = 0
    latest_evidence_at: str | None = None


class OversightResponse(BaseModel):
    oversight: list[ProviderOversightRow]
    readiness: list[InspectionReadinessRow]
    evidence: list[SCCIFEvidenceSummaryRow]


class CreateEvidenceNotePayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    command_item_id: str | None = None
    chronology_event_id: str | None = None
    sccif_area: str
    evidence_title: str
    evidence_summary: str
    strength: str = 'adequate'
    management_commentary: str | None = None
    source_refs: list[dict[str, Any]] = []


class StartInspectionExportPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    title: str
    date_from: str | None = None
    date_to: str | None = None
    sccif_area: str | None = None


@router.get('/os-command/provider-oversight', response_model=OversightResponse)
async def get_provider_oversight(
    request: Request,
    provider_id: int | None = Query(default=None),
    home_id: int | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        oversight = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_provider_oversight
            WHERE ($1::int4 IS NULL OR provider_id = $1)
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY
              CASE oversight_state
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'monitor' THEN 2
                ELSE 3
              END,
              overdue_commands DESC,
              critical_commands DESC
            ''',
            provider_id,
            home_id,
        )

        readiness = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_inspection_readiness
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY
              CASE readiness_state
                WHEN 'urgent' THEN 0
                WHEN 'requires_attention' THEN 1
                WHEN 'monitor' THEN 2
                ELSE 3
              END,
              critical_open DESC,
              overdue_open DESC
            ''',
            home_id,
        )

        evidence = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_sccif_evidence_summary
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY home_id, sccif_area
            ''',
            home_id,
        )

    return {
        'oversight': [dict(r) for r in oversight],
        'readiness': [dict(r) for r in readiness],
        'evidence': [dict(r) for r in evidence],
    }


@router.post('/os-command/inspection/evidence-note')
async def create_inspection_evidence_note(
    payload: CreateEvidenceNotePayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        evidence_id = await conn.fetchval(
            '''
            SELECT public.os_inspection_create_evidence_note(
              $1, $2, $3, $4, $5, $6, $7, $8::uuid, $9::uuid, $10, $11::jsonb, $12
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.sccif_area,
            payload.evidence_title,
            payload.evidence_summary,
            payload.strength,
            payload.young_person_id,
            payload.command_item_id,
            payload.chronology_event_id,
            payload.management_commentary,
            payload.source_refs,
            user.id,
        )

    return {'id': str(evidence_id), 'status': 'created'}


@router.post('/os-command/inspection/export')
async def start_inspection_export(
    payload: StartInspectionExportPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        export_id = await conn.fetchval(
            '''
            SELECT public.os_inspection_start_export(
              $1, $2, $3, $4::date, $5::date, $6, $7
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.title,
            payload.date_from,
            payload.date_to,
            payload.sccif_area,
            user.id,
        )

    return {'id': str(export_id), 'status': 'ready'}


@router.get('/os-command/inspection/exports')
async def list_inspection_exports(
    request: Request,
    home_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        rows = await conn.fetch(
            '''
            SELECT id, provider_id, home_id, export_type, title, date_from, date_to,
                   sccif_area, requested_by, status, file_url, generated_at, created_at
            FROM public.os_inspection_exports
            WHERE ($1::int4 IS NULL OR home_id = $1)
            ORDER BY created_at DESC
            LIMIT $2
            ''',
            home_id,
            limit,
        )

    return [dict(r) for r in rows]
