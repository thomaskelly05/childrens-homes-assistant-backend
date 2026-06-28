"""ORB Residential source freshness and local-policy gap audit tests.

Metadata-only. Does not ingest, scrape, or change runtime behaviour.
"""

from __future__ import annotations

from pathlib import Path

from services.orb_residential_source_freshness_audit_service import (
    FRESHNESS_CATEGORIES,
    REQUIRED_LOCAL_POLICY_AREAS,
    orb_residential_source_freshness_audit_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_source_freshness_audit_doc_exists():
    path = REPO_ROOT / "docs" / "audits" / "orb-residential-source-freshness-local-policy-audit.md"
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "Source Freshness" in content
    assert "Local Policy Gap Audit" in content
    assert "NR-1 remains open" in content


def test_every_source_has_freshness_metadata():
    service = orb_residential_source_freshness_audit_service
    assert service.source_count() == 113
    assert service.sources_missing_freshness_metadata() == []
    assert service.sources_with_freshness_metadata_count() == service.source_count()


def test_every_source_has_review_category():
    service = orb_residential_source_freshness_audit_service
    assert service.sources_missing_review_category() == []
    for source in service.sources():
        assert source["freshness_status"] in FRESHNESS_CATEGORIES
        assert source["review_frequency"]


def test_every_source_has_source_owner_and_publisher():
    service = orb_residential_source_freshness_audit_service
    assert service.sources_missing_owner_or_publisher() == []
    for source in service.sources():
        assert source["source_owner"]
        assert source["publisher"]


def test_every_source_has_local_policy_flag():
    service = orb_residential_source_freshness_audit_service
    assert service.sources_missing_local_policy_flag() == []


def test_every_local_policy_required_source_has_gap_reason():
    service = orb_residential_source_freshness_audit_service
    assert service.local_policy_required_sources()
    assert service.local_policy_sources_missing_gap_reason() == []
    for source in service.local_policy_required_sources():
        assert source["local_policy_gap_reason"]


def test_sccif_is_live_regular_review_guidance():
    by_id = orb_residential_source_freshness_audit_service.source_by_id()
    sccif = by_id["ofsted_sccif_childrens_homes"]
    assert sccif["freshness_status"] == "inspection_framework_live_guidance"
    assert "Ofsted" in sccif["source_owner"]
    assert "live" in sccif["review_frequency"].lower()


def test_kcsie_and_school_guidance_is_annual_or_live():
    by_id = orb_residential_source_freshness_audit_service.source_by_id()
    for source_id in (
        "keeping_children_safe_in_education",
        "safer_recruitment_education",
        "children_missing_education",
        "school_attendance_guidance",
        "exclusions_suspensions_guidance",
    ):
        source = by_id[source_id]
        assert source["freshness_status"] == "annual_or_live_guidance"
        assert "annual" in source["review_frequency"].lower() or "live" in source["review_frequency"].lower()


def test_legislation_is_stable_but_amendment_aware():
    service = orb_residential_source_freshness_audit_service
    legislation_sources = [source for source in service.sources() if source["source_type"] == "legislation"]
    assert legislation_sources
    for source in legislation_sources:
        assert source["freshness_status"] == "stable_legislation"
        assert "amendment" in source["review_frequency"].lower()
        assert source["update_check_required"] is True


def test_third_sector_and_lived_experience_sources_are_not_statutory():
    service = orb_residential_source_freshness_audit_service
    assert service.third_sector_or_lived_experience_sources()
    assert service.third_sector_or_lived_experience_marked_statutory() == []
    for source in service.third_sector_or_lived_experience_sources():
        assert source["freshness_status"] in {
            "third_sector_periodic_review",
            "lived_experience_context",
        }
        assert source["citation_authority"] in {"reflective_only", "informative_practice"}


def test_no_local_policy_source_is_citable_by_default_without_local_upload():
    service = orb_residential_source_freshness_audit_service
    assert service.local_policy_source_citation_violations() == []
    for source in service.local_policy_required_sources():
        assert source["official_url"] == ""
        assert source["should_cite"] is False
        assert source["quote_allowed_default"] is False
        assert source["citation_authority"] == "local_policy_required"


def test_local_policy_dependent_areas_have_boundaries_and_prompts():
    service = orb_residential_source_freshness_audit_service
    assert service.missing_required_local_policy_areas() == set()
    assert {item["area"] for item in service.local_policy_gap_audit()} >= REQUIRED_LOCAL_POLICY_AREAS
    assert service.local_policy_gap_records_missing_boundaries() == []
    assert service.local_policy_workflows_missing_prompts() == []
    for workflow in service.local_policy_required_workflows():
        assert workflow["local_policy_document_needed"]
        assert workflow["safe_without_local_policy"]
        assert workflow["must_not_decide_without_local_policy"]
        assert workflow["escalation_prompt"]
        assert workflow["manager_oversight_prompt"]
