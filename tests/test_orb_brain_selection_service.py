"""Tests for ORB brain selection engine (design phase — not wired to routes)."""

from __future__ import annotations

import pytest

from services.orb_brain_selection_service import (
    BrainSelectionResult,
    UserTierOverride,
    orb_brain_selection_service,
)


@pytest.mark.parametrize(
    ("prompt", "expected_tier"),
    [
        ("What does regulation 13 mean?", "quick"),
        ("Help me write a missing-from-care return record", "standard"),
        ("Create an Ofsted evidence map for missing-from-care practice", "deep"),
    ],
)
def test_brain_selection_spec_examples(prompt: str, expected_tier: str):
    result = orb_brain_selection_service.select_brain(prompt, mode="Ask ORB")
    assert isinstance(result, BrainSelectionResult)
    assert result.tier == expected_tier
    assert 0.0 < result.confidence <= 1.0
    assert result.reason
    assert result.recommended_route in {
        "conversation",
        "agent",
        "deep_research",
        "document_analysis",
    }


def test_safeguarding_critical_never_quick():
    result = orb_brain_selection_service.select_brain(
        "A young person disclosed sexual harm — what are the immediate steps?",
        mode="Ask ORB",
        user_selection=UserTierOverride.QUICK.value,
    )
    assert result.tier == "deep"
    assert result.expert_depth in ("residential_deep", "safeguarding_critical")


def test_restraint_recording_standard_not_deep():
    result = orb_brain_selection_service.select_brain(
        "How should I write a restraint record with no injury?",
        mode="Ask ORB",
    )
    assert result.tier == "standard"


def test_deep_research_agent_routes_deep():
    result = orb_brain_selection_service.select_brain(
        "Summarise guidance on education refusal",
        mode="Ask ORB",
        agent_type="deep_research",
    )
    assert result.tier == "deep"
    assert result.recommended_route in {"agent", "deep_research"}


def test_legacy_mapping_quick():
    result = orb_brain_selection_service.select_brain("Hello", mode="Ask ORB")
    if result.tier == "quick":
        assert result.prompt_tier == "fast"
        assert result.expert_depth == "general_light"
        assert result.agent_depth == "quick"


def test_legacy_mapping_deep():
    result = orb_brain_selection_service.select_brain(
        "Prepare a Reg 44 evidence pack for leadership oversight",
        mode="Ask ORB",
    )
    assert result.tier == "deep"
    assert result.prompt_tier == "deep"
    assert result.agent_depth == "deep"


def test_signals_include_classification():
    result = orb_brain_selection_service.select_brain(
        "What does regulation 13 mean?",
        mode="Ask ORB",
    )
    assert "classification_intents" in result.signals
    assert "legacy_prompt_tier" in result.signals
