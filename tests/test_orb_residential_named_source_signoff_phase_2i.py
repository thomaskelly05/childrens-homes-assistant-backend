"""ORB Residential Phase 2i named source sign-off schema and workflow tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_named_source_signoffs import (
    SCHEMA_PATH,
    SIGNOFF_ARTEFACT_PATH,
    SIGNOFF_TEMPLATE_PATH,
    validate_signoff_artefact,
    validate_signoff_record,
    validate_template_file,
    verify_template_only,
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
from services.orb_residential_runtime_enforcement_gate import (
    orb_residential_runtime_enforcement_gate,
)
from services.orb_residential_source_signoff_gate import (
    orb_residential_source_signoff_gate,
)
from tests.test_orb_residential_source_signoff_runtime_enforcement_phase_2g import (
    valid_signoff_record,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-named-source-signoff-phase-2i.md"
SIGNOFF_GATE_PATH = REPO_ROOT / "services" / "orb_residential_source_signoff_gate.py"


@pytest.fixture
def signoff_gate():
    return orb_residential_source_signoff_gate


@pytest.fixture
def runtime_gate():
    return orb_residential_runtime_enforcement_gate


def test_phase_2i_documentation_exists():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2i" in content
    assert "template" in content.lower()
    assert "synthetic review" in content.lower()
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_signoff_schema_exists():
    assert SCHEMA_PATH.is_file()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    assert schema["properties"]["schema_version"]["const"] == "orb-residential-named-source-signoff-v1"


def test_signoff_template_exists():
    assert SIGNOFF_TEMPLATE_PATH.is_file()
    payload = json.loads(SIGNOFF_TEMPLATE_PATH.read_text(encoding="utf-8"))
    assert payload["template_only"] is True
    assert payload["not_valid_signoff"] is True
    assert payload["must_not_be_used_as_completed_signoff"] is True


def test_template_verifier_passes():
    assert verify_template_only() == []


def test_template_is_not_treated_as_valid_signoff(signoff_gate):
    payload = json.loads(SIGNOFF_TEMPLATE_PATH.read_text(encoding="utf-8"))
    errors = validate_signoff_artefact(payload, allow_template=False)
    assert any("template artefact cannot be treated as completed sign-off" in error for error in errors)
    assert signoff_gate.is_source_signed_off("guide") is False
    assert signoff_gate.template_is_ignored_by_runtime() is True


def test_real_signoff_artefact_is_absent():
    assert not SIGNOFF_ARTEFACT_PATH.is_file()


@pytest.mark.parametrize("source_type", ["guide", "regulations_2015", "sccif"])
def test_all_sources_remain_unsigned(signoff_gate, source_type):
    assert signoff_gate.is_source_signed_off(source_type) is False  # type: ignore[arg-type]


def test_missing_reviewer_name_fails():
    record = valid_signoff_record("guide")
    record["reviewer_name"] = ""
    assert any("missing reviewer_name" in error for error in validate_signoff_record("guide", record))


def test_placeholder_reviewer_name_fails():
    record = valid_signoff_record("guide")
    record["reviewer_name"] = "TBC"
    assert any("placeholder reviewer name rejected" in error for error in validate_signoff_record("guide", record))


def test_example_reviewer_placeholder_fails():
    record = valid_signoff_record("regulations_2015")
    record["reviewer_name"] = "Example Reviewer"
    assert any("placeholder reviewer name rejected" in error for error in validate_signoff_record("regulations_2015", record))


def test_synthetic_reviewer_fails():
    record = valid_signoff_record("sccif")
    record["reviewer_name"] = "Synthetic Reviewer"
    assert any("synthetic reviewer name rejected" in error for error in validate_signoff_record("sccif", record))


def test_missing_reviewer_role_fails():
    record = valid_signoff_record("guide")
    record["reviewer_role"] = ""
    assert any("missing reviewer_role" in error for error in validate_signoff_record("guide", record))


def test_missing_reviewer_organisation_fails():
    record = valid_signoff_record("guide")
    record["reviewer_organisation"] = ""
    assert any("missing reviewer_organisation" in error for error in validate_signoff_record("guide", record))


def test_missing_review_date_fails():
    record = valid_signoff_record("guide")
    record["review_date"] = ""
    assert any("missing review_date" in error for error in validate_signoff_record("guide", record))


def test_false_source_checksum_confirmation_fails():
    record = valid_signoff_record("regulations_2015")
    record["source_checksum_verified"] = False
    assert any("source_checksum_verified" in error for error in validate_signoff_record("regulations_2015", record))


def test_false_chunk_checksum_confirmation_fails():
    record = valid_signoff_record("guide")
    record["chunk_checksum_verified"] = False
    assert any("chunk_checksum_verified" in error for error in validate_signoff_record("guide", record))


def test_missing_source_role_approval_fails():
    record = valid_signoff_record("guide")
    record["source_role_approved"] = False
    assert any("source_role_approved" in error for error in validate_signoff_record("guide", record))


def test_missing_citation_policy_approval_fails():
    record = valid_signoff_record("guide")
    record["citation_policy_approved"] = False
    assert any("citation_policy_approved" in error for error in validate_signoff_record("guide", record))


def test_missing_routing_policy_approval_fails():
    record = valid_signoff_record("regulations_2015")
    record["routing_policy_approved"] = False
    assert any("routing_policy_approved" in error for error in validate_signoff_record("regulations_2015", record))


def test_missing_unsafe_output_blocker_approval_fails():
    record = valid_signoff_record("regulations_2015")
    record["unsafe_output_blockers_approved"] = False
    assert any("unsafe_output_blockers_approved" in error for error in validate_signoff_record("regulations_2015", record))


def test_missing_boundary_statement_approval_fails():
    record = valid_signoff_record("sccif")
    record["boundary_statements_approved"] = False
    assert any("boundary_statements_approved" in error for error in validate_signoff_record("sccif", record))


def test_missing_local_policy_limitation_acknowledgement_fails():
    record = valid_signoff_record("guide")
    record["local_policy_limitation_acknowledged"] = False
    assert any("local_policy_limitation_acknowledged" in error for error in validate_signoff_record("guide", record))


def test_missing_professional_judgement_acknowledgement_fails():
    record = valid_signoff_record("guide")
    record["professional_judgement_boundary_acknowledged"] = False
    assert any("professional_judgement_boundary_acknowledged" in error for error in validate_signoff_record("guide", record))


def test_missing_no_legal_advice_acknowledgement_fails():
    record = valid_signoff_record("guide")
    record["no_legal_advice_acknowledged"] = False
    assert any("no_legal_advice_acknowledged" in error for error in validate_signoff_record("guide", record))


def test_missing_no_compliance_guarantee_acknowledgement_fails():
    record = valid_signoff_record("guide")
    record["no_compliance_guarantee_acknowledged"] = False
    assert any("no_compliance_guarantee_acknowledged" in error for error in validate_signoff_record("guide", record))


def test_synthetic_review_accepted_as_sufficient_fails():
    record = valid_signoff_record("guide")
    record["synthetic_review_rejected_as_sufficient"] = False
    assert any("synthetic review must be explicitly rejected" in error for error in validate_signoff_record("guide", record))


def test_nr_1_controls_not_confirmed_fails():
    record = valid_signoff_record("guide")
    record["nr_1_controls_confirmed"] = False
    assert any("nr_1_controls_confirmed" in error for error in validate_signoff_record("guide", record))


def test_public_promise_not_blocked_fails():
    record = valid_signoff_record("guide")
    record["public_promise_remains_blocked"] = False
    assert any("public promise must remain blocked" in error for error in validate_signoff_record("guide", record))


def test_unsigned_record_fails():
    record = valid_signoff_record("guide")
    record["signed_by_named_human"] = False
    assert any("signed_by_named_human" in error for error in validate_signoff_record("guide", record))


def test_sccif_missing_ofsted_acknowledgements_fails():
    record = valid_signoff_record("sccif")
    record["no_ofsted_grade_prediction_acknowledged"] = False
    record["no_inspection_readiness_decision_acknowledged"] = False
    record["no_inspection_outcome_guarantee_acknowledged"] = False
    errors = validate_signoff_record("sccif", record)
    assert any("no_ofsted_grade_prediction_acknowledged" in error for error in errors)
    assert any("no_inspection_readiness_decision_acknowledged" in error for error in errors)
    assert any("no_inspection_outcome_guarantee_acknowledged" in error for error in errors)


def test_unknown_source_id_fails():
    record = valid_signoff_record("guide")
    record["source_id"] = "unknown_source_id"
    assert any("unknown source_id" in error for error in validate_signoff_record("guide", record))


def test_duplicate_source_id_fails():
    payload = {
        "schema_version": "orb-residential-named-source-signoff-v1",
        "artefact_kind": "completed_named_source_signoff",
        "template_only": False,
        "not_valid_signoff": False,
        "not_sufficient_for_live_wiring": False,
        "not_evidence_of_named_review": False,
        "signoffs": {
            "guide": valid_signoff_record("guide"),
            "regulations_2015": {
                **valid_signoff_record("regulations_2015"),
                "source_id": valid_signoff_record("guide")["source_id"],
            },
        },
    }
    assert any("duplicate source_id" in error for error in validate_signoff_artefact(payload))


def test_source_checksum_mismatch_fails():
    record = valid_signoff_record("regulations_2015")
    record["declared_source_checksum"] = "0" * 64
    assert any("declared_source_checksum does not match" in error for error in validate_signoff_record("regulations_2015", record))


def test_chunk_checksum_mismatch_fails():
    record = valid_signoff_record("guide")
    record["declared_chunk_checksum"] = "0" * 64
    assert any("declared_chunk_checksum does not match" in error for error in validate_signoff_record("guide", record))


def test_valid_example_record_passes_in_test_fixture_context():
    for source_type in ("guide", "regulations_2015", "sccif"):
        assert validate_signoff_record(source_type, valid_signoff_record(source_type)) == []


def test_signoff_alone_still_does_not_enable_live_wiring(signoff_gate, runtime_gate):
    evaluation = signoff_gate.evaluate_signoff_record("guide", valid_signoff_record("guide"))
    assert evaluation["signoff_complete"] is True
    assert evaluation["signoff_enables_live_wiring"] is False
    assert signoff_gate.live_wiring_allowed() is False
    assert runtime_gate.live_source_grounded_answers_enabled() is False
    assert runtime_gate.hard_live_enablement_block_active() is True


def test_template_file_validation_passes():
    assert validate_template_file() == []


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


def test_no_frontend_or_os_assistant_files_changed(signoff_gate):
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "frontend/",
        "frontend-next",
        "orb_voice",
        "assistant_routes",
    )
    source = SIGNOFF_GATE_PATH.read_text(encoding="utf-8")
    for marker in forbidden:
        assert marker not in source
    summary = signoff_gate.governance_summary()
    assert summary["route_frontend_or_os_assistant_files_changed"] is False
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True
