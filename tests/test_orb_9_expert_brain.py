from __future__ import annotations

import pytest

from assistant.knowledge.orb_regression_test_bank import (
    ORB_9_REGRESSION_SCENARIOS,
    get_scenario,
    list_regression_scenarios,
)
from services.orb_expert_brain_orchestrator_service import orb_expert_brain_orchestrator_service
from services.orb_answer_quality_gate_service import orb_answer_quality_gate_service
from services.trusted_source_registry_service import trusted_source_registry_service
from services.orb_followup_learning_service import orb_followup_learning_service
from services.orb_ofsted_learning_adapter import orb_ofsted_learning_adapter


def test_trusted_registry_validates():
    errors = trusted_source_registry_service.validate_registry()
    assert not errors, errors


def test_trusted_registry_gold_sources_no_auto_apply():
    for src in trusted_source_registry_service.list_sources():
        if src.get("trust_tier") == "gold" and src.get("source_type") in (
            "statutory_guidance",
            "legislation",
            "inspection_framework",
        ):
            assert src.get("auto_apply_allowed") is False


def test_regression_bank_has_ten_scenarios():
    assert len(list_regression_scenarios()) == 10


@pytest.mark.parametrize("scenario_id", [s["scenario_id"] for s in ORB_9_REGRESSION_SCENARIOS])
def test_regression_scenario_packet_shape(scenario_id: str):
    scenario = get_scenario(scenario_id)
    assert scenario is not None
    packet = orb_expert_brain_orchestrator_service.build_context_packet(
        scenario["prompt"],
        mode="Safeguarding Thinking",
    )
    assert packet.get("version") == "orb_9"
    assert packet.get("expert_packet")
    assert packet.get("whole_child_lens")
    assert packet.get("missingness_graph")
    assert packet.get("quality_gate_preview")


@pytest.mark.parametrize("scenario_id", [s["scenario_id"] for s in ORB_9_REGRESSION_SCENARIOS])
def test_regression_scenario_check(scenario_id: str):
    scenario = get_scenario(scenario_id)
    assert scenario is not None
    result = orb_expert_brain_orchestrator_service.run_regression_check(scenario)
    assert result.get("scenario_id") == scenario_id
    assert not result.get("must_not_violations"), result.get("must_not_violations")
    assert result.get("passed") is True, result


def test_followup_missing_escalation_example():
    initial = "Young person returned after missing and smells of cannabis."
    follow = "Do I tell police?"
    out = orb_followup_learning_service.classify(initial, follow)
    assert "missing_escalation_clarity" in out["classifications"]


def test_quality_gate_blocks_grade_prediction():
    gate = orb_answer_quality_gate_service.evaluate_text(
        "Your home will be inadequate at inspection.",
        message="Ofsted tomorrow",
        risk_level="medium",
    )
    assert gate["passed"] is False
    assert "grade_prediction" in gate.get("critical_flags", [])


def test_ofsted_learning_adapter_rejects_non_official_url():
    out = orb_ofsted_learning_adapter.learn_from_report_text(
        provider_name="Example Home",
        report_url="https://example.com/report",
        report_text="Some text",
    )
    assert out.get("status") == "rejected"


def test_orchestrator_prompt_block_non_empty_for_missing():
    packet = orb_expert_brain_orchestrator_service.build_context_packet(
        "Missing 3 days, returned smelling of cannabis."
    )
    block = orb_expert_brain_orchestrator_service.build_prompt_block(packet)
    assert "ORB 9" in block
    assert len(block) > 100
