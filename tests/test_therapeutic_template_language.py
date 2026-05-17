from __future__ import annotations

import json

from services.document_template_service import document_template_service


BANNED_LANGUAGE = {
    "bad behaviour",
    "non-compliant",
    "attention seeking",
    "refused",
    "kicked off",
    "manipulative",
}


def test_templates_avoid_punitive_language():
    catalogue = json.dumps([template.model_dump(mode="json") for template in document_template_service.list_templates()]).lower()

    assert not any(term in catalogue for term in BANNED_LANGUAGE)


def test_child_templates_include_therapeutic_and_child_voice_guidance():
    child_templates = document_template_service.list_templates(scope="child")

    assert child_templates
    assert all(template.child_voice_prompts for template in child_templates)
    assert all(any("behaviour as communication" in guidance for guidance in template.therapeutic_guidance) for template in child_templates)
    assert all("child" in " ".join(template.child_voice_prompts).lower() for template in child_templates)


def test_safety_templates_include_restorative_or_repair_language():
    safety_ids = ["incident_report", "behaviour_support_reflection", "physical_intervention_restraint_review", "sanction_consequence_review"]

    for template_id in safety_ids:
        text = json.dumps(document_template_service.get_template(template_id).model_dump(mode="json")).lower()
        assert "repair" in text or "restorative" in text
