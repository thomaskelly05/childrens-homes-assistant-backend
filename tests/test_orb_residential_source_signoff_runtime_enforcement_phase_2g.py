"""ORB Residential Phase 2g named sign-off and runtime enforcement gate tests."""

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
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_REGULATIONS_SOURCE_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_JSON_SHA256,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_SCCIF_SOURCE_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from services.orb_residential_citation_backed_retrieval_gate import (
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_runtime_enforcement_gate import (
    LIVE_ENABLEMENT_CONDITIONS,
    orb_residential_runtime_enforcement_gate,
)
from services.orb_residential_source_answer_policy import BOUNDARY_STATEMENTS
from services.orb_residential_source_signoff_gate import (
    orb_residential_source_signoff_gate,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-source-signoff-runtime-enforcement-phase-2g.md"
SIGNOFF_PATH = REPO_ROOT / "services" / "orb_residential_source_signoff_gate.py"
RUNTIME_PATH = REPO_ROOT / "services" / "orb_residential_runtime_enforcement_gate.py"


@pytest.fixture
def signoff_gate():
    return orb_residential_source_signoff_gate


@pytest.fixture
def runtime_gate():
    return orb_residential_runtime_enforcement_gate


@pytest.fixture
def retrieval_gate():
    return orb_residential_citation_backed_retrieval_gate


def valid_signoff_record(source_type: str) -> dict:
    from scripts.verify_orb_named_source_signoffs import SOURCE_TYPE_TO_TITLE

    base = {
        "source_type": source_type,
        "source_id": {
            "guide": "dfe_childrens_homes_regulations_guide",
            "regulations_2015": "childrens_homes_regulations_2015",
            "sccif": "ofsted_sccif_childrens_homes",
        }[source_type],
        "source_title": SOURCE_TYPE_TO_TITLE[source_type],
        "reviewer_name": "Jordan Williams",
        "reviewer_role": "Registered Manager",
        "reviewer_organisation": "Example Children's Home Ltd",
        "review_date": "2026-06-29",
        "review_scope": "Offline verified source artefact and Phase 2e-2h policy gates",
        "source_checksum_verified": True,
        "chunk_checksum_verified": True,
        "source_role_approved": True,
        "citation_policy_approved": True,
        "routing_policy_approved": True,
        "unsafe_output_blockers_approved": True,
        "boundary_statements_approved": True,
        "local_policy_limitation_acknowledged": True,
        "professional_judgement_boundary_acknowledged": True,
        "no_legal_advice_acknowledged": True,
        "no_compliance_guarantee_acknowledged": True,
        "synthetic_review_rejected_as_sufficient": True,
        "nr_1_controls_confirmed": True,
        "public_promise_remains_blocked": True,
        "signed_by_named_human": True,
        "signature_attestation": "I confirm named human review of this source for ORB Residential policy gates.",
        "created_at": "2026-06-29T12:00:00Z",
        "provenance": {
            "artefact_kind": "test_fixture_only",
            "template_only": False,
            "not_valid_signoff": False,
        },
    }
    if source_type == "guide":
        base["declared_chunk_checksum"] = EXPECTED_GUIDE_CHUNK_JSON_SHA256
    if source_type == "regulations_2015":
        base["declared_source_checksum"] = EXPECTED_REGULATIONS_SOURCE_SHA256
        base["declared_chunk_checksum"] = EXPECTED_REGULATIONS_CHUNK_JSON_SHA256
    if source_type == "sccif":
        base["declared_source_checksum"] = EXPECTED_SCCIF_SOURCE_SHA256
        base["declared_chunk_checksum"] = EXPECTED_SCCIF_CHUNK_JSON_SHA256
        base["no_ofsted_grade_prediction_acknowledged"] = True
        base["no_inspection_readiness_decision_acknowledged"] = True
        base["no_inspection_outcome_guarantee_acknowledged"] = True
    return base


def boundary_texts(*boundary_types: str) -> list[str]:
    statements: list[str] = []
    for boundary_type in boundary_types:
        statements.extend(BOUNDARY_STATEMENTS[boundary_type])  # type: ignore[index]
    return statements


def test_phase_2g_documentation_exists_and_blocks_live_wiring():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2g" in content
    assert "live source-grounded answers enabled?" in content.lower() or "Live source-grounded answers enabled?" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
    assert "synthetic" in content.lower()


@pytest.mark.parametrize("source_type", ["guide", "regulations_2015", "sccif"])
def test_source_requires_named_human_signoff_before_live_use(signoff_gate, source_type):
    status = signoff_gate.source_signoff_status(source_type)  # type: ignore[arg-type]
    assert status["named_human_signoff_required"] is True
    assert status["signed_off"] is False
    assert status["committed_signoff_exists"] is False


def test_synthetic_review_is_rejected_for_live_use(signoff_gate):
    summary = signoff_gate.governance_summary()
    assert summary["synthetic_review_not_sufficient"] is True
    record = valid_signoff_record("guide")
    record["synthetic_review_rejected_as_sufficient"] = False
    assert "synthetic review must be explicitly rejected" in " ".join(
        signoff_gate.validate_signoff_record("guide", record)
    )


def test_missing_reviewer_name_fails_signoff(signoff_gate):
    record = valid_signoff_record("guide")
    record["reviewer_name"] = ""
    assert any("missing reviewer_name" in error for error in signoff_gate.validate_signoff_record("guide", record))


def test_missing_reviewer_role_fails_signoff(signoff_gate):
    record = valid_signoff_record("regulations_2015")
    record["reviewer_role"] = ""
    assert any("missing reviewer_role" in error for error in signoff_gate.validate_signoff_record("regulations_2015", record))


def test_missing_checksum_confirmation_fails_signoff(signoff_gate):
    record = valid_signoff_record("sccif")
    record["chunk_checksum_verified"] = False
    assert any("chunk_checksum_verified" in error for error in signoff_gate.validate_signoff_record("sccif", record))


def test_missing_citation_policy_approval_fails_signoff(signoff_gate):
    record = valid_signoff_record("guide")
    record["citation_policy_approved"] = False
    assert any("citation_policy_approved" in error for error in signoff_gate.validate_signoff_record("guide", record))


def test_missing_unsafe_blocker_approval_fails_signoff(signoff_gate):
    record = valid_signoff_record("regulations_2015")
    record["unsafe_output_blockers_approved"] = False
    assert any("unsafe_output_blockers_approved" in error for error in signoff_gate.validate_signoff_record("regulations_2015", record))


def test_missing_boundary_approval_fails_signoff(signoff_gate):
    record = valid_signoff_record("sccif")
    record["boundary_statements_approved"] = False
    assert any("boundary_statements_approved" in error for error in signoff_gate.validate_signoff_record("sccif", record))


def test_signoff_does_not_enable_live_wiring_by_itself(signoff_gate):
    evaluation = signoff_gate.evaluate_signoff_record("guide", valid_signoff_record("guide"))
    assert evaluation["signoff_complete"] is True
    assert evaluation["signoff_enables_live_wiring"] is False
    assert signoff_gate.live_wiring_allowed() is False


def test_runtime_enforcement_blocks_live_use_when_signoff_is_missing(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="ORB can support child-centred recording.",
        boundary_statements_present=[],
    )
    assert evaluation["live_source_grounded_answers_enabled"] is False
    assert any("sign-off missing" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_blocks_live_use_when_runtime_answer_wiring_enabled_is_false(
    runtime_gate, retrieval_gate
):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="ORB can support child-centred recording.",
        boundary_statements_present=boundary_texts(),
        proposed_signoffs={"guide": valid_signoff_record("guide")},
    )
    assert evaluation["live_source_grounded_answers_enabled"] is False
    assert any("runtime_answer_wiring_enabled is false" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_blocks_metadata_citations(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    bundle["citation_candidates"] = [
        {
            "source_type": "guide",
            "metadata_citation_blocked": True,
            "citation_candidate": True,
        }
    ]
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=boundary_texts(),
    )
    assert any("metadata chunk cannot be a citation candidate" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_blocks_full_source_blobs(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    bundle["source_bundles"]["guide"]["full_source_blob_blocked"] = True
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=boundary_texts(),
    )
    assert any("full source blob blocked" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_blocks_bundle_cap_breaches(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    bundle["bundle_validation_errors"] = ["total exact chunk count 6 exceeds maximum 5"]
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=boundary_texts(),
    )
    assert any("bundle validation" in error for error in evaluation["enforcement_errors"])


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB provides legal advice on the Regulations.",
        "This guidance gives legal advice for your home.",
    ],
)
def test_runtime_enforcement_blocks_legal_advice_wording(runtime_gate, retrieval_gate, unsafe_text):
    bundle = retrieval_gate.assemble_bundle_preview("reg_40_notification")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="reg_40_notification",
        retrieval_bundle_preview=bundle,
        answer_text=unsafe_text,
        boundary_statements_present=boundary_texts("regulatory_legal_sensitive", "notification_regulation_40"),
    )
    assert evaluation["unsafe_output_violations"]
    assert any("unsafe output" in error for error in evaluation["enforcement_errors"])


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides statutory compliance for this home.",
        "ORB guarantees compliance with Regulation 12.",
    ],
)
def test_runtime_enforcement_blocks_compliance_decision_wording(runtime_gate, retrieval_gate, unsafe_text):
    bundle = retrieval_gate.assemble_bundle_preview("care_planning_risk_safeguarding")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="care_planning_risk_safeguarding",
        retrieval_bundle_preview=bundle,
        answer_text=unsafe_text,
        boundary_statements_present=boundary_texts("safeguarding", "regulatory_legal_sensitive"),
    )
    assert evaluation["unsafe_output_violations"]


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides whether Regulation 40 notification is required.",
        "ORB confirms this is notifiable.",
    ],
)
def test_runtime_enforcement_blocks_reg_40_notifiable_threshold_wording(runtime_gate, retrieval_gate, unsafe_text):
    bundle = retrieval_gate.assemble_bundle_preview("reg_40_notification")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="reg_40_notification",
        retrieval_bundle_preview=bundle,
        answer_text=unsafe_text,
        boundary_statements_present=boundary_texts("regulatory_legal_sensitive", "notification_regulation_40"),
    )
    assert evaluation["unsafe_output_violations"]


def test_runtime_enforcement_blocks_good_outstanding_judgement_wording(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("ofsted_evidence_preparation")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="ofsted_evidence_preparation",
        retrieval_bundle_preview=bundle,
        answer_text="The evidence meets Outstanding.",
        boundary_statements_present=boundary_texts("ofsted_sccif"),
    )
    assert evaluation["unsafe_output_violations"]


def test_runtime_enforcement_blocks_inspection_readiness_wording(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("ofsted_evidence_preparation")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="ofsted_evidence_preparation",
        retrieval_bundle_preview=bundle,
        answer_text="ORB decides inspection readiness for this home.",
        boundary_statements_present=boundary_texts("ofsted_sccif"),
    )
    assert evaluation["unsafe_output_violations"]


def test_runtime_enforcement_blocks_safeguarding_judgement_replacement(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("care_planning_risk_safeguarding")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="care_planning_risk_safeguarding",
        retrieval_bundle_preview=bundle,
        answer_text="ORB replaces safeguarding decision-making.",
        boundary_statements_present=boundary_texts("safeguarding", "regulatory_legal_sensitive"),
    )
    assert evaluation["unsafe_output_violations"]


def test_runtime_enforcement_requires_regulatory_boundary_statements(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("care_planning_risk_safeguarding")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="care_planning_risk_safeguarding",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=boundary_texts("safeguarding"),
    )
    assert any("missing boundary id" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_requires_notification_boundary_statements(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("reg_40_notification")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="reg_40_notification",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=boundary_texts("regulatory_legal_sensitive"),
    )
    assert any("missing boundary id" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_requires_sccif_boundary_statements(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("ofsted_evidence_preparation")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="ofsted_evidence_preparation",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=[],
    )
    assert any("missing boundary id" in error for error in evaluation["enforcement_errors"])


def test_runtime_enforcement_requires_safeguarding_boundary_statements(runtime_gate, retrieval_gate):
    bundle = retrieval_gate.assemble_bundle_preview("incident_reflection")
    evaluation = runtime_gate.evaluate_answer_assembly(
        workflow_type="incident_reflection",
        retrieval_bundle_preview=bundle,
        answer_text="Safe answer text.",
        boundary_statements_present=[],
    )
    assert any("missing boundary id" in error for error in evaluation["enforcement_errors"])


def test_live_source_grounded_answers_remain_disabled(runtime_gate, retrieval_gate, signoff_gate):
    bundle = retrieval_gate.assemble_bundle_preview("daily_record")
    enablement = runtime_gate.evaluate_live_enablement(
        workflow_type="daily_record",
        retrieval_bundle_preview=bundle,
        answer_text="ORB can support child-centred recording.",
        boundary_statements_present=boundary_texts(),
        source_types_used=["guide"],
        proposed_signoffs={"guide": valid_signoff_record("guide")},
    )
    assert enablement["live_source_grounded_answers_enabled"] is False
    assert runtime_gate.live_source_grounded_answers_enabled() is False
    assert signoff_gate.live_wiring_allowed() is False
    assert enablement["unmet_future_enablement_conditions"]


def test_live_enablement_conditions_are_defined(runtime_gate):
    assert tuple(runtime_gate.live_enablement_conditions()) == LIVE_ENABLEMENT_CONDITIONS
    assert "named_human_signoff_exists_for_every_source_used" in LIVE_ENABLEMENT_CONDITIONS
    assert "nr_1_closed_or_explicitly_cleared_for_wiring" in LIVE_ENABLEMENT_CONDITIONS


def test_valid_signoff_record_passes_validation_for_each_source(signoff_gate):
    for source_type in ("guide", "regulations_2015", "sccif"):
        record = valid_signoff_record(source_type)
        assert signoff_gate.validate_signoff_record(source_type, record) == []


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
    for path in (SIGNOFF_PATH, RUNTIME_PATH):
        source = path.read_text(encoding="utf-8")
        for marker in forbidden:
            assert marker not in source

    summary = runtime_gate.governance_summary()
    assert summary["route_frontend_or_os_assistant_files_changed"] is False


def test_gates_are_not_imported_by_live_answer_assembly():
    knowledge_retrieval = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(encoding="utf-8")
    intelligence = (REPO_ROOT / "services" / "orb_residential_intelligence_service.py").read_text(encoding="utf-8")
    assert "orb_residential_source_signoff_gate" not in knowledge_retrieval
    assert "orb_residential_runtime_enforcement_gate" not in knowledge_retrieval
    assert "orb_residential_source_signoff_gate" not in intelligence
    assert "orb_residential_runtime_enforcement_gate" not in intelligence


def test_governance_summary_preserves_nr_1_and_public_promise_blocks(signoff_gate, runtime_gate):
    signoff_summary = signoff_gate.governance_summary()
    runtime_summary = runtime_gate.governance_summary()
    assert signoff_summary["nr_1_remains_open"] is True
    assert signoff_summary["public_promise_remains_blocked"] is True
    assert runtime_summary["nr_1_remains_open"] is True
    assert runtime_summary["public_promise_remains_blocked"] is True
