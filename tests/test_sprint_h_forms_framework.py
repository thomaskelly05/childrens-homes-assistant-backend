from __future__ import annotations

from services.indicare_forms_framework_service import IndiCareFormsFrameworkService


def test_sprint_h_forms_framework_covers_care_journey_forms_with_lifecycle_metadata():
    framework = IndiCareFormsFrameworkService().framework()
    forms = {form["key"]: form for form in framework["forms"]}

    required = {
        "daily_home_view",
        "shift_handover",
        "child_profile_about_me",
        "child_voice_form",
        "wellbeing_check",
        "relationship_record",
        "daily_life_diary",
        "incident_record",
        "missing_episode",
        "medication_record",
        "physical_intervention_record",
        "child_document_form",
        "template_generator",
        "staff_supervision",
        "training_matrix",
        "practice_observation",
        "reg44_workflow",
        "reg45_workflow",
    }

    assert required <= set(forms)

    for form in forms.values():
        assert form["lifecycle"]["states"]
        assert {"date_time", "created_by", "last_updated_by", "status", "manager_review_state", "audit_trail", "actions_follow_ups"} <= set(form["metadata"]["required_metadata"])
        assert form["metadata"]["links"]["sccif_regulation_tags"] is True
