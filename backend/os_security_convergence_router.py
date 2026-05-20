from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix='/api/os-command', tags=['OS Security Convergence'])

SECURITY_AUDIT = {
    'identity': {
        'canonical': [
            'routers.auth_routes',
            'frontend-next/contexts/auth-context.tsx',
            '/auth/me',
        ],
        'compatibility': [
            'frontend/js/auth.js',
        ],
        'state': 'canonical_with_compatibility',
        'risk': 'medium',
        'notes': 'Protected routes must use live auth state and server-side RBAC enforcement.',
    },
    'mfa_passkeys': {
        'canonical': [
            'routers.mfa_routes',
            'routers.passkey_routes',
            '/auth/passkeys/authenticate/options',
            '/auth/passkeys/authenticate/verify',
        ],
        'compatibility': [],
        'state': 'canonical',
        'risk': 'low',
        'notes': 'Biometric and MFA flows remain challenge-based and uncached.',
    },
    'session_security': {
        'canonical': [
            'services/session_security_service.py',
            'routers.session_security_routes',
            'auth/tokens.py',
        ],
        'compatibility': [],
        'state': 'canonical',
        'risk': 'low',
        'notes': 'Revocation, trusted-device metadata and session lineage remain authoritative.',
    },
    'orb_scope': {
        'canonical': [
            '/api/orb/conversation',
            'services/orb_operational_context_service.py',
        ],
        'compatibility': [
            'legacy assistant routes',
            'assistant SSE compatibility runtime',
        ],
        'state': 'partially_canonical',
        'risk': 'medium',
        'notes': 'ORB must stay inside child, provider, role and evidence scope.',
    },
    'evidence_integrity': {
        'canonical': [
            'evidence_links',
            'os_evidence_links',
            'operational_audit_timeline',
            'record_workflow_events',
        ],
        'compatibility': [
            'older document linkage paths',
        ],
        'state': 'partially_canonical',
        'risk': 'high',
        'notes': 'The next maturity phase is immutable chronology/evidence integrity.',
    },
}


@router.get('/security-convergence')
def security_convergence() -> dict[str, Any]:
    return {
        'status': 'ok',
        'security_posture': 'safeguarding_grade_operational_platform',
        'plain_english': 'IndiCare security systems are largely present and converging toward one enforced operational security model.',
        'domains': SECURITY_AUDIT,
        'highest_remaining_risk': 'evidence_integrity',
        'priority_actions': [
            'Complete migration from compatibility auth paths.',
            'Keep ORB routed through canonical scoped cognition services.',
            'Move chronology and evidence toward immutable lineage models.',
            'Continue replacing direct record access with scoped operational services.',
        ],
    }
