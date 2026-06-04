from __future__ import annotations

from services.indicare_intelligence_core_service import indicare_intelligence_core_service


def test_capital_of_france_general_light():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "What is the capital of France?",
        mode="Ask ORB",
    )
    assert packet.get("expert_depth") == "general_light"
    assert packet.get("general_light_fast_path") is True
    assert packet.get("registered_home_domains") == []
    assert packet.get("gaps") == []


def test_shopping_list_general_light():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Write a shopping list for a picnic",
        mode="Ask ORB",
    )
    assert packet.get("expert_depth") == "general_light"


def test_photosynthesis_general_light():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Explain photosynthesis simply",
        mode="Ask ORB",
    )
    assert packet.get("expert_depth") == "general_light"
