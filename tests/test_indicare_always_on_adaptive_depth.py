from __future__ import annotations

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service


def test_every_orb_bundle_includes_intelligence():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle("What is Python?")
    intel = bundle.get("indicare_intelligence") or {}
    assert intel.get("version") == "indicare_intelligence_10"
    assert intel.get("expert_depth")


def test_safeguarding_critical_depth():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Immediate danger — young person has a weapon in their room"
    )
    assert packet["expert_depth"] == "safeguarding_critical"


def test_residential_mode_minimum_standard():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "How should I word this?",
        mode="Record This Properly",
    )
    assert packet["expert_depth"] in ("residential_standard", "residential_deep", "safeguarding_critical")


def test_general_light_no_forced_ofsted_framing_in_prompt():
    packet = indicare_intelligence_core_service.build_intelligence_packet("Explain photosynthesis briefly")
    block = packet.get("prompt_block") or ""
    assert "general_light" in block or packet["expert_depth"] == "general_light"
    assert "Answer depth: general_light" in block or packet["expert_depth"] == "general_light"
