"""ORB Residential Phase 2e source-grounded answer policy gate tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_JSON_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from services.orb_residential_source_answer_policy import (
    BOUNDARY_STATEMENTS,
    SOURCE_TYPE_TO_ID,
    orb_residential_source_answer_policy_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-source-answer-policy-phase-2e.md"
SERVICE_PATH = REPO_ROOT / "services" / "orb_residential_source_answer_policy.py"


@pytest.fixture
def service():
    return orb_residential_source_answer_policy_service


def test_phase_2e_documentation_exists_and_blocks_live_wiring():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2e" in content
    assert "Live answer wiring enabled?" in content
    assert "**No**" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
    assert "synthetic" in content.lower()
    assert "named human sign-off" in content.lower()


def test_guide_is_offline_verified_but_not_live_wired(service):
    eligibility = service.source_eligibility("guide")
    assert eligibility["offline_verified"] is True
    assert eligibility["eligible_for_policy_design"] is True
    assert eligibility["live_answer_wiring_enabled"] is False
    assert eligibility["citable_in_live_answers"] is False
    assert eligibility["requires_human_signoff_before_live_use"] is True
    assert eligibility["source_id"] == SOURCE_TYPE_TO_ID["guide"]


def test_regulations_are_offline_verified_but_not_live_wired(service):
    eligibility = service.source_eligibility("regulations_2015")
    assert eligibility["offline_verified"] is True
    assert eligibility["eligible_for_policy_design"] is True
    assert eligibility["live_answer_wiring_enabled"] is False
    assert eligibility["citable_in_live_answers"] is False
    assert eligibility["requires_human_signoff_before_live_use"] is True


def test_sccif_is_offline_verified_but_not_live_wired(service):
    eligibility = service.source_eligibility("sccif")
    assert eligibility["offline_verified"] is True
    assert eligibility["eligible_for_policy_design"] is True
    assert eligibility["live_answer_wiring_enabled"] is False
    assert eligibility["citable_in_live_answers"] is False
    assert eligibility["requires_human_signoff_before_live_use"] is True


def test_source_role_distinctions_are_defined(service):
    guide = service.source_role("guide")
    regulations = service.source_role("regulations_2015")
    sccif = service.source_role("sccif")

    assert guide["not_legal_advice"] is True
    assert guide["not_compliance_guarantee"] is True
    assert regulations["does_not_decide_compliance"] is True
    assert regulations["does_not_decide_notification_thresholds"] is True
    assert sccif["does_not_predict_ofsted_judgements"] is True
    assert sccif["does_not_grade_home"] is True
    assert sccif["does_not_decide_inspection_readiness"] is True


def test_daily_record_routes_primarily_to_guide(service):
    policy = service.policy_output("daily_record")
    assert policy["primary_source_types"] == ["guide"]
    assert "regulations_2015" in policy["secondary_source_types"]
    assert "sccif" in policy["secondary_source_types"]


def test_incident_reflection_routes_primarily_to_guide_with_secondary_context(service):
    policy = service.policy_output("incident_reflection")
    routing = service.workflow_routing("incident_reflection")
    assert policy["primary_source_types"] == ["guide"]
    assert set(policy["secondary_source_types"]) == {"regulations_2015", "sccif"}
    assert routing["requires_manager_local_policy_boundary"] is True
    assert policy["escalation_prompts"]


def test_reg_40_question_routes_to_regulations_but_live_wiring_blocked(service):
    policy = service.policy_output("reg_40_notification")
    assert policy["primary_source_types"] == ["regulations_2015"]
    assert "guide" in policy["secondary_source_types"]
    assert service.workflow_routing("reg_40_notification")["must_not_decide_threshold"] is True
    assert policy["live_wiring_allowed"] is False
    assert policy["live_wiring_blocked_reason"]


def test_ofsted_evidence_question_routes_to_sccif_but_live_wiring_blocked(service):
    policy = service.policy_output("ofsted_evidence_preparation")
    assert policy["primary_source_types"] == ["sccif"]
    assert "guide" in policy["secondary_source_types"]
    assert "regulations_2015" in policy["secondary_source_types"]
    assert policy["live_wiring_allowed"] is False


def test_care_planning_risk_routes_primarily_to_guide(service):
    policy = service.policy_output("care_planning_risk_safeguarding")
    assert policy["primary_source_types"] == ["guide"]
    assert set(policy["secondary_source_types"]) == {"regulations_2015", "sccif"}
    assert service.workflow_routing("care_planning_risk_safeguarding")["preserve_safeguarding_escalation"] is True


def test_reg_44_45_preparation_routes_to_regulations_and_guide_with_sccif_secondary(service):
    policy = service.policy_output("reg_44_45_preparation")
    assert set(policy["primary_source_types"]) == {"regulations_2015", "guide"}
    assert policy["secondary_source_types"] == ["sccif"]
    assert service.workflow_routing("reg_44_45_preparation")["must_not_guarantee_compliance_or_outcome"] is True


def test_source_bundle_cap_is_enforced(service):
    limits = service.source_bundle_limits()
    assert limits["maximum_primary_source_types"] == 1
    assert limits["maximum_secondary_source_types"] == 2
    assert limits["maximum_total_source_ids"] == 5
    assert limits["maximum_exact_chunks_per_source_type"] == 3
    assert limits["maximum_exact_chunks_total"] == 5

    errors = service.validate_source_bundle(
        workflow_type="daily_record",
        primary_source_types=["guide", "regulations_2015"],
        secondary_source_types=[],
        source_ids=["a", "b", "c", "d", "e", "f"],
        exact_chunks_by_source_type={"guide": 4},
        total_exact_chunks=6,
        sends_full_source_blob=False,
    )
    assert any("primary source type count" in error for error in errors)
    assert any("source id count" in error for error in errors)
    assert any("exact chunk count for guide" in error for error in errors)
    assert any("total exact chunk count" in error for error in errors)


def test_full_source_blob_use_is_blocked(service):
    assert service.full_source_blob_blocked(source_type="guide", chunk_count=371) is True
    assert service.full_source_blob_blocked(source_type="regulations_2015", chunk_count=100) is True
    assert service.full_source_blob_blocked(source_type="sccif", chunk_count=951) is True
    assert service.full_source_blob_blocked(source_type="guide", chunk_count=3) is False

    errors = service.validate_source_bundle(
        workflow_type="daily_record",
        primary_source_types=["guide"],
        secondary_source_types=[],
        source_ids=[SOURCE_TYPE_TO_ID["guide"]],
        exact_chunks_by_source_type={"guide": 1},
        total_exact_chunks=1,
        sends_full_source_blob=True,
    )
    assert any("full source blob" in error for error in errors)


def test_metadata_citation_is_blocked(service):
    metadata_chunk = {
        "basis_type": "summary",
        "source_text_exact": False,
        "generated_metadata": {"content_kind": "generated_metadata"},
    }
    assert service.metadata_citation_blocked(metadata_chunk) is True
    assert service.citation_rules()["metadata_cannot_be_cited_as_exact_source_text"] is True


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB provides legal advice on the Regulations.",
        "ORB decides statutory compliance for this home.",
        "ORB guarantees compliance with Regulation 12.",
    ],
)
def test_regulations_answer_policy_blocks_legal_advice_and_compliance_wording(
    service, unsafe_text: str
):
    assert service.detect_regulations_unsafe_output(unsafe_text)


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides whether Regulation 40 notification is required.",
        "This event is notifiable under Regulation 40.",
        "ORB confirms this is notifiable.",
    ],
)
def test_regulation_40_policy_blocks_notification_threshold_decision_wording(
    service, unsafe_text: str
):
    assert service.detect_reg_40_unsafe_output(unsafe_text)


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB predicts the home will be rated Outstanding.",
        "The evidence will be graded as Good.",
        "ORB will be rated Outstanding at inspection.",
    ],
)
def test_sccif_answer_policy_blocks_grade_prediction_wording(service, unsafe_text: str):
    assert service.detect_sccif_unsafe_output(unsafe_text)


def test_sccif_answer_policy_blocks_inspection_readiness_decision_wording(service):
    assert service.detect_sccif_unsafe_output("ORB decides inspection readiness for this home.")


def test_sccif_answer_policy_blocks_meets_outstanding_good_wording(service):
    assert service.detect_sccif_unsafe_output("The evidence meets Outstanding.")


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB replaces Registered Manager judgement.",
        "ORB replaces Responsible Individual judgement.",
        "ORB replaces provider judgement.",
        "ORB replaces safeguarding decision-making.",
    ],
)
def test_unsafe_replacement_of_rm_ri_provider_safeguarding_judgement_is_blocked(
    service, unsafe_text: str
):
    assert not service.is_output_safe(unsafe_text)
    assert service.detect_unsafe_output(unsafe_text)


def test_required_boundary_statements_are_returned_for_regulatory_answers(service):
    statements = service.required_boundary_statements("regulatory_legal_sensitive")
    assert BOUNDARY_STATEMENTS["regulatory_legal_sensitive"] == statements
    assert any("legal advice" in statement for statement in statements)
    assert any("Registered Manager/provider" in statement for statement in statements)


def test_required_boundary_statements_are_returned_for_sccif_answers(service):
    statements = service.required_boundary_statements("ofsted_sccif")
    assert any("evidence review" in statement for statement in statements)
    assert any("does not predict Ofsted judgements" in statement for statement in statements)


def test_required_boundary_statements_are_returned_for_safeguarding_answers(service):
    statements = service.required_boundary_statements("safeguarding")
    assert any("local safeguarding procedures" in statement for statement in statements)
    policy = service.policy_output("care_planning_risk_safeguarding")
    assert any("local safeguarding procedures" in statement for statement in policy["required_boundary_statements"])


def test_named_human_signoff_is_required_before_live_wiring_can_be_enabled(service):
    requirements = service.human_signoff_requirements()
    assert requirements["named_human_signoff_required_per_source"] is True
    assert "named_human_signoff_for_each_source" in requirements["required_confirmations"]
    assert requirements["live_signoff_performed_in_phase_2e"] is False
    assert service.live_wiring_allowed() is False


def test_synthetic_human_review_is_not_sufficient_for_live_answer_use(service):
    requirements = service.human_signoff_requirements()
    assert requirements["synthetic_human_review_not_sufficient"] is True
    assert "synthetic_human_review_replaced_by_named_signoff" in requirements["required_confirmations"]


def test_guide_chunks_unchanged():
    payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(payload["chunks"]) == 371
    assert calculate_guide_checksum(payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_regulations_chunks_unchanged():
    payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    assert len(payload["chunks"]) == 100
    assert calculate_regulations_checksum(payload) == EXPECTED_REGULATIONS_CHUNK_JSON_SHA256


def test_sccif_chunks_unchanged():
    payload = load_sccif_payload(SCCIF_CHUNKS_PATH)
    assert len(payload["chunks"]) == 951
    assert calculate_sccif_checksum(payload) == EXPECTED_SCCIF_CHUNK_JSON_SHA256


def test_no_runtime_wiring_changed(service):
    summary = service.governance_summary()
    assert summary["runtime_wiring_changed"] is False
    assert summary["live_wiring_allowed"] is False
    assert summary["all_live_answer_wiring_disabled"] is True
    for policy in service.policy_output("daily_record"), service.policy_output("reg_40_notification"):
        assert policy["live_wiring_allowed"] is False
        assert policy["runtime_wiring_changed"] is False


def test_no_route_frontend_or_os_assistant_files_changed(service):
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "import requests",
        "import httpx",
        "urllib.request",
        "frontend/",
        "frontend-next",
        "orb_voice",
        "dictate",
        "communicate",
        "assistant_os_knowledge_routes",
        "assistant_routes",
        "ai_gateway",
    )
    source = SERVICE_PATH.read_text(encoding="utf-8")
    for marker in forbidden:
        assert marker not in source

    summary = service.governance_summary()
    assert summary["route_frontend_or_os_assistant_files_changed"] is False


def test_knowledge_retrieval_service_was_not_wired_to_answer_policy_chunks():
    source = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(encoding="utf-8")
    assert "orb_residential_source_answer_policy" not in source
    assert "orb_residential_guide_ingestion_service" not in source


def test_governance_summary_preserves_nr_1_and_public_promise_blocks(service):
    summary = service.governance_summary()
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True
    assert summary["guide_chunks_changed"] is False
    assert summary["regulations_chunks_changed"] is False
    assert summary["sccif_chunks_changed"] is False
