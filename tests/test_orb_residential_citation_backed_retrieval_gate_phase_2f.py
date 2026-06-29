"""ORB Residential Phase 2f citation-backed retrieval wiring gate tests."""

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
from services.orb_residential_citation_backed_retrieval_gate import (
    LIVE_WIRING_BLOCKED_REASON,
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_source_answer_policy import (
    SOURCE_TYPE_TO_ID,
    orb_residential_source_answer_policy_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-citation-backed-retrieval-gate-phase-2f.md"
GATE_PATH = REPO_ROOT / "services" / "orb_residential_citation_backed_retrieval_gate.py"
POLICY_PATH = REPO_ROOT / "services" / "orb_residential_source_answer_policy.py"


@pytest.fixture
def gate():
    return orb_residential_citation_backed_retrieval_gate


@pytest.fixture
def policy():
    return orb_residential_source_answer_policy_service


def test_phase_2f_documentation_exists_and_blocks_live_wiring():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2f" in content
    assert "not live wiring" in content.lower() or "This is not live wiring" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
    assert "synthetic" in content.lower()
    assert "named human sign-off" in content.lower()


def test_gate_imports_and_uses_phase_2e_policy_object(gate, policy):
    assert gate.policy_service() is policy
    source = GATE_PATH.read_text(encoding="utf-8")
    assert "orb_residential_source_answer_policy" in source
    assert "preview_only_policy_output" in source
    assert "validate_source_bundle" in source


@pytest.mark.parametrize(
    "workflow_type",
    [
        "daily_record",
        "incident_reflection",
        "reg_40_notification",
        "ofsted_evidence_preparation",
        "care_planning_risk_safeguarding",
        "reg_44_45_preparation",
    ],
)
def test_live_wiring_remains_blocked_for_every_workflow(gate, workflow_type):
    preview = gate.assemble_bundle_preview(workflow_type)
    assert preview["live_answer_wiring_allowed"] is False
    assert preview["citable_in_live_answers"] is False
    assert preview["runtime_answer_behaviour_changed"] is False
    assert preview["public_promise_allowed"] is False
    assert preview["live_wiring_blocked_reason"] == LIVE_WIRING_BLOCKED_REASON
    assert preview["sent_to_live_orb_answers"] is False
    assert preview["llm_called"] is False


def test_daily_record_bundle_uses_guide_as_primary_and_does_not_exceed_caps(gate):
    preview = gate.assemble_bundle_preview("daily_record")
    assert preview["primary_source_types"] == ["guide"]
    assert "guide" in preview["source_bundles"]
    assert preview["source_bundles"]["guide"]["role_in_bundle"] == "primary"
    assert preview["source_bundles"]["guide"]["exact_chunk_count"] <= 3
    total = sum(bundle["exact_chunk_count"] for bundle in preview["source_bundles"].values())
    assert total <= 5
    assert not preview["bundle_validation_errors"]


def test_incident_reflection_bundle_uses_guide_primary_and_secondary_follows_policy(gate):
    preview = gate.assemble_bundle_preview(
        "incident_reflection",
        include_secondary_source_types=["regulations_2015"],
    )
    assert preview["primary_source_types"] == ["guide"]
    assert preview["included_secondary_source_types"] == ["regulations_2015"]
    assert "guide" in preview["source_bundles"]
    assert "regulations_2015" in preview["source_bundles"]
    assert preview["source_bundles"]["regulations_2015"]["role_in_bundle"] == "secondary"
    assert any("local safeguarding procedures" in item for item in preview["required_boundary_statements"])
    assert preview["escalation_prompts"]


def test_regulation_40_bundle_routes_to_regulations_remains_blocked_and_returns_notification_boundary(
    gate,
):
    preview = gate.assemble_bundle_preview("reg_40_notification")
    assert preview["primary_source_types"] == ["regulations_2015"]
    assert "regulations_2015" in preview["source_bundles"]
    assert preview["live_answer_wiring_allowed"] is False
    statements = preview["required_boundary_statements"]
    assert any("notifiable" in statement.lower() for statement in statements)
    assert any("Regulation 40" in statement for statement in statements)


def test_ofsted_evidence_bundle_routes_to_sccif_remains_blocked_and_returns_sccif_boundary(gate):
    preview = gate.assemble_bundle_preview("ofsted_evidence_preparation")
    assert preview["primary_source_types"] == ["sccif"]
    assert "sccif" in preview["source_bundles"]
    assert preview["live_answer_wiring_allowed"] is False
    statements = preview["required_boundary_statements"]
    assert any("does not predict Ofsted judgements" in statement for statement in statements)


def test_care_planning_safeguarding_bundle_routes_to_guide_and_returns_safeguarding_boundary(gate):
    preview = gate.assemble_bundle_preview("care_planning_risk_safeguarding")
    assert preview["primary_source_types"] == ["guide"]
    assert "guide" in preview["source_bundles"]
    statements = preview["required_boundary_statements"]
    assert any("local safeguarding procedures" in statement for statement in statements)
    assert any("legal advice" in statement for statement in statements)


def test_reg_44_45_bundle_handles_dual_primary_exception_without_exceeding_source_caps(gate):
    preview = gate.assemble_bundle_preview("reg_44_45_preparation")
    assert set(preview["primary_source_types"]) == {"regulations_2015", "guide"}
    assert "regulations_2015" in preview["source_bundles"]
    assert "guide" in preview["source_bundles"]
    assert preview["source_bundles"]["regulations_2015"]["role_in_bundle"] == "primary"
    assert preview["source_bundles"]["guide"]["role_in_bundle"] == "primary"
    assert preview["source_bundles"]["regulations_2015"]["exact_chunk_count"] <= 3
    assert preview["source_bundles"]["guide"]["exact_chunk_count"] <= 3
    total = sum(bundle["exact_chunk_count"] for bundle in preview["source_bundles"].values())
    assert total <= 5
    assert not preview["bundle_validation_errors"]


def test_maximum_three_chunks_per_source_type_is_enforced(gate, policy):
    limits = policy.source_bundle_limits()
    preview = gate.assemble_bundle_preview("daily_record")
    for bundle in preview["source_bundles"].values():
        assert bundle["exact_chunk_count"] <= limits["maximum_exact_chunks_per_source_type"]


def test_maximum_five_exact_chunks_total_is_enforced(gate, policy):
    limits = policy.source_bundle_limits()
    preview = gate.assemble_bundle_preview(
        "reg_44_45_preparation",
        include_secondary_source_types=["sccif"],
    )
    total = sum(bundle["exact_chunk_count"] for bundle in preview["source_bundles"].values())
    assert total <= limits["maximum_exact_chunks_total"]


def test_full_guide_blob_is_blocked(gate):
    assert gate.full_source_blob_blocked(source_type="guide", chunk_count=371) is True
    preview = gate.assemble_bundle_preview("daily_record")
    assert preview["source_bundles"]["guide"]["full_source_blob_blocked"] is False
    errors = policy_validate_full_blob(gate, "guide", 371)
    assert errors


def test_full_regulations_blob_is_blocked(gate):
    assert gate.full_source_blob_blocked(source_type="regulations_2015", chunk_count=100) is True
    errors = policy_validate_full_blob(gate, "regulations_2015", 100)
    assert errors


def test_full_sccif_blob_is_blocked(gate):
    assert gate.full_source_blob_blocked(source_type="sccif", chunk_count=951) is True
    errors = policy_validate_full_blob(gate, "sccif", 951)
    assert errors


def policy_validate_full_blob(gate, source_type, chunk_count):
    policy = gate.policy_service()
    return policy.validate_source_bundle(
        workflow_type="daily_record",
        primary_source_types=[source_type],
        secondary_source_types=[],
        source_ids=[SOURCE_TYPE_TO_ID[source_type]],
        exact_chunks_by_source_type={source_type: chunk_count},
        total_exact_chunks=chunk_count,
        sends_full_source_blob=True,
    )


def test_metadata_chunks_cannot_be_citation_candidates(gate):
    metadata_chunk = {
        "basis_type": "summary",
        "source_text_exact": False,
        "generated_metadata": {"content_kind": "generated_metadata"},
        "source_id": SOURCE_TYPE_TO_ID["guide"],
    }
    assert gate.metadata_citation_blocked(metadata_chunk) is True
    preview = gate.assemble_bundle_preview("daily_record")
    assert all(
        candidate["metadata_citation_blocked"] is False
        for candidate in preview["citation_candidates"]
    )


def test_exact_citation_unavailable_means_human_review_required(gate):
    blocked_chunk = {
        "source_id": SOURCE_TYPE_TO_ID["guide"],
        "basis_type": "summary",
        "source_text_exact": False,
        "generated_metadata": {"content_kind": "generated_metadata"},
    }
    candidate = gate._prepare_citation_candidate(
        source_type="guide",
        chunk=blocked_chunk,
        role="primary",
    )
    assert candidate["citation_candidate"] is False
    assert candidate["human_review_required"] is True


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB provides legal advice on the Regulations.",
        "This guidance gives legal advice for your home.",
    ],
)
def test_unsafe_legal_advice_wording_is_flagged(gate, unsafe_text: str):
    assert gate.detect_regulations_unsafe_output(unsafe_text)
    assert not gate.is_output_safe("ORB provides legal advice on the Regulations.")


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides statutory compliance for this home.",
        "ORB decides legal compliance with Regulation 12.",
        "ORB guarantees compliance with the Regulations.",
    ],
)
def test_unsafe_compliance_decision_wording_is_flagged(gate, unsafe_text: str):
    assert gate.detect_unsafe_output(unsafe_text) or gate.detect_regulations_unsafe_output(unsafe_text)


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides whether Regulation 40 notification is required.",
        "ORB confirms this is notifiable.",
        "This event is notifiable under Regulation 40.",
    ],
)
def test_unsafe_reg_40_notifiable_wording_is_flagged(gate, unsafe_text: str):
    assert gate.detect_reg_40_unsafe_output(unsafe_text) or gate.detect_unsafe_output(unsafe_text)


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB predicts the home will be rated Outstanding.",
        "The home will be graded as Good at inspection.",
    ],
)
def test_unsafe_grade_prediction_wording_is_flagged(gate, unsafe_text: str):
    assert gate.detect_sccif_unsafe_output(unsafe_text)


def test_unsafe_inspection_readiness_wording_is_flagged(gate):
    assert gate.detect_sccif_unsafe_output("ORB decides inspection readiness for this home.")
    assert gate.detect_unsafe_output("ORB decides inspection readiness for this home.")


def test_unsafe_good_outstanding_wording_is_flagged(gate):
    assert gate.detect_sccif_unsafe_output("The evidence meets Outstanding.")
    assert gate.detect_unsafe_output("ORB confirms evidence meets Good.")


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB replaces Registered Manager judgement.",
        "ORB replaces Responsible Individual judgement.",
        "ORB replaces provider judgement.",
        "ORB replaces safeguarding decision-making.",
    ],
)
def test_unsafe_judgement_replacement_wording_is_flagged(gate, unsafe_text: str):
    assert not gate.is_output_safe(unsafe_text)
    assert gate.detect_unsafe_output(unsafe_text)


def test_named_human_signoff_is_required_before_live_wiring(gate):
    preview = gate.assemble_bundle_preview("daily_record")
    assert preview["named_human_signoff_required"] is True
    requirements = preview["human_signoff_requirements"]
    assert requirements["named_human_signoff_required_per_source"] is True
    assert requirements["live_signoff_performed_in_phase_2e"] is False
    assert gate.live_answer_wiring_allowed() is False


def test_synthetic_human_review_is_insufficient(gate):
    preview = gate.assemble_bundle_preview("daily_record")
    assert preview["synthetic_human_review_insufficient"] is True
    assert preview["human_signoff_requirements"]["synthetic_human_review_not_sufficient"] is True


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


def test_no_runtime_answer_route_changed(gate):
    summary = gate.governance_summary()
    assert summary["runtime_answer_behaviour_changed"] is False
    assert summary["all_live_answer_wiring_blocked"] is True
    assert summary["all_citable_in_live_answers_disabled"] is True


def test_no_frontend_or_os_assistant_files_changed(gate):
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
    source = GATE_PATH.read_text(encoding="utf-8")
    for marker in forbidden:
        assert marker not in source

    summary = gate.governance_summary()
    assert summary["route_frontend_or_os_assistant_files_changed"] is False


def test_gate_is_not_imported_by_live_answer_assembly():
    knowledge_retrieval = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(
        encoding="utf-8"
    )
    assert "orb_residential_citation_backed_retrieval_gate" not in knowledge_retrieval
    intelligence = (REPO_ROOT / "services" / "orb_residential_intelligence_service.py").read_text(
        encoding="utf-8"
    )
    assert "orb_residential_citation_backed_retrieval_gate" not in intelligence


def test_governance_summary_preserves_nr_1_and_public_promise_blocks(gate):
    summary = gate.governance_summary()
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True
    assert summary["guide_chunks_changed"] is False
    assert summary["regulations_chunks_changed"] is False
    assert summary["sccif_chunks_changed"] is False
