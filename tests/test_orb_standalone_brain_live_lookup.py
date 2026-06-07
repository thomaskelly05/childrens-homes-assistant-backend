from __future__ import annotations

import pytest

from services.orb_knowledge_retrieval_service import LIVE_LOOKUP_NOTE, orb_knowledge_retrieval_service
from services.orb_standalone_brain_service import orb_standalone_brain_service


def test_general_question_routes_to_general_knowledge_brain():
    frame = orb_standalone_brain_service.frame("Explain how email threading works", mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    assert "general_knowledge_brain" in frame.active_brains


def test_residential_question_routes_to_specialist_brain():
    frame = orb_standalone_brain_service.frame(
        "How should I record a Regulation 44 visit concern?",
        mode="Ask ORB",
    )
    assert frame.dual_brain_route == "residential_specialist"
    assert "residential_specialist_brain" in frame.active_brains


def test_live_local_question_routes_to_live_lookup_extension():
    frame = orb_standalone_brain_service.frame("What is the weather in Whitley Bay today?", mode="Ask ORB")
    assert frame.dual_brain_route == "live_lookup"
    assert "live_lookup_brain" in frame.active_brains
    assert any("Do not invent" in item for item in frame.response_contract)


def test_live_lookup_classification_sets_safe_unavailable_note():
    classification = orb_knowledge_retrieval_service.classify_query("Latest sports scores for Newcastle")
    assert classification["live_lookup_intent"] is True
    assert classification["live_lookup_note"] == LIVE_LOOKUP_NOTE
    assert classification["routing_hint"] == "live_lookup_extension"
