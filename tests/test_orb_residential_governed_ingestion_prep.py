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


def test_only_phase_2a_guide_full_text_ingestion_occurred_without_runtime_fetching():
    service = orb_residential_governed_ingestion_prep_service
    assert service.full_text_ingestion_performed() is True
    assert service.full_text_ingested_source_ids() == {
        "dfe_childrens_homes_regulations_guide"
    }
    assert service.guide_chunk_count() == 371
    assert service.scraping_or_downloading_performed() is False

    service_source = (
        REPO_ROOT / "services" / "orb_residential_governed_ingestion_prep_service.py"
    ).read_text(encoding="utf-8")
    forbidden_runtime_dependencies = (
        "import requests",
        "from requests",
        "import httpx",
        "from httpx",
        "import urllib.request",
        "from urllib.request",
        "import BeautifulSoup",
        "from bs4",
        "import orb_document_ingestion",
        "from services.orb_document_ingestion",
        "import orb_rag_retrieval",
        "from services.orb_rag_retrieval",
        "from fastapi import FastAPI",
        "from fastapi import APIRouter",
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


def test_internal_knowledge_brain_architecture_exists():
    flow = orb_residential_governed_ingestion_prep_service.internal_knowledge_brain_architecture()
    steps = [item["step"] for item in flow]
    assert steps == [
        "classify_intent_and_workflow",
        "use_deterministic_internal_knowledge",
        "select_smallest_relevant_source_bundle",
        "decide_whether_llm_is_needed",
        "choose_model_tier",
        "apply_prompt_budget",
        "apply_citation_and_uncertainty_rules",
        "use_cached_templates_and_skeletons",
        "escalate_to_human_judgement",
    ]
    for item in flow:
        assert item["purpose"]


def test_deterministic_internal_answer_layer_supports_no_llm_decisions():
    service = orb_residential_governed_ingestion_prep_service
    decisions = service.no_llm_decisions_supported()
    assert {
        "identify_workflow",
        "identify_relevant_source_tier",
        "identify_regulations_quality_standards_sccif",
        "identify_local_policy_requirement",
        "identify_professional_judgement_boundary",
        "identify_escalation_prompts",
        "identify_manager_oversight_prompts",
        "identify_child_voice_prompts",
        "identify_safer_recording_checks",
        "identify_citation_eligibility",
        "identify_unsafe_direct_answer",
        "return_structured_policy_bundle",
    } <= decisions


def test_llm_decision_layer_defines_when_to_call_and_not_call_llm():
    policy = orb_residential_governed_ingestion_prep_service.llm_decision_layer()
    assert "drafting" in policy["use_llm_for"]
    assert "summarising" in policy["use_llm_for"]
    assert "complex_reasoning" in policy["use_llm_for"]
    assert "which_workflow_is_this" in policy["do_not_use_llm_for"]
    assert "does_this_require_local_policy" in policy["do_not_use_llm_for"]
    assert "is_this_an_ofsted_grade_prediction_request" in policy["do_not_use_llm_for"]
    assert "deterministic policy first" in policy["default_rule"].lower()


def test_model_tier_policy_defines_required_tiers_and_boundaries():
    tiers = orb_residential_governed_ingestion_prep_service.model_tier_policy()
    assert set(tiers) == {
        "deterministic_only",
        "small_model_write",
        "standard_model_reasoning",
        "high_model_safeguarding_review",
        "human_escalation_only",
    }
    for tier in tiers.values():
        assert tier["when_to_use"]
        assert tier["maximum_source_bundle_size"]
        assert tier["maximum_prompt_context"]
        assert tier["allowed_source_bundle"]
        assert tier["citation_expectation"]
        assert isinstance(tier["human_review_required"], bool)
        assert tier["examples"]
    assert tiers["deterministic_only"]["maximum_source_bundle_size"]["exact_chunks"] == 0
    assert tiers["human_escalation_only"]["human_review_required"] is True
    assert tiers["high_model_safeguarding_review"]["human_review_required"] is True
    assert "No LLM prompt" in tiers["deterministic_only"]["maximum_prompt_context"]


def test_prompt_budget_policy_and_source_bundle_caps_prevent_giant_prompts():
    service = orb_residential_governed_ingestion_prep_service
    policy = service.prompt_budget_policy()
    assert policy["never_send_all_catalogue_sources_to_llm"] is True
    assert service.can_send_full_catalogue_to_llm() is False
    assert policy["maximum_workflow_bundles"] == 1
    assert policy["maximum_source_ids"] == 5
    assert policy["maximum_exact_chunks"] == 3
    assert policy["maximum_reflective_practice_sources"] == 2
    assert policy["maximum_local_policy_warning_blocks"] == 1
    assert any("selected workflow bundle" in rule for rule in policy["rules"])
    assert any("deterministic answer skeletons" in rule for rule in policy["rules"])


def test_cache_template_strategy_exists_for_reusable_internal_assets():
    strategy = orb_residential_governed_ingestion_prep_service.cache_template_strategy()
    assert "polish or personalise" in strategy["principle"]
    for asset in (
        "workflow_templates",
        "safer_recording_checklists",
        "escalation_wording",
        "local_policy_caveats",
        "child_voice_prompt_sets",
        "manager_oversight_prompt_sets",
        "citation_disclaimer_blocks",
        "uncertainty_wording",
    ):
        assert asset in strategy["cached_assets"]
    for skeleton in (
        "regulation_40_consideration_skeleton",
        "reg_44_preparation_skeleton",
        "reg_45_preparation_skeleton",
        "incident_reflection_skeleton",
        "missing_from_care_reflection_skeleton",
        "daily_record_skeleton",
        "allegation_recording_skeleton",
        "medication_record_skeleton",
    ):
        assert skeleton in strategy["answer_skeletons"]


def test_source_bundle_policy_defines_structure_and_never_whole_catalogue():
    service = orb_residential_governed_ingestion_prep_service
    policy = service.source_bundle_policy()
    assert policy["never_send_whole_catalogue"] is True
    assert policy["limits"]["workflow_bundles"] == 1
    assert policy["limits"]["source_ids"] == 5
    for field in (
        "workflow_domain",
        "selected_source_ids",
        "source_authority_labels",
        "relevant_regulation_numbers",
        "relevant_quality_standards",
        "relevant_sccif_areas",
        "local_policy_dependency",
        "escalation_prompts",
        "manager_oversight_prompts",
        "child_voice_prompts",
        "citation_eligibility",
        "uncertainty_behaviour",
        "not_to_be_used_for_boundaries",
    ):
        assert field in policy["contains"]

    bundle = service.source_bundle_for_workflow("incident_recording")
    assert bundle["workflow_domain"] == "incident_recording"
    assert len(bundle["selected_source_ids"]) <= policy["limits"]["source_ids"]
    assert bundle["source_authority_labels"]
    assert bundle["relevant_quality_standards"]
    assert bundle["escalation_prompts"]
    assert bundle["not_to_be_used_for_boundaries"]


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
        "related_regulations",
        "related_workflow_domains",
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


def test_phase_2a_guide_retrieval_remains_capped_and_not_live_wired():
    service = orb_residential_governed_ingestion_prep_service
    bundle = service.guide_source_bundle(workflow_domain="reg_45_preparation", limit=50)
    assert bundle["source_id"] == "dfe_childrens_homes_regulations_guide"
    assert bundle["source_integrity"] == "full_document"
    assert 0 < bundle["exact_chunk_count"] <= 3
    assert bundle["never_send_full_guide_to_llm"] is True

    summary = service.governance_summary()
    assert summary["full_text_ingested_source_ids"] == [
        "dfe_childrens_homes_regulations_guide"
    ]
    assert summary["guide_chunk_count"] == 371
    assert summary["runtime_behaviour_changed"] is False
