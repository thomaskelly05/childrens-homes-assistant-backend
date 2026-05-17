from __future__ import annotations

from services.document_template_service import document_template_service


QUALITY_AREAS = {
    "Quality and Purpose",
    "Views, Wishes and Feelings",
    "Education",
    "Enjoyment and Achievement",
    "Health and Well-being",
    "Positive Relationships",
    "Protection of Children",
    "Leadership and Management",
    "Care Planning",
}

SCCIF_AREAS = {
    "experiences and progress of children",
    "help and protection",
    "effectiveness of leaders and managers",
    "overall experiences and progress",
}


def test_every_template_has_operational_regulatory_mapping():
    for template in document_template_service.list_templates():
        assert set(template.quality_standard_links) & QUALITY_AREAS
        assert set(template.sccif_links) <= SCCIF_AREAS
        assert template.sccif_links
        assert template.regulatory_links
        assert template.inspection_relevance.endswith("not legal advice.")


def test_key_statutory_templates_have_expected_regulation_links():
    expectations = {
        "safeguarding_concern": "Regulation 40",
        "incident_report": "Regulation 35",
        "missing_from_care_episode": "Regulation 40",
        "reg_44_evidence_note": "Regulation 44",
        "reg_45_review_evidence_note": "Regulation 45",
    }

    for template_id, regulation in expectations.items():
        template = document_template_service.get_template(template_id)
        assert any(regulation in link for link in template.regulatory_links)
