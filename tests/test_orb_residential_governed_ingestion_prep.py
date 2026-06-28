"""ORB Residential governed ingestion prep tests.

Non-invasive guards only. These tests do not ingest, scrape, download, or wire
runtime retrieval.
"""

from __future__ import annotations

from pathlib import Path

from services.orb_residential_governed_ingestion_prep_service import (
    FIRST_INGESTION_SOURCE_IDS,
    KEY_WORKFLOW_DOMAINS,
    REQUIRED_CHUNK_METADATA_FIELDS,
    SOURCE_TYPE_RULES,
    orb_residential_governed_ingestion_prep_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_governed_ingestion_prep_doc_exists_and_blocks_runtime_claims():
    path = REPO_ROOT / "docs" / "audits" / "orb-residential-governed-source-ingestion-prep.md"
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "Governed Source Ingestion Preparation" in content
    assert "Full-text ingestion performed? | **No**" in content
    assert "Documents scraped or downloaded? | **No**" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_tier_1_sources_are_identified_for_first_ingestion_in_order():
    service = orb_residential_governed_ingestion_prep_service
    sequence = service.tier_1_first_ingestion_sequence()
    assert [item["source_id"] for item in sequence] == list(FIRST_INGESTION_SOURCE_IDS)
    assert [item["priority"] for item in sequence] == [1, 2, 3]
    for item in sequence:
        assert item["official_url"].startswith("https://")
        assert item["expected_chunking_strategy"]
        assert item["expected_citation_strategy"]
        assert item["quote_allowed_rules"]
        assert item["freshness_update_handling"]


def test_no_full_text_ingestion_scraping_or_downloading_occurred():
    service = orb_residential_governed_ingestion_prep_service
    assert service.full_text_ingestion_performed() is False
    assert service.scraping_or_downloading_performed() is False

    service_source = (
        REPO_ROOT / "services" / "orb_residential_governed_ingestion_prep_service.py"
    ).read_text(encoding="utf-8")
    forbidden_runtime_dependencies = (
        "requests",
        "httpx",
        "urllib.request",
        "BeautifulSoup",
        "orb_document_ingestion",
        "orb_rag_retrieval",
        "FastAPI",
        "APIRouter",
    )
    for forbidden in forbidden_runtime_dependencies:
        assert forbidden not in service_source


def test_ingestion_eligibility_exists_for_every_source_and_source_category():
    service = orb_residential_governed_ingestion_prep_service
    eligibility = service.ingestion_eligibility_by_source()
    source_ids = {source["source_id"] for source in service.sources()}
    source_types = {source["source_type"] for source in service.sources()}

    assert len(source_ids) == 113
    assert set(eligibility) == source_ids
    assert source_types <= set(SOURCE_TYPE_RULES)
    for source_id, plan in eligibility.items():
        assert plan["source_id"] == source_id
        assert plan["current_content_state"] == "metadata_only"
        assert plan["ingestion_eligibility"] in {
            "eligible_for_full_text_ingestion",
            "metadata_only",
            "local_policy_upload_required",
            "reflective_practice_only",
            "not_suitable_for_ingestion",
        }
        assert plan["professional_judgement_boundary"]
        assert plan["not_to_be_used_for"]


def test_local_policy_required_sources_remain_non_citable_by_default():
    service = orb_residential_governed_ingestion_prep_service
    eligibility = service.ingestion_eligibility_by_source()
    local_policy_sources = [
        source
        for source in service.sources()
        if source["requires_local_policy"] is True
    ]
    assert local_policy_sources
    for source in local_policy_sources:
        plan = eligibility[source["source_id"]]
        assert plan["local_policy_upload_required"] is True
        assert plan["non_citable_unless_uploaded_locally"] is True
        assert plan["citation_eligible_after_ingestion"] is False
        assert source["should_cite"] is False
        assert source["quote_allowed_default"] is False


def test_exact_citations_require_exact_ingested_chunks():
    service = orb_residential_governed_ingestion_prep_service
    exact_chunk = {
        "source_id": "childrens_homes_regulations_2015",
        "basis_type": "exact",
        "exact_text": "The registered person must...",
        "citation_label": "Reg 12",
        "source_integrity": "full_document",
    }
    summary_chunk = {
        "source_id": "dfe_childrens_homes_regulations_guide",
        "basis_type": "summary",
        "text": "Summary of the Quality Standards.",
        "citation_label": "Guide summary",
        "source_integrity": "summary_only",
    }
    missing_exact_text = {
        "source_id": "ofsted_sccif_childrens_homes",
        "basis_type": "exact",
        "citation_label": "SCCIF",
        "source_integrity": "full_document",
    }

    assert service.exact_citation_allowed(exact_chunk) is True
    assert service.exact_citation_allowed(summary_chunk) is False
    assert service.exact_citation_allowed(missing_exact_text) is False
    assert service.summary_metadata_can_be_exact_citation() is False


def test_citation_policy_preserves_honesty_boundaries():
    policy = orb_residential_governed_ingestion_prep_service.citation_policy()
    assert policy["exact_citation_requires_exact_ingested_chunk"] is True
    assert policy["summary_metadata_is_not_exact_citation"] is True
    assert policy["local_policy_sources_non_citable_unless_uploaded"] is True
    assert policy["third_sector_lived_experience_not_statutory_authority"] is True
    assert policy["sccif_must_not_predict_grades"] is True
    assert policy["regulations_and_guide_do_not_guarantee_compliance"] is True
    assert "law" in policy["distinguish_source_types"]
    assert "local_policy" in policy["distinguish_source_types"]


def test_third_sector_and_lived_experience_cannot_be_statutory_authority():
    service = orb_residential_governed_ingestion_prep_service
    for source in service.sources():
        if source["source_type"] in {"third_sector", "lived_experience"}:
            assert service.can_be_statutory_authority(source) is False
            plan = service.eligibility_for_source(source)
            assert plan["reflective_practice_only"] is True
            assert plan["citation_eligible_after_ingestion"] is False


def test_sccif_cannot_be_used_for_grade_prediction():
    service = orb_residential_governed_ingestion_prep_service
    sccif = service.source_by_id()["ofsted_sccif_childrens_homes"]
    blocked_uses = " ".join(sccif["not_to_be_used_for"]).lower()
    assert "predict" in blocked_uses
    assert "grade" in blocked_uses or "outcome" in blocked_uses
    assert service.citation_policy()["sccif_must_not_predict_grades"] is True


def test_guide_and_regulations_cannot_be_used_to_guarantee_compliance():
    service = orb_residential_governed_ingestion_prep_service
    for source_id in (
        "dfe_childrens_homes_regulations_guide",
        "childrens_homes_regulations_2015",
    ):
        source = service.source_by_id()[source_id]
        blocked_uses = " ".join(source["not_to_be_used_for"]).lower()
        assert "compliance" in blocked_uses
    assert service.citation_policy()["regulations_and_guide_do_not_guarantee_compliance"] is True


def test_retrieval_uncertainty_rules_exist_for_required_scenarios():
    policy = orb_residential_governed_ingestion_prep_service.retrieval_uncertainty_policy()
    assert set(policy) == {
        "no_source_matches",
        "only_metadata_matches",
        "only_reflective_practice_sources_match",
        "local_policy_required_missing",
        "legal_or_compliance_judgement",
        "safeguarding_threshold_decision",
        "ofsted_grade_prediction",
    }
    for rule in policy.values():
        answer = rule["answer"].lower()
        assert "do not" in answer or "refuse" in answer
        assert rule["safe_next_step"]


def test_chunking_policy_requires_governance_metadata():
    fields = orb_residential_governed_ingestion_prep_service.required_chunk_metadata_fields()
    assert fields == REQUIRED_CHUNK_METADATA_FIELDS
    for field in (
        "paragraph_reference",
        "regulation_number",
        "quality_standard",
        "sccif_judgement_area",
        "basis_type",
        "quote_allowed",
        "requires_local_policy",
        "professional_judgement_boundary",
        "not_to_be_used_for",
    ):
        assert field in fields


def test_workflow_answer_policy_exists_for_key_workflows():
    service = orb_residential_governed_ingestion_prep_service
    policy = service.workflow_answer_policy()
    assert set(KEY_WORKFLOW_DOMAINS) <= set(policy)
    for domain in KEY_WORKFLOW_DOMAINS:
        item = policy[domain]
        assert item["required_source_tier"]
        assert item["when_to_cite"]
        assert item["when_not_to_cite"]
        assert item["escalation_prompt"]
        assert item["manager_oversight_prompt"]
        assert isinstance(item["local_policy_dependency"], bool)
        assert item["answer_boundary"]
        assert item["professional_judgement_boundary"]


def test_runtime_wiring_plan_keeps_future_phases_out_of_live_routes():
    phases = orb_residential_governed_ingestion_prep_service.runtime_wiring_phases()
    assert [phase["phase"] for phase in phases] == [
        "Phase 1",
        "Phase 2a",
        "Phase 2b",
        "Phase 2c",
        "Phase 2d",
        "Phase 2e",
        "Phase 2f",
        "Phase 3",
    ]
    assert phases[0]["runtime_change"] == "none"


def test_professional_judgement_boundaries_remain_present():
    service = orb_residential_governed_ingestion_prep_service
    for plan in service.ingestion_eligibility_by_source().values():
        assert plan["professional_judgement_boundary"]
        assert len(plan["professional_judgement_boundary"]) >= 20
        assert plan["not_to_be_used_for"]

    for workflow in service.workflow_answer_policy().values():
        assert "judgement" in workflow["professional_judgement_boundary"].lower()


def test_nr_1_sensitive_routes_frontend_and_os_assistant_are_untouched_by_service():
    service_source = (
        REPO_ROOT / "services" / "orb_residential_governed_ingestion_prep_service.py"
    ).read_text(encoding="utf-8")
    forbidden_imports = (
        "from routers",
        "import routers",
        "assistant_os_knowledge_routes",
        "assistant_routes",
        "from services.ai_governed_egress",
        "from services.ai_gateway",
        "frontend/",
    )
    for forbidden in forbidden_imports:
        assert forbidden not in service_source

    summary = orb_residential_governed_ingestion_prep_service.governance_summary()
    assert summary["runtime_behaviour_changed"] is False
    assert summary["route_frontend_or_os_assistant_files_changed"] is False
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True
