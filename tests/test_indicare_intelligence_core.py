from __future__ import annotations

import pytest

from assistant.knowledge.orb_regression_test_bank import ORB_9_REGRESSION_SCENARIOS, get_scenario
from services.indicare_intelligence_core_service import indicare_intelligence_core_service


def test_intelligence_packet_version_and_required_fields():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Young person returned after missing and smells of cannabis."
    )
    assert packet["version"] == "indicare_intelligence_10"
    assert packet["orb_shell"] is True
    assert packet.get("expert_depth")
    assert 0 <= packet.get("care_relevance_score", -1) <= 100
    assert isinstance(packet.get("active_intelligence_layers"), list)
    assert isinstance(packet.get("active_brains"), list)
    assert packet.get("prompt_block")


@pytest.mark.parametrize("scenario_id", [s["scenario_id"] for s in ORB_9_REGRESSION_SCENARIOS])
def test_gold_scenarios_get_residential_depth(scenario_id: str):
    scenario = get_scenario(scenario_id)
    assert scenario is not None
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        scenario["prompt"],
        mode="Safeguarding Thinking",
        sequence_id=scenario.get("sequence_id"),
    )
    assert packet["expert_depth"] in (
        "residential_light",
        "residential_standard",
        "residential_deep",
        "safeguarding_critical",
    )
    assert packet.get("quality_gate_preview")
    assert packet.get("missingness_graph")


def test_non_care_general_prompt_is_general_light():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "What is the capital of France?"
    )
    assert packet["expert_depth"] == "general_light"
    assert packet["care_relevance_score"] < 35


def test_vague_care_prompt_not_general_light():
    packet = indicare_intelligence_core_service.build_intelligence_packet("What do I do?")
    assert packet["expert_depth"] != "general_light"
    assert packet["care_relevance_score"] >= 35


def test_learning_record():
    packet = indicare_intelligence_core_service.build_intelligence_packet("Help with a daily record")
    out = indicare_intelligence_core_service.record_learning(packet, prompt_text="Help with a daily record")
    assert out.get("recorded_at")
