"""ORB Residential Source Catalogue Audit — non-invasive guard tests.

Standalone ORB only. Does not ingest, scrape, or change runtime behaviour.
"""

from __future__ import annotations

from pathlib import Path

from services.orb_residential_knowledge_spine_audit_service import NINE_QUALITY_STANDARDS
from services.orb_residential_source_catalogue_audit_service import (
    FORBIDDEN_COMPLIANCE_PHRASES,
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
    assert service.workflow_domain_count() == 28
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
