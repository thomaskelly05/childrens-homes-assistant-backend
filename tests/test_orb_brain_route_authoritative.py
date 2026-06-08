"""ORB brain route — server-authoritative classification and frontend hint parity."""

from __future__ import annotations

from pathlib import Path

import pytest

from services.orb_brain_route_service import (
    decide_orb_brain_route,
    extract_user_message,
    orb_brain_route_service,
)
from services.orb_knowledge_retrieval_service import LIVE_LOOKUP_NOTE, orb_knowledge_retrieval_service
from services.orb_standalone_brain_service import orb_standalone_brain_service

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_extract_user_message_strips_legacy_routing_block():
    raw = "[ORB brain routing]\nsource: chat\nroute: general_assistant\n\nWhat is photosynthesis?"
    assert extract_user_message(raw) == "What is photosynthesis?"


def test_general_prompt_defaults_to_general_assistant():
    decision = decide_orb_brain_route("Help me plan a birthday party.", mode="Ask ORB")
    assert decision.route == "general_assistant"
    assert decision.dual_brain_route == "general_knowledge"
    assert decision.routing_hint == "general_assistant_brain"


def test_residential_prompt_enriches_specialist():
    decision = decide_orb_brain_route(
        "What should I record when a young person returns from missing?",
        mode="Ask ORB",
    )
    assert decision.route == "residential_specialist"
    assert decision.dual_brain_route == "residential_specialist"


def test_jamie_shorthand_prompt_activates_residential_not_general():
    message = "Jamie kicked off today after family time"
    decision = decide_orb_brain_route(message, mode="Ask ORB", source_surface="chat")
    frame = orb_standalone_brain_service.frame(message, mode="Ask ORB")
    assert frame.dual_brain_route == "residential_specialist"
    assert decision.route in {"residential_specialist", "document_workspace"}
    assert decision.route != "general_assistant"
    assert "recording_quality_brain" in frame.active_brains


def test_incident_report_prompt_routes_document_workspace_not_live_lookup():
    message = (
        "Jamie was kicking off today following family contact, help me to write the incident report"
    )
    decision = decide_orb_brain_route(message, mode="Ask ORB", source_surface="chat")
    assert decision.route in {"document_workspace", "residential_specialist"}
    assert decision.route != "live_lookup"
    frame = orb_standalone_brain_service.frame(message, mode="Ask ORB")
    assert frame.dual_brain_route == "residential_specialist"


def test_live_lookup_routes_safely():
    decision = decide_orb_brain_route("What is the weather in Newcastle?", mode="Ask ORB")
    assert decision.route == "live_lookup"
    classification = orb_knowledge_retrieval_service.classify_query("What is the weather in Newcastle?")
    assert classification["live_lookup_note"] == LIVE_LOOKUP_NOTE


def test_client_route_hint_cannot_override_backend_route():
    decision = decide_orb_brain_route(
        "Help me plan a birthday party.",
        mode="Ask ORB",
        client_route_hint="residential_specialist",
    )
    assert decision.route == "general_assistant"
    assert decision.client_hint_ignored is True


def test_voice_and_chat_route_identically_for_same_prompt():
    message = "Explain quantum computing simply."
    voice = decide_orb_brain_route(message, mode="Ask ORB", source_surface="voice")
    chat = decide_orb_brain_route(message, mode="Ask ORB", source_surface="chat")
    assert voice.route == chat.route
    assert voice.dual_brain_route == chat.dual_brain_route


def test_dictate_surface_routes_document_workspace():
    decision = decide_orb_brain_route(
        "Young person settled after tea.",
        mode="Ask ORB",
        source_surface="dictate",
        note_type="daily_record",
    )
    assert decision.route == "document_workspace"


def test_canonical_route_service_is_singleton():
    assert orb_brain_route_service.decide_orb_brain_route is decide_orb_brain_route


def test_frontend_sends_structured_routing_not_message_body():
    router = _read("lib/orb/orb-brain-router.ts")
    assert "source_surface" in router
    assert "client_route_hint" in router
    assert "[ORB brain routing]" not in router


def test_standalone_routes_expose_brain_route_endpoint():
    routes = (REPO_ROOT / "routers" / "orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "/brain-route" in routes
    assert "orb_brain_route_service" in routes


@pytest.mark.parametrize(
    "message",
    [
        "asdkjhasdkjh random unclear question",
        "Tell me something interesting about music theory",
    ],
)
def test_unknown_intent_falls_back_to_general(message: str):
    frame = orb_standalone_brain_service.frame(message, mode="Ask ORB")
    decision = decide_orb_brain_route(message, mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    assert decision.route == "general_assistant"
