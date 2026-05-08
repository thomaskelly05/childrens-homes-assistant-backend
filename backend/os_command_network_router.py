from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from .os_command_router import CurrentUser, get_current_user, get_pool

router = APIRouter(tags=['OS Command Safeguarding Network'])


class NetworkNodeRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    node_type: str
    display_name: str
    young_person_id: int | None = None
    staff_id: int | None = None
    external_reference: str | None = None
    risk_level: str
    is_sensitive: bool
    metadata: dict[str, Any] = {}
    created_at: str
    outgoing_edges: list[dict[str, Any]] = []


class NetworkRiskAlertRow(BaseModel):
    id: str
    provider_id: int | None = None
    home_id: int
    young_person_id: int | None = None
    alert_type: str
    severity: str
    title: str
    summary: str
    linked_nodes: list = []
    linked_edges: list = []
    command_item_id: str | None = None
    status: str
    created_at: str
    severity_sort: int


class NetworkResponse(BaseModel):
    nodes: list[NetworkNodeRow]
    alerts: list[NetworkRiskAlertRow]


class AddMissingLocationPayload(BaseModel):
    provider_id: int | None = None
    home_id: int
    young_person_id: int
    location_name: str
    missing_workflow_id: str | None = None
    risk_level: str = 'high'


class DetectSharedRisksPayload(BaseModel):
    provider_id: int | None = None
    home_id: int


@router.get('/os-command/safeguarding-network', response_model=NetworkResponse)
async def get_safeguarding_network(
    request: Request,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    node_type: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))

        nodes = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_safeguarding_network
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
              AND ($3::text IS NULL OR node_type = $3)
            ORDER BY
              CASE risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
              created_at DESC
            LIMIT 1000
            ''',
            home_id,
            young_person_id,
            node_type,
        )

        alerts = await conn.fetch(
            '''
            SELECT *
            FROM public.vw_os_network_risk_alert_board
            WHERE ($1::int4 IS NULL OR home_id = $1)
              AND ($2::int4 IS NULL OR young_person_id = $2)
            ORDER BY severity_sort, created_at DESC
            LIMIT 500
            ''',
            home_id,
            young_person_id,
        )

    return {'nodes': [dict(r) for r in nodes], 'alerts': [dict(r) for r in alerts]}


@router.post('/os-command/safeguarding-network/missing-location')
async def add_missing_location_link(
    payload: AddMissingLocationPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        edge_id = await conn.fetchval(
            '''
            SELECT public.os_network_add_missing_location(
              $1, $2, $3, $4, $5::uuid, $6::os_pattern_severity, $7
            )
            ''',
            payload.provider_id,
            payload.home_id,
            payload.young_person_id,
            payload.location_name,
            payload.missing_workflow_id,
            payload.risk_level,
            user.id,
        )

    return {'id': str(edge_id), 'status': 'linked'}


@router.post('/os-command/safeguarding-network/detect-shared-risks')
async def detect_shared_network_risks(
    payload: DetectSharedRisksPayload,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
):
    pool = get_pool(request)

    async with pool.acquire() as conn:
        await conn.execute("select set_config('app.user_id', $1, true)", str(user.id))
        count = await conn.fetchval(
            'SELECT public.os_network_detect_shared_risks($1, $2, $3)',
            payload.provider_id,
            payload.home_id,
            user.id,
        )

    return {'detected': count}
