"""ORB Residential Phase 2j source-grounded answer assembly integration tests."""

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
from services.orb_residential_source_grounded_answer_assembly_service import (
    orb_residential_source_grounded_answer_assembly_service,
)
from services.orb_residential_source_answer_policy import (
    orb_residential_source_answer_policy_service,
)
from tests.test_orb_residential_source_signoff_runtime_enforcement_phase_2g import (
    valid_signoff_record,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = (
    REPO_ROOT / "docs" / "audits" / "orb-residential-source-grounded-answer-assembly-phase-2j.md"
)
SERVICE_PATH = REPO_ROOT / "services" / "orb_residential_source_grounded_answer_assembly_service.py"
KNOWLEDGE_RETRIEVAL_PATH = REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py"
INTELLIGENCE_PATH = REPO_ROOT / "services" / "orb_residential_intelligence_service.py"
FINALIZATION_PATH = REPO_ROOT / "services" / "orb_residential_finalization_service.py"
CONVERGED_PATH = REPO_ROOT / "services" / "orb_converged_general_assistant_service.py"


@pytest.fixture
def assembly_service():
    return orb_residential_source_grounded_answer_assembly_service


def boundary_ids_for_workflow(workflow_type: str) -> list[str]:
    return list(
        orb_residential_source_answer_policy_service.required_boundary_statement_ids(workflow_type)  # type: ignore[arg-type]
    )


def boundary_texts_for_workflow(workflow_type: str) -> list[str]:
    return [
        orb_residential_source_answer_policy_service.canonical_boundary_text(boundary_id)
        for boundary_id in boundary_ids_for_workflow(workflow_type)
    ]


def escalation_ids_for_workflow(workflow_type: str) -> list[str]:
    return list(
        orb_residential_source_answer_policy_service.required_escalation_prompt_ids(workflow_type)  # type: ignore[arg-type]
    )


def escalation_texts_for_workflow(workflow_type: str) -> list[str]:
    return [
        orb_residential_source_answer_policy_service.canonical_escalation_text(prompt_id)
        for prompt_id in escalation_ids_for_workflow(workflow_type)
    ]


def test_phase_2j_documentation_exists():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2j" in content
    assert "not live source-grounded answering" in content.lower()
    assert "hard live block" in content.lower()
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_answer_assembly_can_call_runtime_enforcement_in_blocked_mode(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        query="child-centred daily record",
        answer_text="ORB can support child-centred recording.",
    )
    assert result["source_grounded_assembly_requested"] is True
    assert result["source_grounded_assembly_allowed"] is False
    assert "runtime_enforcement_result" in result
    assert result["runtime_enforcement_result"]["phase"] == "Phase 2h"


def test_live_source_grounded_answers_remain_disabled(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
        proposed_signoffs={"guide": valid_signoff_record("guide")},
        nr_1_cleared_for_wiring=True,
    )
    assert result["live_source_grounded_answers_enabled"] is False
    assert result["hard_live_enablement_block_active"] is True
    assert assembly_service.live_source_grounded_answers_enabled() is False


def test_no_source_chunks_sent_to_llm(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="reg_40_notification",
        answer_text="Safe notification support.",
    )
    assert result["source_chunks_sent_to_llm"] is False
    assert result["llm_called"] is False
    assert result["sent_to_live_orb_answers"] is False


def test_no_citations_returned_in_live_answers(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="ofsted_evidence_preparation",
        answer_text="Safe evidence review support.",
    )
    assert result["source_citations_returned_to_user"] is False
    assert result["source_grounded_assembly_allowed"] is False


def test_missing_named_signoff_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
    )
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("sign-off missing" in error for error in errors)
    assert result["completed_signoff_artefact_present"] is False
    assert result["any_source_signed_off"] is False


def test_unsigned_sources_block_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="care_planning_risk_safeguarding",
        answer_text="Safe planning support.",
    )
    for status in result["named_signoff_status"].values():
        assert status["signed_off"] is False


def test_runtime_answer_wiring_enabled_false_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
        proposed_signoffs={"guide": valid_signoff_record("guide")},
    )
    assert result["all_runtime_answer_wiring_disabled"] is True
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("runtime_answer_wiring_enabled is false" in error for error in errors)


def test_nr_1_open_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
        nr_1_cleared_for_wiring=False,
    )
    assert result["nr_1_remains_open"] is True
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("NR-1 remains open" in error for error in errors)


def test_public_promise_absent_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
        public_promise_claim_made=True,
    )
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("public promise" in error for error in errors)


def test_metadata_citation_blocks_assembly(assembly_service, monkeypatch):
    bundle = assembly_service.retrieval_gate().assemble_bundle_preview("daily_record")
    bundle["citation_candidates"] = [
        {
            "metadata_citation_blocked": True,
            "citation_candidate": True,
            "human_review_required": True,
        }
    ]

    monkeypatch.setattr(
        assembly_service._retrieval,
        "assemble_bundle_preview",
        lambda *args, **kwargs: bundle,
    )
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
    )
    assert result["source_grounded_assembly_allowed"] is False
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("metadata chunk cannot be a citation candidate" in error for error in errors)


def test_full_source_blob_blocks_assembly(assembly_service, monkeypatch):
    bundle = assembly_service.retrieval_gate().assemble_bundle_preview("daily_record")
    for source_bundle in bundle["source_bundles"].values():
        source_bundle["full_source_blob_blocked"] = True

    monkeypatch.setattr(
        assembly_service._retrieval,
        "assemble_bundle_preview",
        lambda *args, **kwargs: bundle,
    )
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="daily_record",
        answer_text="Safe answer.",
    )
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("full source blob blocked" in error for error in errors)


def test_missing_boundary_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="reg_40_notification",
        answer_text="Safe notification support.",
        boundary_statements_present=[],
        boundary_statement_ids_present=[],
    )
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("missing boundary id" in error for error in errors)


def test_unsafe_output_blocks_assembly(assembly_service):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type="reg_40_notification",
        answer_text="This is legal advice.",
        boundary_statement_ids_present=boundary_ids_for_workflow("reg_40_notification"),
        boundary_statements_present=boundary_texts_for_workflow("reg_40_notification"),
        escalation_prompt_ids_present=escalation_ids_for_workflow("reg_40_notification"),
        escalation_prompts_present=escalation_texts_for_workflow("reg_40_notification"),
    )
    assert result["runtime_enforcement_result"]["unsafe_output_violations"]
    errors = result["runtime_enforcement_result"]["enforcement_errors"]
    assert any("unsafe output" in error for error in errors)


@pytest.mark.parametrize(
    "workflow",
    [
        "daily_record",
        "reg_40_notification",
        "ofsted_evidence_preparation",
        "care_planning_risk_safeguarding",
    ],
)
def test_workflow_source_grounded_assembly_request_is_blocked_safely(assembly_service, workflow):
    result = assembly_service.evaluate_source_grounded_assembly(
        workflow_type=workflow,  # type: ignore[arg-type]
        answer_text="Safe child-centred support text.",
    )
    assert result["source_grounded_assembly_allowed"] is False
    assert result["source_chunks_sent_to_llm"] is False
    assert result["source_citations_returned_to_user"] is False
    assert result["live_source_grounded_answers_enabled"] is False


def test_service_is_not_imported_by_live_answer_assembly():
    for path in (KNOWLEDGE_RETRIEVAL_PATH, INTELLIGENCE_PATH, FINALIZATION_PATH, CONVERGED_PATH):
        source = path.read_text(encoding="utf-8")
        assert "orb_residential_source_grounded_answer_assembly_service" not in source


def test_no_named_signoff_artefact_created():
    artefact = REPO_ROOT / "data" / "orb_residential_governance" / "named_source_signoffs.json"
    assert not artefact.is_file()


def test_all_sources_remain_unsigned(assembly_service):
    for source_type in ("guide", "regulations_2015", "sccif"):
        status = assembly_service.signoff_gate().source_signoff_status(source_type)  # type: ignore[arg-type]
        assert status["signed_off"] is False


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


def test_live_answer_behaviour_unchanged(assembly_service):
    summary = assembly_service.governance_summary()
    assert summary["runtime_answer_behaviour_changed"] is False
    assert summary["live_source_grounded_answers_enabled"] is False
    assert summary["sent_to_live_orb_answers"] is False


def test_no_frontend_or_os_assistant_files_changed(assembly_service):
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "frontend/",
        "frontend-next",
        "orb_voice",
        "dictate",
        "communicate",
        "assistant_routes",
        "assistant_os_knowledge_routes",
    )
    source = SERVICE_PATH.read_text(encoding="utf-8")
    for marker in forbidden:
        assert marker not in source
    summary = assembly_service.governance_summary()
    assert summary["route_frontend_or_os_assistant_files_changed"] is False
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True


def test_governance_summary_preserves_hard_block(assembly_service):
    summary = assembly_service.governance_summary()
    assert summary["hard_live_enablement_block_active"] is True
    assert summary["source_grounded_assembly_allowed"] is False
    assert summary["completed_signoff_artefact_present"] is False
