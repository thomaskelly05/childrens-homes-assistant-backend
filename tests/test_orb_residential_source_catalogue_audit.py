"""ORB Residential Source Catalogue Audit — non-invasive guard tests.

Standalone ORB only. Does not ingest, scrape, or change runtime behaviour.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from services.orb_residential_knowledge_spine_audit_service import NINE_QUALITY_STANDARDS
from services.orb_residential_source_catalogue_audit_service import (
    EXPANSION_WORKFLOW_DOMAINS_REQUIRED,
    FORBIDDEN_COMPLIANCE_PHRASES,
    OPERATIONAL_REGULATIONS_REQUIRED,
    REG_NOTIFICATION_SOURCE_IDS,
    REQUIRED_SOURCE_FIELDS,
    STATUTORY_STATUSES,
    THIRD_SECTOR_STATUSES,
    TIER_1_REQUIRED_SOURCE_IDS,
    orb_residential_source_catalogue_audit_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_audit_doc_exists():
    path = REPO_ROOT / "docs" / "audits" / "orb-residential-source-catalogue-audit.md"
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "Source Catalogue" in content
    assert "NR-1" in content
    assert "tier" in content.lower()


def test_catalogue_json_exists():
    path = REPO_ROOT / "data" / "orb_source_catalogue" / "catalogue.json"
    assert path.is_file()


def test_all_tier_1_sources_represented():
    service = orb_residential_source_catalogue_audit_service
    ids = {s["source_id"] for s in service.sources()}
    assert TIER_1_REQUIRED_SOURCE_IDS <= ids
    assert service.has_tier_1_coverage() is True


def test_all_five_source_tiers_exist():
    service = orb_residential_source_catalogue_audit_service
    assert service.tiers() == [1, 2, 3, 4, 5]
    for tier in range(1, 6):
        assert len(service.sources_for_tier(tier)) >= 1


def test_each_source_has_core_metadata_and_citation_authority():
    service = orb_residential_source_catalogue_audit_service
    for source in service.sources():
        for field in (
            "source_type",
            "tier",
            "jurisdiction",
            "publisher",
            "citation_authority",
        ):
            assert source.get(field), f"{source['source_id']} missing {field}"
        assert source["tier"] in range(1, 6)


def test_all_sources_have_required_catalogue_fields():
    service = orb_residential_source_catalogue_audit_service
    assert service.all_sources_have_required_fields() is True
    for source in service.sources():
        for field in REQUIRED_SOURCE_FIELDS:
            assert field in source, f"{source['source_id']} missing {field}"


def test_statutory_sources_marked_separately_from_practice_and_third_sector():
    service = orb_residential_source_catalogue_audit_service
    statutory = service.statutory_sources()
    non_statutory = service.non_statutory_sources()
    assert len(statutory) >= 20
    assert len(non_statutory) >= 10
    for s in statutory:
        assert s["statutory_status"] in STATUTORY_STATUSES
    for s in non_statutory:
        assert s["statutory_status"] not in STATUTORY_STATUSES


def test_third_sector_not_treated_as_statutory_authority():
    service = orb_residential_source_catalogue_audit_service
    assert service.third_sector_not_authoritative() is True
    for s in service.third_sector_sources():
        assert s["statutory_status"] in THIRD_SECTOR_STATUSES
        assert s["citation_authority"] in (
            "reflective_only",
            "informative_practice",
            "clinical_guidance",
        )
        ntb = " ".join(s.get("not_to_be_used_for", [])).lower()
        assert "statutory" in ntb or "authority" in ntb or "compliance" in ntb


def test_every_workflow_domain_maps_to_at_least_one_source():
    service = orb_residential_source_catalogue_audit_service
    assert service.every_workflow_domain_has_sources() is True
    assert service.workflow_domain_count() == 52
    for behaviour in service.workflow_domain_behaviours():
        assert behaviour["relevant_sources"], behaviour["domain"]


def test_reg_40_44_45_represented():
    service = orb_residential_source_catalogue_audit_service
    ids = {s["source_id"] for s in service.sources()}
    assert REG_NOTIFICATION_SOURCE_IDS <= ids
    assert service.has_reg_notification_sources() is True


def test_quality_standards_mapped():
    service = orb_residential_source_catalogue_audit_service
    mapped = service.all_quality_standards_mapped()
    audit_ids = {s["id"] for s in NINE_QUALITY_STANDARDS}
    assert audit_ids <= mapped


def test_sccif_judgement_areas_mapped():
    service = orb_residential_source_catalogue_audit_service
    mapped = service.all_sccif_areas_mapped()
    assert "overall_experiences_progress" in mapped
    assert "helped_and_protected" in mapped
    assert "leadership_management" in mapped


def test_sources_include_professional_judgement_boundaries():
    service = orb_residential_source_catalogue_audit_service
    for source in service.sources():
        assert source["professional_judgement_boundary"]
        assert len(source["professional_judgement_boundary"]) >= 20


def test_sources_include_not_to_be_used_for():
    service = orb_residential_source_catalogue_audit_service
    for source in service.sources():
        assert source["not_to_be_used_for"]
        assert len(source["not_to_be_used_for"]) >= 1


def test_no_source_claims_guaranteed_compliance_or_safeguarding_decisions():
    service = orb_residential_source_catalogue_audit_service
    for source in service.sources():
        ntb = " ".join(source.get("not_to_be_used_for", [])).lower()
        boundary = source.get("professional_judgement_boundary", "").lower()
        # Positive claims must not appear outside negation lists
        for phrase in FORBIDDEN_COMPLIANCE_PHRASES:
            if phrase in boundary:
                assert False, f"{source['source_id']} boundary contains {phrase}"
        # Each source should explicitly forbid compliance guarantees or similar
        assert (
            "compliance" in ntb
            or "safeguarding" in ntb
            or "threshold" in ntb
            or "statutory" in ntb
            or "authority" in ntb
            or "diagnos" in ntb
            or "predict" in ntb
            or "legal advice" in ntb
        ), source["source_id"]


def test_workflow_behaviours_include_orb_prompt_types():
    service = orb_residential_source_catalogue_audit_service
    for w in service.workflow_domain_behaviours():
        assert w["evidence_prompts"]
        assert w["safer_recording_prompts"]
        assert w["child_voice_prompts"]
        assert w["escalation_prompts"]
        assert w["manager_oversight_prompts"]
        assert w["citation_expectations"]
        assert w["uncertainty_behaviour"]
        assert w["answer_style"]
        assert w["not_to_be_used_for"]


def test_update_report_documents_non_duplicate_expansion():
    report = orb_residential_source_catalogue_audit_service.update_report()
    assert report["baseline_source_count"] == 75
    assert len(report["sources_updated"]) == 17
    assert len(report["new_sources_added"]) == 38
    assert len(report["duplicates_avoided"]) == 17
    assert report["uncertain_near_duplicates_requiring_human_review"]


def test_duplicate_source_ids_are_not_created():
    sources = orb_residential_source_catalogue_audit_service.sources()
    source_ids = [s["source_id"] for s in sources]
    assert len(source_ids) == len(set(source_ids))


def test_duplicate_official_urls_are_explicitly_justified():
    service = orb_residential_source_catalogue_audit_service
    duplicates = service.duplicate_official_urls()
    assert set(duplicates) == {
        "https://www.gov.uk/government/publications/keeping-children-safe-in-education--2"
    }
    by_id = service.source_by_id()
    for duplicate_ids in duplicates.values():
        assert any(by_id[source_id].get("duplicate_url_justification") for source_id in duplicate_ids)


def test_every_source_has_actual_url_or_local_policy_marker():
    service = orb_residential_source_catalogue_audit_service
    assert service.sources_missing_url_without_local_policy_flag() == []
    for source in service.sources():
        if source["requires_local_policy"]:
            assert source["official_url"] == ""
            assert source["citation_authority"] == "local_policy_required"
            assert source["should_cite"] is False
            assert "provider policy" in " ".join(source["not_to_be_used_for"]).lower()
        else:
            assert source["official_url"].startswith("https://")


def test_regulated_home_operational_governance_sources_represented():
    by_id = orb_residential_source_catalogue_audit_service.source_by_id()
    for source_id in (
        "care_standards_act_2000",
        "ofsted_register_childrens_home",
        "ofsted_social_care_compliance_handbook",
    ):
        assert source_id in by_id
        assert "regulated_home_governance" in by_id[source_id]["related_workflow_domains"]


def test_statement_of_purpose_childrens_guide_location_assessment_represented():
    by_id = orb_residential_source_catalogue_audit_service.source_by_id()
    assert "statement_of_purpose_provider_document" in by_id
    assert "childrens_guide_provider_document" in by_id
    for source_id in (
        "childrens_homes_regulations_2015",
        "dfe_childrens_homes_regulations_guide",
        "statement_of_purpose_provider_document",
    ):
        assert "statement_of_purpose_admissions" in by_id[source_id]["related_workflow_domains"]


def test_operational_childrens_homes_regulations_are_mapped():
    mapped = orb_residential_source_catalogue_audit_service.operational_regulations_mapped()
    assert OPERATIONAL_REGULATIONS_REQUIRED <= mapped


@pytest.mark.parametrize(
    ("domain", "required_sources"),
    [
        ("allegations_lado_adult_conduct", {"working_together_safeguarding", "keeping_children_safe_in_education"}),
        ("prevent_radicalisation", {"prevent_duty_guidance", "channel_duty_guidance"}),
        ("harmful_sexual_behaviour_child_on_child", {"nspcc_harmful_sexual_behaviour", "keeping_children_safe_in_education"}),
        ("fgm_forced_marriage_honour_based_abuse", {"fgm_statutory_guidance", "forced_marriage_guidance"}),
        ("bullying_group_living_dynamics", {"dfe_childrens_homes_regulations_guide", "nspcc_learning"}),
        ("search_confiscation_privacy_surveillance", {"childrens_homes_regulations_2015", "ico_children_uk_gdpr"}),
        ("fire_premises_food_health_safety", {"regulatory_reform_fire_safety_order_2005", "food_standards_agency_food_hygiene"}),
        ("transport_community_activities", {"hse_driving_at_work", "child_car_seats_rules"}),
        ("money_possessions_financial_dignity", {"junior_isa_looked_after_children", "become_charity"}),
        ("corporate_parenting_sufficiency_matching", {"corporate_parenting_principles", "sufficiency_duty_guidance"}),
        ("critical_incidents_death_bereavement", {"serious_child_safeguarding_incident_report_guidance", "ofsted_serious_incident_children_home_guidance"}),
        ("staff_wellbeing_secondary_trauma", {"hse_stress_at_work", "whistleblowing_guidance"}),
        ("staff_training_qualifications_induction", {"dfe_childrens_homes_regulations_guide", "safer_recruitment_education"}),
        ("sexual_health_pregnancy_relationships", {"nhs_sexual_health_services", "nice_ng205_looked_after_children"}),
        ("language_interpreters_communication_access", {"send_code_of_practice", "coram_voice"}),
        ("children_with_parents_in_prison", {"nicco_children_of_offenders"}),
        ("parental_substance_misuse_family_trauma", {"working_together_safeguarding", "domestic_abuse_guidance"}),
        ("emergency_planning_business_continuity", {"cabinet_office_emergency_response_recovery", "childrens_homes_regulations_2015"}),
        ("visitors_contractors_professionals", {"dbs_guidance", "ico_children_uk_gdpr"}),
        ("pets_animals_therapy_animals", {"rspca_pets_advice", "childrens_homes_regulations_2015"}),
        ("ordinary_childhood_belonging_memories", {"coram_voice", "become_charity"}),
        ("record_access_care_files_future_reading", {"ico_subject_access_requests", "the_care_files"}),
    ],
)
def test_required_expansion_workflow_domains_exist_with_sources(domain, required_sources):
    behaviours = {
        b["domain"]: b for b in orb_residential_source_catalogue_audit_service.workflow_domain_behaviours()
    }
    assert EXPANSION_WORKFLOW_DOMAINS_REQUIRED <= set(behaviours)
    assert domain in behaviours
    assert required_sources <= set(behaviours[domain]["relevant_sources"])


def test_every_expansion_workflow_has_required_behaviour_boundaries():
    behaviours = {
        b["domain"]: b for b in orb_residential_source_catalogue_audit_service.workflow_domain_behaviours()
    }
    for domain in EXPANSION_WORKFLOW_DOMAINS_REQUIRED:
        behaviour = behaviours[domain]
        assert behaviour["escalation_prompts"]
        assert behaviour["child_voice_prompts"]
        assert behaviour["safer_recording_prompts"]
        assert behaviour["not_to_be_used_for"]


def test_catalogue_does_not_change_trusted_registry_at_runtime():
    """Mapping-only: catalogue is separate from assistant/knowledge/trusted_sources_registry.json."""
    catalogue_path = REPO_ROOT / "data" / "orb_source_catalogue" / "catalogue.json"
    registry_path = REPO_ROOT / "assistant" / "knowledge" / "trusted_sources_registry.json"
    assert catalogue_path.is_file()
    assert registry_path.is_file()
    # Service module must not import route handlers or ingestion
    service_source = (
        REPO_ROOT / "services" / "orb_residential_source_catalogue_audit_service.py"
    ).read_text(encoding="utf-8")
    assert "orb_document_ingestion" not in service_source
    assert "FastAPI" not in service_source


def test_builder_script_exists_for_catalogue_regeneration():
    path = REPO_ROOT / "scripts" / "build_orb_source_catalogue.py"
    assert path.is_file()
