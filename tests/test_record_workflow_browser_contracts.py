from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_browser_recording_contracts_route_core_workflows_to_live_api_paths():
    recording_route = (ROOT / "frontend-next/app/api/recording/route.ts").read_text()

    assert "POST /young-people/{id}/daily-notes" not in recording_route
    assert "daily-notes" in recording_route
    assert "incidents" in recording_route
    assert "health-records" in recording_route
    assert "education-records" in recording_route
    assert "keywork" in recording_route
    assert "family/records" in recording_route
    assert "/risk" in recording_route
    assert "/plans" in recording_route
    assert "missing_from_placement" in recording_route
    assert "safeguarding_concern" in recording_route


def test_browser_workflow_definitions_include_sprint_i_core_records():
    workflow_defs = (ROOT / "frontend-next/lib/child-journey/workflows.ts").read_text()

    for workflow in [
        "daily-note",
        "incidents",
        "safeguarding",
        "missing",
        "health",
        "keywork",
        "family-contact",
        "education-update",
        "risk-assessment",
        "support-plan",
        "documents",
        "reg44-action",
        "reg45-evidence",
    ]:
        assert workflow in workflow_defs


def test_sprint_h_child_journey_workflows_are_available_in_browser():
    workflow_defs = (ROOT / "frontend-next/lib/child-journey/workflows.ts").read_text()
    recording_route = (ROOT / "frontend-next/app/api/recording/route.ts").read_text()
    recording_form = (ROOT / "frontend-next/components/child-journey/recording-form.tsx").read_text()

    for workflow in [
        "child-profile",
        "child-voice",
        "wellbeing-check",
        "relationship-record",
        "education-update",
        "medication-record",
        "physical-intervention",
        "risk-assessment",
        "support-plan",
        "shift-handover",
    ]:
        assert workflow in workflow_defs
        assert workflow in recording_route

    assert "Save draft" in recording_form
    assert "Submit for review" in recording_form
    assert "Lifecycle and links" in recording_form
    assert "What changed for the child" in recording_form
    assert "audit trail" in workflow_defs


def test_sprint_i_journey_has_safe_empty_states_and_child_centred_sections():
    journey_page = (ROOT / "frontend-next/app/young-people/[id]/journey/page.tsx").read_text()

    for section in [
        "About Me",
        "Child Voice",
        "Daily note",
        "Chronology",
        "Wellbeing check",
        "Education",
        "Health",
        "Medication",
        "Family Time",
        "Keywork",
        "Incident",
        "Missing episode",
        "Plans & Risk",
        "Documents",
        "Actions",
        "ORB child insight",
    ]:
        assert section in journey_page

    assert "Live evidence is not yet available for this area" in journey_page
    assert "What changed for the child?" in journey_page
    assert "What helped them feel safe?" in journey_page


def test_sprint_i_schema_audit_names_real_workflow_tables():
    schema_audit = (ROOT / "backend/os_schema_audit_router.py").read_text()
    router_loader = (ROOT / "core/router_loader.py").read_text()

    for table in [
        "young_people",
        "daily_notes",
        "incidents",
        "safeguarding_records",
        "missing_episodes",
        "keywork_sessions",
        "health_records",
        "medication_records",
        "education_records",
        "family_contact_records",
        "risk_assessments",
        "support_plans",
        "documents",
        "child_documents",
        "chronology_events",
        "os_chronology_events",
        "evidence_links",
        "os_evidence_links",
        "actions",
        "tasks",
        "staff",
        "workforce_staff",
        "reg44_actions",
        "reg45_reviews",
        "audit_events",
    ]:
        assert table in schema_audit

    for sprint_j_domain in [
        "staff_workforce",
        "chronology",
        "evidence_links",
        "governance_reg44_reg45",
        "orb_memory_context",
        "safe_fallback",
        "duplicate_table_groups",
    ]:
        assert sprint_j_domain in schema_audit

    assert "backend.os_schema_audit_router" in router_loader


def test_sprint_h_final_navigation_is_the_primary_operational_navigation():
    navigation = (ROOT / "frontend-next/lib/navigation/operational-navigation.ts").read_text()
    primary_navigation = navigation.split("export const operationalUtilities", 1)[0]

    for label in ["Care Hub", "Young People", "Daily Care", "Chronology", "Documents", "Workforce", "Governance", "Reports", "ORB", "Admin"]:
        assert f"label: '{label}'" in primary_navigation

    for removed_primary_label in ["Plans", "Wellbeing", "Incidents", "Education", "Health", "Calendar", "Tasks", "Notifications", "Inspection"]:
        assert f"label: '{removed_primary_label}'" not in primary_navigation


def test_document_template_browser_can_open_required_templates():
    templates = (ROOT / "frontend-next/lib/document-system/templates.ts").read_text()
    grid = (ROOT / "frontend-next/components/document-editor/template-grid.tsx").read_text()

    for template_id in ["daily_note", "safeguarding_concern", "missing_from_care_episode", "key_work_session", "reg_44_evidence_note"]:
        assert template_id in templates
    assert "Search templates" in grid
    assert "href={template.href}" in grid
