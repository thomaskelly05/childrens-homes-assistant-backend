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

SPRINT_J_DOMAIN_CONTRACTS = [
    {
        'domain': 'young_people',
        'tables': ['young_people', 'vw_os_young_person_profile', 'os_young_person_care_records'],
        'required_columns': {'young_people': ['id']},
        'routes': ['/os/young-people', '/os/young-people/{id}/workspace', '/young-people/{id}'],
        'migration_risk': 'low',
        'safe_fallback': 'Profile and journey pages show controlled empty states when the profile view or care-record projection is absent.',
    },
    {
        'domain': 'staff_workforce',
        'tables': ['staff', 'workforce_staff', 'users', 'workforce_supervision_records', 'staff_training_matrix', 'workforce_evidence'],
        'required_columns': {'staff': ['id'], 'users': ['id']},
        'routes': ['/api/workforce-os/dashboard', '/api/workforce-os/command-centre', '/os/adults'],
        'migration_risk': 'medium',
        'safe_fallback': 'Workforce dashboards fall back to visible staff/users and show module limitations instead of creating fake coverage.',
    },
    {
        'domain': 'chronology',
        'tables': ['chronology_events', 'os_chronology_events', 'record_workflow_events', 'operational_lifecycle_history', 'operational_audit_timeline'],
        'required_columns': {'chronology_events': ['id'], 'os_chronology_events': ['id']},
        'routes': ['/os/chronology', '/young-people/{id}/chronology', '/api/operational-memory/chronology'],
        'migration_risk': 'medium',
        'safe_fallback': 'Chronology renders source-linked empty states and keeps direct workflow records available when projections lag.',
    },
    {
        'domain': 'evidence_links',
        'tables': ['evidence_links', 'os_evidence_links', 'inspection_evidence_facts', 'governance_evidence_matrix_links'],
        'required_columns': {'evidence_links': ['id'], 'os_evidence_links': ['id']},
        'routes': ['/os/evidence', '/os/evidence/attach', '/evidence/record/{type}/{id}'],
        'migration_risk': 'medium',
        'safe_fallback': 'Evidence panels show metadata gaps and never fabricate document or inspection evidence.',
    },
    {
        'domain': 'incidents',
        'tables': ['incidents'],
        'required_columns': {'incidents': ['id', 'young_person_id']},
        'routes': ['/young-people/{id}/incidents', '/young-people/incidents/{id}'],
        'migration_risk': 'low',
        'safe_fallback': 'Incident workflow saves to the source route and linked chronology appears when backend projection is available.',
    },
    {
        'domain': 'safeguarding',
        'tables': ['safeguarding_records', 'safeguarding_domain_records', 'os_safeguarding_patterns'],
        'required_columns': {'safeguarding_records': ['id', 'young_person_id'], 'safeguarding_domain_records': ['id']},
        'routes': ['/young-people/{id}/safeguarding', '/api/safeguarding/domain'],
        'migration_risk': 'high',
        'safe_fallback': 'Compatibility and domain tables are reported separately so threshold records are not silently merged.',
    },
    {
        'domain': 'missing_episodes',
        'tables': ['missing_episodes', 'missing_episode_domain_records', 'return_home_interviews'],
        'required_columns': {'missing_episodes': ['id', 'young_person_id'], 'missing_episode_domain_records': ['id']},
        'routes': ['/young-people/{id}/missing-episodes', '/api/missing-episodes'],
        'migration_risk': 'high',
        'safe_fallback': 'Missing, return interview and risk-review records stay explicit when one domain table is not present.',
    },
    {
        'domain': 'health_medication',
        'tables': ['health_records', 'medication_records', 'medication_profiles', 'young_person_health_profile'],
        'required_columns': {'health_records': ['id', 'young_person_id'], 'medication_records': ['id', 'young_person_id']},
        'routes': ['/young-people/{id}/health', '/young-people/{id}/medication-records'],
        'migration_risk': 'medium',
        'safe_fallback': 'Health and medication forms show live write limitations and keep child journey links visible.',
    },
    {
        'domain': 'education',
        'tables': ['education_records', 'education_plans', 'pep_records', 'young_person_education_profile'],
        'required_columns': {'education_records': ['id', 'young_person_id']},
        'routes': ['/young-people/{id}/education', '/young-people/education-records/{id}'],
        'migration_risk': 'medium',
        'safe_fallback': 'Education updates remain child-scoped even when PEP/profile tables are not deployed.',
    },
    {
        'domain': 'family_contact',
        'tables': ['family_contact_records', 'family_contact_plans', 'contact_arrangements', 'young_person_contacts'],
        'required_columns': {'family_contact_records': ['id', 'young_person_id']},
        'routes': ['/young-people/{id}/family', '/young-people/family/records/{id}'],
        'migration_risk': 'medium',
        'safe_fallback': 'Family contact falls back to family-contact records without claiming a full contact-plan projection.',
    },
    {
        'domain': 'keywork',
        'tables': ['keywork_sessions'],
        'required_columns': {'keywork_sessions': ['id', 'young_person_id']},
        'routes': ['/young-people/{id}/keywork', '/young-people/keywork/{id}'],
        'migration_risk': 'low',
        'safe_fallback': 'Keywork remains a source workflow and feeds chronology when the writer/projection is available.',
    },
    {
        'domain': 'documents',
        'tables': ['documents', 'child_documents', 'statutory_documents', 'document_instances', 'document_templates'],
        'required_columns': {'documents': ['id'], 'child_documents': ['id'], 'statutory_documents': ['id']},
        'routes': ['/os/documents', '/young-people/{id}/documents', '/api/document-system'],
        'migration_risk': 'high',
        'safe_fallback': 'Document pages label metadata-only evidence and keep sign-off/review state separate by store.',
    },
    {
        'domain': 'actions',
        'tables': ['actions', 'tasks', 'manager_actions', 'inspection_improvement_actions', 'reg44_actions', 'reg45_actions'],
        'required_columns': {'actions': ['id'], 'tasks': ['id']},
        'routes': ['/os/actions', '/actions', '/management'],
        'migration_risk': 'medium',
        'safe_fallback': 'Open-action panels use the unified actions repository and report empty queues honestly.',
    },
    {
        'domain': 'governance_reg44_reg45',
        'tables': ['governance_reg44_visits', 'governance_evidence_matrix_links', 'reg44_visits', 'reg44_findings', 'reg44_actions', 'reg45_reviews', 'reg45_actions'],
        'required_columns': {'reg44_actions': ['id'], 'reg45_reviews': ['id']},
        'routes': ['/api/governance-os/command-centre', '/governance/command-centre', '/ofsted-readiness'],
        'migration_risk': 'high',
        'safe_fallback': 'Governance shows evidence gaps and review prompts without generating fake inspection scores.',
    },
    {
        'domain': 'audit_events',
        'tables': ['audit_events', 'os_audit_events', 'operational_audit_timeline', 'record_workflow_events', 'ai_audit_logs'],
        'required_columns': {'audit_events': ['id'], 'os_audit_events': ['id']},
        'routes': ['/os/audit/{entity_type}/{record_id}', '/api/admin/os-wiring'],
        'migration_risk': 'medium',
        'safe_fallback': 'Audit views expose unavailable planes as gaps and keep source records readable.',
    },
    {
        'domain': 'orb_memory_context',
        'tables': ['orb_realtime_sessions', 'indicare_ai_memory_items', 'operational_event_log', 'operational_lifecycle_history'],
        'required_columns': {'orb_realtime_sessions': ['id'], 'indicare_ai_memory_items': ['id']},
        'routes': ['/api/orb/conversation', '/orb/session/start', '/assistant/memory'],
        'migration_risk': 'medium',
        'safe_fallback': 'ORB falls back to live context and typed conversation when memory or voice-session persistence is unavailable.',
    },
]

DUPLICATE_TABLE_GROUPS = [
    {
        'domain': 'safeguarding',
        'tables': ['safeguarding_records', 'safeguarding_domain_records'],
        'interpretation': 'Compatibility and first-class domain stores both exist in code; do not merge without migration.',
    },
    {
        'domain': 'missing',
        'tables': ['missing_episodes', 'missing_episode_domain_records', 'return_home_interviews'],
        'interpretation': 'Episode and return-home workflow data can be split across legacy and domain tables.',
    },
    {
        'domain': 'documents',
        'tables': ['documents', 'child_documents', 'statutory_documents', 'document_instances'],
        'interpretation': 'Document metadata, statutory files and editor instances are separate operational stores.',
    },
    {
        'domain': 'governance',
        'tables': ['reg44_visits', 'governance_reg44_visits', 'reg44_report_imports'],
        'interpretation': 'Reg 44 visit workflow, governance projection and report imports overlap but are not interchangeable.',
    },
    {
        'domain': 'audit',
        'tables': ['audit_events', 'os_audit_events', 'operational_audit_timeline', 'record_workflow_events', 'ai_audit_logs'],
        'interpretation': 'HTTP, OS writeback, lifecycle and AI audit planes are separate evidence trails.',
    },
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


def table_columns(cursor: Any, name: str) -> list[str]:
    cursor.execute(
        '''
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
        ORDER BY ordinal_position
        ''',
        (name,),
    )
    rows = cursor.fetchall()
    return [row.get('column_name') if isinstance(row, dict) else row[0] for row in rows]


def audit_domain_contract(cursor: Any, contract: dict[str, Any]) -> dict[str, Any]:
    tables = [check_relation(cursor, name) for name in contract['tables']]
    columns_by_table = {
        item['name']: table_columns(cursor, item['name'])
        for item in tables
        if item['exists'] and item.get('kind') in {'table', 'view', 'materialized_view'}
    }
    missing_tables = [item['name'] for item in tables if not item['exists']]
    partial_tables = []
    for table_name, required_columns in contract.get('required_columns', {}).items():
        columns = set(columns_by_table.get(table_name, []))
        missing_columns = [column for column in required_columns if column not in columns]
        if columns and missing_columns:
            partial_tables.append({'name': table_name, 'missing_columns': missing_columns})

    return {
        'domain': contract['domain'],
        'status': 'missing' if len(missing_tables) == len(tables) else 'partial' if missing_tables or partial_tables else 'present',
        'tables': tables,
        'missing_tables': missing_tables,
        'partial_tables': partial_tables,
        'routes': contract['routes'],
        'migration_risk': contract['migration_risk'],
        'safe_fallback': contract['safe_fallback'],
    }


def audit_duplicate_groups(cursor: Any) -> list[dict[str, Any]]:
    groups = []
    for group in DUPLICATE_TABLE_GROUPS:
        tables = [check_relation(cursor, name) for name in group['tables']]
        groups.append({
            **group,
            'existing_tables': [item['name'] for item in tables if item['exists']],
            'missing_tables': [item['name'] for item in tables if not item['exists']],
        })
    return groups


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
            sprint_j_domains = [audit_domain_contract(cursor, contract) for contract in SPRINT_J_DOMAIN_CONTRACTS]
            duplicate_table_groups = audit_duplicate_groups(cursor)

        missing_core = [item['name'] for item in core if not item['exists']]
        missing_care = [item['name'] for item in care if not item['exists']]
        missing_os_tables = [item['name'] for item in os_tables if not item['exists']]
        missing_os_views = [item['name'] for item in os_views if not item['exists']]
        missing_os_functions = [item['name'] for item in os_functions if not item['exists']]

        return {
            'status': 'ok',
            'audit_scope': 'sprint_j_live_operational_proof',
            'frontend_endpoints': FRONTEND_ENDPOINTS,
            'core_tables': core,
            'care_domain_tables': care,
            'os_tables': os_tables,
            'os_views': os_views,
            'os_functions': os_functions,
            'sprint_j_domains': sprint_j_domains,
            'missing': {
                'core_tables': missing_core,
                'care_domain_tables': missing_care,
                'os_tables': missing_os_tables,
                'os_views': missing_os_views,
                'os_functions': missing_os_functions,
                'sprint_j_domains': [item['domain'] for item in sprint_j_domains if item['status'] == 'missing'],
            },
            'partial': {
                'sprint_j_domains': [item for item in sprint_j_domains if item['status'] == 'partial'],
            },
            'duplicate_table_groups': duplicate_table_groups,
            'assessment': {
                'runtime_safe': True,
                'can_run_from_existing_tables': not missing_core,
                'advanced_os_complete': not (missing_os_tables or missing_os_views or missing_os_functions),
                'sprint_j_operational_domains_complete': not any(item['status'] != 'present' for item in sprint_j_domains),
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
