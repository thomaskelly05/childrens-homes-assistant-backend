from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from db.connection import get_db_connection, release_db_connection

router = APIRouter(prefix='/api/os-command', tags=['OS Schema Audit'])

CORE_TABLES = [
    'young_people',
    'daily_notes',
    'incidents',
    'safeguarding_records',
    'missing_episodes',
    'keywork_sessions',
    'health_records',
    'medication_records',
    'education_records',
    'family_contact_records',
    'risk_assessments',
    'support_plans',
    'actions',
    'tasks',
    'documents',
    'child_documents',
    'staff',
    'workforce_staff',
    'users',
    'audit_events',
]

CARE_DOMAIN_TABLES = [
    'appointments',
    'chronology_events',
    'os_chronology_events',
    'evidence_links',
    'os_evidence_links',
    'achievements',
    'monthly_reviews',
    'handover_entries',
    'handover_records',
    'reg44_visits',
    'reg44_findings',
    'reg44_actions',
    'reg45_reviews',
    'reg45_actions',
]

OS_TABLES = [
    'os_command_items',
    'os_command_ai_suggestions',
    'os_command_audit_events',
    'os_audit_events',
    'os_chronology_events',
    'os_evidence_links',
    'record_workflow_events',
    'operational_lifecycle_history',
    'operational_audit_timeline',
    'os_chronology_overlays',
    'os_safeguarding_patterns',
    'os_manager_reviews',
    'os_staff_wellbeing_snapshots',
    'os_home_resilience_snapshots',
    'os_provider_command_snapshots',
    'os_contextual_risk_nodes',
    'os_contextual_risk_edges',
    'os_network_risk_alerts',
    'os_placement_stability_snapshots',
    'os_young_person_care_records',
    'os_young_person_daily_summary',
    'os_young_person_care_plan_sections',
]

OS_VIEWS = [
    'vw_os_command_summary',
    'vw_os_provider_command_centre',
    'vw_os_provider_home_command_matrix',
    'vw_os_young_person_profile',
    'vw_os_young_person_timeline',
    'vw_os_young_person_care_record_feed',
    'vw_os_young_person_recording_summary',
    'vw_os_care_plan_review_board',
    'vw_os_chronology_intelligence',
    'vw_os_safeguarding_network',
    'vw_os_network_risk_alert_board',
    'vw_os_placement_stability_board',
    'vw_os_staff_wellbeing_board',
    'vw_os_home_resilience_board',
    'vw_os_inspection_workspaces',
]

OS_FUNCTIONS = [
    'os_command_live_feed',
    'os_command_create_manual_item',
    'os_chronology_add_event',
    'os_generate_provider_command_snapshot',
    'os_create_care_record',
    'os_approve_care_record',
    'os_sync_care_record_to_daily_notes',
]

FRONTEND_ENDPOINTS = [
    '/api/os-command',
    '/api/os-command/provider-command-centre',
    '/api/os-command/young-people',
    '/api/os-command/care-recording',
    '/api/os-command/safeguarding-patterns',
    '/api/os-command/safeguarding-network',
    '/api/os-command/chronology-intelligence',
    '/api/os-command/placement-stability',
    '/api/os-command/staff-wellbeing',
    '/api/os-command/inspection/workspaces',
    '/api/os-command/young-person/{id}/workspace',
]


def check_relation(cursor: Any, name: str) -> dict[str, Any]:
    cursor.execute(
        '''
        SELECT c.relkind
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = %s
        LIMIT 1
        ''',
        (name,),
    )
    row = cursor.fetchone()
    relkind = row.get('relkind') if isinstance(row, dict) and row else row[0] if row else None
    return {
        'name': name,
        'exists': bool(relkind),
        'kind': {'r': 'table', 'v': 'view', 'm': 'materialized_view'}.get(relkind, relkind),
    }


def check_function(cursor: Any, name: str) -> dict[str, Any]:
    cursor.execute(
        '''
        SELECT count(*)
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = %s
        ''',
        (name,),
    )
    row = cursor.fetchone()
    count = row.get('count') if isinstance(row, dict) and row else row[0] if row else 0
    return {'name': name, 'exists': bool(count), 'overloads': int(count or 0)}


@router.get('/schema-audit')
async def schema_audit() -> dict[str, Any]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            core = [check_relation(cursor, name) for name in CORE_TABLES]
            care = [check_relation(cursor, name) for name in CARE_DOMAIN_TABLES]
            os_tables = [check_relation(cursor, name) for name in OS_TABLES]
            os_views = [check_relation(cursor, name) for name in OS_VIEWS]
            os_functions = [check_function(cursor, name) for name in OS_FUNCTIONS]

        missing_core = [item['name'] for item in core if not item['exists']]
        missing_care = [item['name'] for item in care if not item['exists']]
        missing_os_tables = [item['name'] for item in os_tables if not item['exists']]
        missing_os_views = [item['name'] for item in os_views if not item['exists']]
        missing_os_functions = [item['name'] for item in os_functions if not item['exists']]

        return {
            'status': 'ok',
            'frontend_endpoints': FRONTEND_ENDPOINTS,
            'core_tables': core,
            'care_domain_tables': care,
            'os_tables': os_tables,
            'os_views': os_views,
            'os_functions': os_functions,
            'missing': {
                'core_tables': missing_core,
                'care_domain_tables': missing_care,
                'os_tables': missing_os_tables,
                'os_views': missing_os_views,
                'os_functions': missing_os_functions,
            },
            'assessment': {
                'runtime_safe': True,
                'can_run_from_existing_tables': not missing_core,
                'advanced_os_complete': not (missing_os_tables or missing_os_views or missing_os_functions),
            },
        }
    except Exception as error:
        return {
            'status': 'error',
            'message': str(error),
            'frontend_endpoints': FRONTEND_ENDPOINTS,
        }
    finally:
        if conn is not None:
            release_db_connection(conn)
