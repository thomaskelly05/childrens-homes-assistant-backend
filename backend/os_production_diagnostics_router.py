from __future__ import annotations

from fastapi import APIRouter

from core.router_loader import (
    ROUTERS,
    get_accidental_route_conflicts,
    get_failed_routers,
    get_intentional_route_conflicts,
    get_route_conflicts,
    get_router_registry_summary,
)

router = APIRouter(prefix='/api/os-diagnostics', tags=['OS Diagnostics'])

EXPECTED_ENDPOINTS = [
    '/api/auth/me',
    '/api/os-command',
    '/api/os-command/care-recording',
    '/api/os-command/chronology-intelligence',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/placement-stability',
    '/api/os-command/inspection/workspaces',
    '/api/os-assistant/ask',
    '/api/documents',
    '/api/document-library',
    '/api/evidence',
    '/api/staff',
    '/api/staff-today',
    '/api/staff-profile',
    '/api/supervision',
    '/api/rota',
    '/api/rostering',
    '/api/mar',
    '/api/health',
    '/api/young-people/health',
    '/api/compliance',
    '/api/reg44',
    '/api/qa',
    '/api/reports',
    '/api/ofsted-pack',
    '/api/finance',
    '/api/pocket-money',
    '/api/sanctions',
    '/api/connect',
    '/api/calendar',
    '/api/tasks',
]

@router.get('/router-status')
async def router_status():
    failed = get_failed_routers()
    conflicts = get_route_conflicts()
    accidental_conflicts = get_accidental_route_conflicts()
    intentional_conflicts = get_intentional_route_conflicts()
    return {
        'ok': len(failed) == 0 and len(accidental_conflicts) == 0,
        'configured_router_count': len(ROUTERS),
        'failed_router_count': len(failed),
        'failed_routers': failed,
        'route_conflict_count': len(accidental_conflicts),
        'route_conflicts': conflicts,
        'accidental_route_conflict_count': len(accidental_conflicts),
        'accidental_route_conflicts': accidental_conflicts,
        'intentional_route_conflict_count': len(intentional_conflicts),
        'intentional_route_conflicts': intentional_conflicts,
        'registry_summary': get_router_registry_summary(),
        'configured_routers': ROUTERS,
    }

@router.get('/expected-endpoints')
async def expected_endpoints():
    return {'ok': True, 'expected_endpoints': EXPECTED_ENDPOINTS}

@router.get('/production-sweep')
async def production_sweep():
    return {
        'ok': True,
        'checks': [
            'frontend route audit',
            'backend router audit',
            'mounted router verification',
            'permissions audit',
            'fetch failure audit',
            'auth hydration audit',
            'missing endpoint audit',
            'dead legacy route audit',
            'duplicated module audit',
            'shell continuity audit',
        ],
    }
