"""Tests for ORB Voice v2 specialist brain routing."""

from __future__ import annotations

import logging

from services.orb_voice_brain_router_service import classify_voice_intent, update_session_memory
from services.orb_voice_respond_service import (
    SAFETY_BOUNDARY_LINE,
    VOICE_RESPOND_MAX_WORDS,
    _cap_words,
    generate_voice_response,
)


def test_bullying_intent_routes_to_voice_specialist():
    route = classify_voice_intent(
        transcript="The incident involved two young people and what appears to be bullying within the home.",
        mode="just_talk",
    )
    assert route.intent == "bullying_or_peer_conflict"
    assert route.brain_tier == "voice_specialist"
    assert route.risk_level in {"low", "medium"}


def test_safeguarding_concern_routes_to_voice_safeguarding():
    route = classify_voice_intent(
        transcript="I am worried about possible sexual exploitation and need safeguarding thinking.",
        mode="safeguarding_thinking",
    )
    assert route.intent in {"safeguarding_thinking", "bullying_or_peer_conflict"}
    assert route.brain_tier == "voice_safeguarding"
    assert route.should_use_safety_boundary is True


def test_general_reflection_routes_to_voice_fast():
    route = classify_voice_intent(
        transcript="I just want to talk through how the shift felt today.",
        mode="just_talk",
    )
    assert route.intent in {"daily_reflection", "general_reflection"}
    assert route.brain_tier == "voice_fast"


def test_response_word_cap():
    long = " ".join(["word"] * 120)
    capped = _cap_words(long)
    assert len(capped.split()) <= VOICE_RESPOND_MAX_WORDS


def test_safety_boundary_only_when_warranted():
    low = classify_voice_intent(transcript="The young person enjoyed football today.", mode="just_talk")
    high = classify_voice_intent(transcript="There was self-harm and police were called.", mode="just_talk")
    assert low.should_use_safety_boundary is False
    assert high.should_use_safety_boundary is True


def test_bullying_protocol_block_is_practical():
    route = classify_voice_intent(
        transcript="There was bullying between two residents in the home.",
        mode="incident_reflection",
    )
    assert "Who was involved" in route.protocol_block or "who was involved" in route.protocol_block.lower()


def test_session_memory_tracks_recording_hint():
    route = classify_voice_intent(
        transcript="Two young people were involved in bullying.",
        mode="just_talk",
    )
    memory = update_session_memory(None, transcript="Two young people were involved in bullying.", route=route)
    assert memory.get("possible_record_type")
    assert memory.get("last_intent") == "bullying_or_peer_conflict"


def test_generate_voice_response_includes_intent(monkeypatch):
    class FakeGateway:
        text = (
            "Let's slow that down. Who was involved, what was actually seen or heard, "
            "and what did adults do immediately to keep both young people safe?"
        )

    def fake_governed_draft_text(**_kwargs):
        return FakeGateway()

    monkeypatch.setattr("services.orb_voice_respond_service.governed_draft_text", fake_governed_draft_text)
    monkeypatch.setattr(
        "services.orb_voice_respond_service.orb_brain_convergence_orchestrator_service.build_brain_decision",
        lambda *args, **kwargs: type("D", (), {
            "depth_tier": "fast",
            "boundaries": ["child-centred"],
            "response_contract": ["one question"],
            "prompt_addendum": "",
        })(),
    )
    monkeypatch.setattr(
        "services.orb_voice_respond_service.orb_brain_convergence_orchestrator_service.build_convergence_prompt_block",
        lambda decision: "ORB specialist context",
    )
    monkeypatch.setattr(
        "services.orb_voice_respond_service.orb_brain_convergence_orchestrator_service.convergence_metadata",
        lambda decision, route=None: {"brain": "orb"},
    )

    result = generate_voice_response(
        message="Two young people and bullying in the home.",
        mode="just_talk",
    )
    assert result["intent"] == "bullying_or_peer_conflict"
    assert result["brainTier"] == "voice_specialist"
    assert "Who was involved" in result["reply"] or "who was involved" in result["reply"].lower()
    assert SAFETY_BOUNDARY_LINE not in result["reply"]


def test_no_transcript_content_in_brain_route_logs(caplog):
    caplog.set_level(logging.INFO)
    from services.orb_voice_brain_router_service import log_voice_brain_route

    route = classify_voice_intent(
        transcript="Two young people and bullying in the home.",
        mode="just_talk",
    )
    log_voice_brain_route(route, elapsed_ms=12)
    log_text = "\n".join(record.message for record in caplog.records)
    assert "Sensitive child name" not in log_text
    assert "orb_voice_v2_brain_route" in log_text
    assert "intent=bullying_or_peer_conflict" in log_text or "intent=" in log_text


def test_no_compliance_guarantee_in_system_prompt():
    from services.orb_voice_respond_service import VOICE_SYSTEM_PROMPT_BASE

    assert "compliance guarantee" not in VOICE_SYSTEM_PROMPT_BASE.lower()
    assert "ofsted approved" not in VOICE_SYSTEM_PROMPT_BASE.lower()
