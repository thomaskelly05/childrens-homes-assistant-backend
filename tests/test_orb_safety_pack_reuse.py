"""ORB safety pack audit — reuse existing assets for converged brain QA."""

from __future__ import annotations

import pytest

from services.orb_brain_visibility_service import (
    HIGH_RISK_ROLLOUT_SCENARIOS,
    evaluate_converged_route_qa,
    get_safety_pack_map,
)
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_mandatory_response_contract_service import MANDATORY_CONTRACTS
from services.orb_multi_scenario_detector_service import SCENARIO_SIGNATURES


def test_safety_pack_map_is_discovered_and_documents_assets():
    pack = get_safety_pack_map()
    assert pack["version"] == "orb-safety-pack-map-v1"
    assert pack["scenario_bank"]["gold_count"] >= 100
    assert pack["playbooks"]["count"] >= 27
    assert len(pack["mandatory_contracts"]["scenario_types"]) == len(SCENARIO_SIGNATURES)
    assert "/orb/standalone/conversation" in pack["converged_route"]["canonical_endpoints"]
    assert "tests/test_orb_brain_convergence_orchestrator.py" in pack["proving_tests"]
    assert pack["reuse_note"]


def test_no_duplicate_safety_pack_created():
    pack = get_safety_pack_map()
    assert "orb_expert_scenario_bank_service" in pack["scenario_bank"]["service"]
    assert "orb_mandatory_response_contract_service" in pack["mandatory_contracts"]["service"]
    assert pack["scenario_bank"]["gold_count"] == orb_expert_scenario_bank_service.gold_count()


@pytest.mark.parametrize("scenario", HIGH_RISK_ROLLOUT_SCENARIOS, ids=lambda s: s["id"])
def test_high_risk_rollout_scenario_triggers_converged_route(scenario: dict[str, str]):
    qa = evaluate_converged_route_qa(scenario["prompt"])
    assert scenario["expected_scenario_type"] in qa["scenario_types"]
    assert qa["standalone_boundary"] is True
    assert qa["response_contract"]
    assert qa["risk_level"] in {"low", "medium", "high", "critical"}
    markers = qa["validation_markers"].get(scenario["expected_scenario_type"]) or []
    contract = MANDATORY_CONTRACTS[scenario["expected_scenario_type"]]
    assert markers == list(contract.get("validation_markers") or [])


def test_converged_qa_harness_exposes_brain_decision_fields():
    qa = evaluate_converged_route_qa(
        "Returned after missing and smells of cannabis. Also allegation against staff."
    )
    for key in (
        "detected_topic",
        "risk_level",
        "multi_scenario",
        "scenario_types",
        "active_brains",
        "active_intelligence_layers",
        "response_contract",
        "standalone_boundary",
    ):
        assert key in qa
    assert qa["multi_scenario"] is True
    assert len(qa["scenario_types"]) >= 2


def test_safety_pack_documents_known_gaps():
    pack = get_safety_pack_map()
    gap_areas = {item["area"] for item in pack["gaps"]}
    assert "active_missing_only" in gap_areas
    assert "cannabis_smell_alone" in gap_areas
