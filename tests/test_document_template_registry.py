from __future__ import annotations

from services.document_template_service import document_template_service


REQUIRED_TEMPLATE_IDS = {
    "daily_note",
    "incident_report",
    "safeguarding_concern",
    "missing_from_care_episode",
    "return_home_interview",
    "key_work_session",
    "behaviour_support_reflection",
    "physical_intervention_restraint_review",
    "sanction_consequence_review",
    "bullying_concern",
    "child_voice_record",
    "family_contact_record",
    "professional_contact_record",
    "health_appointment_record",
    "medication_concern_health_follow_up",
    "education_update",
    "care_plan_review",
    "risk_assessment_review",
    "placement_plan_update",
    "individual_behaviour_support_plan",
    "missing_risk_assessment",
    "internet_social_media_safety_plan",
    "reg_44_evidence_note",
    "reg_45_review_evidence_note",
    "annex_a_evidence_summary",
    "manager_oversight_note",
    "staff_supervision_record",
    "staff_reflective_practice_note",
    "safer_recruitment_checklist",
    "training_competency_review",
}


def test_registry_contains_required_residential_templates():
    templates = document_template_service.list_templates()
    template_ids = {template.template_id for template in templates}

    assert REQUIRED_TEMPLATE_IDS <= template_ids
    assert len(template_ids) == len(templates)
    assert document_template_service.get_template("daily_note").title == "Daily Note"
    assert document_template_service.get_template("reg_44_evidence_note").scope.value == "home"


def test_templates_have_distinct_structures_and_workflow_contracts():
    templates = [document_template_service.get_template(template_id) for template_id in REQUIRED_TEMPLATE_IDS]
    section_signatures = {tuple(section.section_id for section in template.required_sections) for template in templates}

    assert len(section_signatures) == len(templates)
    assert all(len(template.required_sections) >= 4 for template in templates)
    assert all(template.workflow["create_document"] and template.workflow["save_draft"] and template.workflow["reopen_draft"] for template in templates)
    assert all(template.workflow["link_evidence"] and template.workflow["link_chronology"] for template in templates)


def test_registry_search_finds_templates_by_title_category_and_mapping():
    assert [template.template_id for template in document_template_service.search_templates("Reg 44")] == ["reg_44_evidence_note"]
    assert {template.template_id for template in document_template_service.search_templates("missing")} >= {"missing_from_care_episode", "missing_risk_assessment"}
    assert {template.template_id for template in document_template_service.search_templates("Leadership")} >= {"manager_oversight_note", "staff_supervision_record"}
