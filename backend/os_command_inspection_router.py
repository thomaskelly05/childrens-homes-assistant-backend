from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Inspection Mode'])


class InspectionWorkspaceSummary(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    title: str
    status: str
    inspection_type: str
    date_from: str | None = None
    date_to: str | None = None
    inspector_access_starts_at: str | None = None
    inspector_access_ends_at: str | None = None
    total_items: int = 0
    inspector_visible_items: int = 0
    cep_items: int = 0
    hp_items: int = 0
    lm_items: int = 0
    evidence_gaps: int = 0
    created_at: str
    updated_at: str


class InspectionWorkspaceItem(BaseModel):
    id: str
    workspace_id: str
    provider_id: int | None = None
    home_id: int
    sccif_area: str
    item_type: str
    title: str
    summary: str | None = None
    source_table: str | None = None
    source_id: str | None = None
    command_item_id: str | None = None
    chronology_event_id: str | None = None
    strength: str | None = None
    manager_commentary: str | None = None
    inspector_visible: bool
    sort_order: int
    created_at: str


class InspectionWorkspaceResponse(BaseModel):
    workspaces: list[InspectionWorkspaceSummary]
    items: list[InspectionWorkspaceItem]


class CreateWorkspacePayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    title: str
    date_from: str | None = None
    date_to: str | None = None


class ActivateWorkspacePayload(BaseModel):
    access_starts_at: str | None = None
    access_ends_at: str | None = None


@router.get('/os-command/inspection/workspaces', response_model=InspectionWorkspaceResponse)
async def get_inspection_workspaces(
    request: Request,
    home_id: int | None = Query(default=None),
    workspace_id: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        workspaces = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_inspection_workspace_summary
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::uuid IS NULL OR id = $2::uuid)
            ORDER BY
              CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'locked' THEN 2 ELSE 3 END,
              created_at DESC
            ''',
            home_id,
            workspace_id,
        )

        items = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_inspection_workspace_items
            WHERE ($1::uuid IS NULL OR workspace_id = $1::uuid)
              AND ($2::int4 IS NULL OR home_id = $2)
            ORDER BY sccif_area, sort_order, created_at DESC
            ''',
            workspace_id,
            home_id,
        )

    return {'workspaces': [dict(r) for r in workspaces], 'items': [dict(r) for r in items]}


@router.post('/os-command/inspection/workspaces')
async def create_inspection_workspace(
    payload: CreateWorkspacePayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        workspace_id = await conn.fetchval(
            '''
            SELECT public.os_inspection_create_workspace(
              $1, $2, $3, $4::date, $5::date, $6
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.title,
            payload.date_from,
            payload.date_to,
            user.id,
        )

    return {'id': str(workspace_id), 'status': 'draft'}


@router.post('/os-command/inspection/workspaces/{workspace_id}/activate')
async def activate_inspection_workspace(
    workspace_id: UUID,
    payload: ActivateWorkspacePayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        activated = await conn.fetchval(
            '''
            SELECT public.os_inspection_activate_workspace(
              $1, coalesce($2::timestamptz, now()), $3::timestamptz, $4
            )
            ''',
            workspace_id,
            payload.access_starts_at,
            payload.access_ends_at,
            user.id,
        )

    return {'id': str(activated), 'status': 'active'}
