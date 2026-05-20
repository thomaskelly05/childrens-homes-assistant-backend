from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix='/api/os-command', tags=['OS Source of Truth Audit'])

SOURCE_OF_TRUTH_DOMAINS: list[dict[str, Any]] = [
    {
        'domain': 'identity_security',
        'status': 'canonical_with_compatibility',
        'canonical': [
            'routers/auth_routes.py',
            'routers/mfa_routes.py',
            'routers/passkey_routes.py',
            'services/session_security_service.py',
            'frontend-next/contexts/auth-context.tsx',
        ],
        'compatibility': ['frontend/js/auth.js'],
        'enforcement_rule': 'Protected Next shell routes must use live /auth/me and must not treat browser cached identity as authoritative.',
        'remaining_work': [
            'Keep legacy auth.js synchronised only for compatibility screens.',
            'Ensure sensitive actions use step-up auth where required.',
            'Keep passkey and MFA challenge routes live and uncached.',
        ],
    },
    {
        'domain': 'orb_intelligence',
        'status': 'canonical_with_compatibility',
        'canonical': [
            '/api/orb/conversation',
            'services/orb_operational_context_service.py',
            'services/orb_metadata_first_context_service.py',
            'services/orb_response_composer.py',
        ],
        'compatibility': ['legacy assistant routes', 'legacy assistant SSE clients'],
        'enforcement_rule': 'ORB must operate inside user, role, home, provider, child and evidence visibility scope.',
        'remaining_work': [
            'Migrate remaining assistant clients to canonical ORB.',
            'Keep voice ORB routed through the same cognition pipeline.',
            'Prevent direct unscoped record lookups from ORB compatibility routes.',
        ],
    },
    {
        'domain': 'chronology',
        'status': 'partially_canonical',
        'canonical': [
            'os_chronology_events',
            'operational_lifecycle_history',
            'record_workflow_events',
            'chronology projection services',
        ],
        'compatibility': ['direct chronology table reads', 'legacy child timeline readers'],
        'enforcement_rule': 'Screens should read chronology through projection/service layers wherever possible, not ad-hoc table reads.',
        'remaining_work': [
            'Promote chronology projections as the primary read model.',
            'Mark direct chronology reads as compatibility-only.',
            'Ensure lifecycle submissions write chronology/evidence links consistently.',
        ],
    },
    {
        'domain': 'evidence_documents',
        'status': 'partially_canonical',
        'canonical': [
            'evidence_links',
            'os_evidence_links',
            'document lifecycle metadata',
            'governance evidence matrix links',
        ],
        'compatibility': ['documents', 'child_documents', 'statutory_documents', 'document_instances'],
        'enforcement_rule': 'Documents should surface through evidence/lifecycle metadata and must never fabricate inspection evidence.',
        'remaining_work': [
            'Create one evidence read model for child, governance and inspection screens.',
            'Preserve document store separation while presenting one evidence view.',
            'Add tamper-aware evidence hashing as the next maturity step.',
        ],
    },
    {
        'domain': 'workflow_lifecycle',
        'status': 'mostly_canonical',
        'canonical': [
            'record_workflow_events',
            'operational_lifecycle_history',
            'operational_audit_timeline',
            'frontend-next/lib/child-journey/workflows.ts',
        ],
        'compatibility': ['older direct form submission routes'],
        'enforcement_rule': 'All meaningful records should move through draft, submit, review/sign-off and audit lifecycle states.',
        'remaining_work': [
            'Route older direct submissions through lifecycle wrappers.',
            'Ensure every form writes audit/evidence/chronology metadata where applicable.',
        ],
    },
    {
        'domain': 'navigation_shell',
        'status': 'mostly_canonical',
        'canonical': [
            'Care Hub',
            'Young People',
            'Daily Care',
            'Chronology',
            'Documents',
            'Workforce',
            'Governance',
            'Reports',
            'ORB',
            'Admin',
        ],
        'compatibility': ['legacy assistant pages', 'older OS shells', 'legacy frontend pages'],
        'enforcement_rule': 'Adults should start from the clean Next shell and be guided by role/task rather than duplicate modules.',
        'remaining_work': [
            'Keep legacy pages redirecting or clearly marked compatibility-only.',
            'Avoid adding new top-level menus unless replacing a legacy path.',
        ],
    },
    {
        'domain': 'workforce',
        'status': 'partially_canonical',
        'canonical': [
            'workforce OS services',
            'training matrix',
            'supervision/probation lifecycle',
            'workforce command centre',
        ],
        'compatibility': ['staff tables', 'workforce_staff tables', 'older staff profile routes'],
        'enforcement_rule': 'Workforce records should connect to training, supervision, evidence, governance and practice-quality context.',
        'remaining_work': [
            'Converge staff and workforce_staff reads into one profile view.',
            'Route older staff evidence into workforce lifecycle/evidence model.',
        ],
    },
    {
        'domain': 'governance_inspection',
        'status': 'partially_canonical',
        'canonical': [
            'governance OS command centre',
            'Reg 44/45 workflow metadata',
            'inspection evidence matrix',
            'quality standards/SCCIF mapping',
        ],
        'compatibility': ['older Reg 44/45 imports', 'older inspection readiness panels'],
        'enforcement_rule': 'Governance must show evidence, oversight, review actions and gaps without creating fake inspection scores.',
        'remaining_work': [
            'Converge imported reports and governance projections into one oversight view.',
            'Add immutable inspection pack snapshotting later.',
        ],
    },
]


@router.get('/source-of-truth-audit')
def source_of_truth_audit() -> dict[str, Any]:
    statuses = {item['status'] for item in SOURCE_OF_TRUTH_DOMAINS}
    partial = [item for item in SOURCE_OF_TRUTH_DOMAINS if item['status'].startswith('partially')]
    compatibility = [item for item in SOURCE_OF_TRUTH_DOMAINS if item.get('compatibility')]
    return {
        'status': 'ok',
        'audit_scope': 'single_source_of_truth_convergence',
        'overall_state': 'canonical_direction_defined_enforcement_partial',
        'plain_english': 'IndiCare now has a clear source-of-truth direction, but some legacy and compatibility paths still need staged convergence.',
        'domains': SOURCE_OF_TRUTH_DOMAINS,
        'summary': {
            'domain_count': len(SOURCE_OF_TRUTH_DOMAINS),
            'statuses': sorted(statuses),
            'partial_domains': [item['domain'] for item in partial],
            'compatibility_domains': [item['domain'] for item in compatibility],
            'fully_done': False,
        },
        'next_enforcement_steps': [
            'Route compatibility auth through canonical live auth state.',
            'Promote chronology projections as primary read model.',
            'Present evidence/document stores through one evidence view.',
            'Migrate legacy assistant clients to canonical ORB.',
            'Route older form submissions through lifecycle/audit wrappers.',
        ],
    }
