"""ORB Residential Phase 2h runtime enforcement hardening tests."""

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
    LIVE_PAYLOAD_BLOCKED_POLICY_FIELDS,
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_runtime_enforcement_gate import (
    orb_residential_runtime_enforcement_gate,
)
from services.orb_residential_source_answer_policy import (
    BOUNDARY_STATEMENTS,
    orb_residential_source_answer_policy_service,
)
from services.orb_residential_source_signoff_gate import (
    orb_residential_source_signoff_gate,
)
from tests.test_orb_residential_source_signoff_runtime_enforcement_phase_2g import (
    valid_signoff_record,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-runtime-enforcement-hardening-phase-2h.md"
RUNTIME_PATH = REPO_ROOT / "services" / "orb_residential_runtime_enforcement_gate.py"
RETRIEVAL_PATH = REPO_ROOT / "services" / "orb_residential_citation_backed_retrieval_gate.py"


@pytest.fixture
def runtime_gate():
    return orb_residential_runtime_enforcement_gate


@pytest.fixture
def retrieval_gate():
    return orb_residential_citation_backed_retrieval_gate


@pytest.fixture
def policy():
    return orb_residential_source_answer_policy_service


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


def test_phase_2h_documentation_exists():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2h" in content
    assert "boundary matching" in content.lower()
    assert "escalation prompt" in content.lower()
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_exact_required_boundary_passes(runtime_gate, policy):
    workflow = "care_planning_risk_safeguarding"
    ok, errors = runtime_gate.validate_boundary_statements(
        workflow_type=workflow,  # type: ignore[arg-type]
        boundary_statement_ids_present=boundary_ids_for_workflow(workflow),
        boundary_statements_present=boundary_texts_for_workflow(workflow),
    )
    assert ok is True
    assert errors == []


def test_missing_boundary_fails(runtime_gate):
    ok, errors = runtime_gate.validate_boundary_statements(
        workflow_type="reg_40_notification",
        boundary_statement_ids_present=[],
        boundary_statements_present=[],
    )
    assert ok is False
    assert any("missing boundary id" in error for error in errors)


def test_altered_boundary_fails(runtime_gate):
    texts = boundary_texts_for_workflow("ofsted_evidence_preparation")
    altered = [texts[1].replace("does not predict", "might predict")]
    ok, errors = runtime_gate.validate_boundary_statements(
        workflow_type="ofsted_evidence_preparation",
        boundary_statements_present=altered,
    )
    assert ok is False
    assert any("non-canonical boundary text" in error for error in errors)


def test_prefix_only_boundary_fails(runtime_gate):
    full = BOUNDARY_STATEMENTS["safeguarding"][0]
    ok, errors = runtime_gate.validate_boundary_statements(
        workflow_type="incident_reflection",
        boundary_statements_present=[full[:40]],
    )
    assert ok is False
    assert any("prefix-only boundary rejected" in error for error in errors)


def test_wrong_boundary_group_fails(runtime_gate):
    ok, errors = runtime_gate.validate_boundary_statements(
        workflow_type="ofsted_evidence_preparation",
        boundary_statement_ids_present=["safeguarding_local_escalation"],
        boundary_statements_present=[
            orb_residential_source_answer_policy_service.canonical_boundary_text(
                "safeguarding_local_escalation"
            )
        ],
    )
    assert ok is False
    assert any("wrong boundary group" in error for error in errors)


def test_required_escalation_prompt_passes(runtime_gate):
    workflow = "incident_reflection"
    ok, errors = runtime_gate.validate_escalation_prompts(
        workflow_type=workflow,  # type: ignore[arg-type]
        escalation_prompt_ids_present=escalation_ids_for_workflow(workflow),
        escalation_prompts_present=escalation_texts_for_workflow(workflow),
    )
    assert ok is True
    assert errors == []


def test_missing_escalation_prompt_fails(runtime_gate):
    ok, errors = runtime_gate.validate_escalation_prompts(
        workflow_type="incident_reflection",
        escalation_prompt_ids_present=[],
        escalation_prompts_present=[],
    )
    assert ok is False
    assert any("missing escalation prompt id" in error for error in errors)


def test_generic_placeholder_escalation_prompt_fails(runtime_gate):
    ok, errors = runtime_gate.validate_escalation_prompts(
        workflow_type="incident_reflection",
        escalation_prompts_present=["escalate if needed"],
    )
    assert ok is False
    assert any("generic escalation placeholder rejected" in error for error in errors)


def test_wrong_workflow_escalation_prompt_fails(runtime_gate):
    ok, errors = runtime_gate.validate_escalation_prompts(
        workflow_type="incident_reflection",
        escalation_prompt_ids_present=["safeguarding_preserve_escalation"],
        escalation_prompts_present=[
            orb_residential_source_answer_policy_service.canonical_escalation_text(
                "safeguarding_preserve_escalation"
            )
        ],
    )
    assert ok is False
    assert any("wrong workflow escalation prompt" in error for error in errors)


def test_incident_reflection_escalation_absence_fails(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("incident_reflection")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="incident_reflection",
        retrieval_bundle_preview=bundle,
        answer_text="Safe reflection text.",
        boundary_statement_ids_present=boundary_ids_for_workflow("incident_reflection"),
        boundary_statements_present=boundary_texts_for_workflow("incident_reflection"),
    )
    assert any("missing escalation prompt id" in error for error in evaluation["enforcement_errors"])


def test_safeguarding_escalation_absence_fails(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("care_planning_risk_safeguarding")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="care_planning_risk_safeguarding",
        retrieval_bundle_preview=bundle,
        answer_text="Safe planning text.",
        boundary_statement_ids_present=boundary_ids_for_workflow("care_planning_risk_safeguarding"),
        boundary_statements_present=boundary_texts_for_workflow("care_planning_risk_safeguarding"),
    )
    assert any("missing escalation prompt id" in error for error in evaluation["enforcement_errors"])


def test_live_enablement_output_is_unambiguous(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    enablement = runtime_gate.evaluate_live_enablement(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer.",
        boundary_statements_present=[],
        source_types_used=["guide"],
        proposed_signoffs={"guide": valid_signoff_record("guide")},
        nr_1_cleared_for_wiring=True,
    )
    assert enablement["live_source_grounded_answers_enabled"] is False
    assert enablement["hard_live_enablement_block_active"] is True
    assert "all_preconditions_met" in enablement
    assert "future_enablement_conditions" in enablement
    assert enablement["all_conditions_met"] is False
    assert enablement["blocked_reason"]


def test_hard_live_enablement_block_remains_active(runtime_gate):
    assert runtime_gate.hard_live_enablement_block_active() is True
    assert runtime_gate.live_source_grounded_answers_enabled() is False


def test_live_answers_remain_false_even_if_hypothetical_preconditions_met(runtime_gate, retrieval_gate):
    workflow = "daily_record"
    bundle = retrieval_gate.assemble_bundle_preview(workflow)
    enablement = runtime_gate.evaluate_live_enablement(
        workflow_type=workflow,
        retrieval_bundle_preview=bundle,
        answer_text="Safe child-centred recording support.",
        boundary_statements_present=boundary_texts_for_workflow(workflow),
        boundary_statement_ids_present=boundary_ids_for_workflow(workflow),
        escalation_prompts_present=escalation_texts_for_workflow(workflow),
        escalation_prompt_ids_present=escalation_ids_for_workflow(workflow),
        source_types_used=["guide"],
        proposed_signoffs={"guide": valid_signoff_record("guide")},
        nr_1_cleared_for_wiring=True,
    )
    assert enablement["live_source_grounded_answers_enabled"] is False
    assert enablement["hard_live_enablement_block_active"] is True


def test_retrieval_hints_cannot_drift_from_policy_routing(retrieval_gate):
    assert retrieval_gate.retrieval_hints_policy_alignment_errors() == []


def test_preview_allows_preview_only_policy_output(retrieval_gate):
    preview = retrieval_gate.assemble_bundle_preview("daily_record")
    assert "preview_only_policy_output" in preview
    assert preview["preview_only_policy_output"]["blocked_from_live_payloads"] is True
    assert "policy_output" not in preview


def test_live_payload_candidate_excludes_full_policy_output(retrieval_gate, runtime_gate):
    preview = retrieval_gate.assemble_bundle_preview("daily_record")
    candidate = retrieval_gate.build_live_payload_candidate(preview)
    for field in LIVE_PAYLOAD_BLOCKED_POLICY_FIELDS:
        assert field not in candidate
    errors = runtime_gate.validate_live_payload_candidate(candidate)
    assert errors == []


def test_live_payload_candidate_rejects_embedded_policy_output(runtime_gate):
    preview = {
        "phase": "Phase 2f",
        "policy_output": {"workflow_type": "daily_record"},
        "live_answer_wiring_allowed": False,
        "bundle_validation_errors": [],
        "source_bundles": {},
        "citation_candidates": [],
    }
    errors = runtime_gate.validate_live_payload_candidate(preview)
    assert any("policy_output" in error for error in errors)


@pytest.mark.parametrize(
    "unsafe_text,workflow",
    [
        ("This is legal advice.", "reg_40_notification"),
        ("This confirms Regulation 40 applies.", "reg_40_notification"),
        ("This is not notifiable.", "reg_40_notification"),
        ("This evidence meets Good.", "ofsted_evidence_preparation"),
        ("This evidence meets Outstanding.", "ofsted_evidence_preparation"),
        ("The home is inspection ready.", "ofsted_evidence_preparation"),
        ("The home will be judged Good.", "ofsted_evidence_preparation"),
        ("The Registered Manager does not need to review this.", "care_planning_risk_safeguarding"),
        ("No safeguarding escalation is required.", "care_planning_risk_safeguarding"),
    ],
)
def test_unprefixed_unsafe_wording_is_flagged(runtime_gate, retrieval_gate, unsafe_text, workflow):
    bundle = retrieval_gate.assemble_bundle_preview(workflow)  # type: ignore[arg-type]
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type=workflow,  # type: ignore[arg-type]
        retrieval_bundle_preview=bundle,
        answer_text=unsafe_text,
        boundary_statement_ids_present=boundary_ids_for_workflow(workflow),
        boundary_statements_present=boundary_texts_for_workflow(workflow),
        escalation_prompt_ids_present=escalation_ids_for_workflow(workflow),
        escalation_prompts_present=escalation_texts_for_workflow(workflow),
    )
    assert evaluation["unsafe_output_violations"]


def test_no_named_signoff_artefact_created():
    artefact = REPO_ROOT / "data" / "orb_residential_governance" / "named_source_signoffs.json"
    assert not artefact.is_file()


def test_all_sources_remain_unsigned():
    for source_type in ("guide", "regulations_2015", "sccif"):
        assert orb_residential_source_signoff_gate.is_source_signed_off(source_type) is False


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


def test_no_runtime_answer_route_changed(runtime_gate):
    summary = runtime_gate.governance_summary()
    assert summary["runtime_answer_behaviour_changed"] is False
    assert summary["live_source_grounded_answers_enabled"] is False


def test_no_frontend_or_os_assistant_files_changed(runtime_gate):
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "frontend/",
        "frontend-next",
        "orb_voice",
        "assistant_routes",
    )
    for path in (RUNTIME_PATH, RETRIEVAL_PATH):
        source = path.read_text(encoding="utf-8")
        for marker in forbidden:
            assert marker not in source
