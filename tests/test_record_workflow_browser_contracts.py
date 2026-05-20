from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_browser_recording_contracts_route_core_workflows_to_live_api_paths():
    recording_route = (ROOT / "frontend-next/app/api/recording/route.ts").read_text()

    assert "POST /young-people/{id}/daily-notes" not in recording_route
    assert "daily-notes" in recording_route
    assert "incidents" in recording_route
    assert "health-records" in recording_route
    assert "keywork" in recording_route
    assert "family/records" in recording_route
    assert "missing_from_placement" in recording_route
    assert "safeguarding_concern" in recording_route


def test_browser_workflow_definitions_include_demo_core_records():
    workflow_defs = (ROOT / "frontend-next/lib/child-journey/workflows.ts").read_text()

    for workflow in ["daily-note", "incident", "safeguarding", "missing", "health", "keywork", "family-contact", "documents"]:
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
        "medication-record",
        "physical-intervention",
        "shift-handover",
    ]:
        assert workflow in workflow_defs
        assert workflow in recording_route

    assert "Save draft" in recording_form
    assert "Submit for review" in recording_form
    assert "Lifecycle and links" in recording_form


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
