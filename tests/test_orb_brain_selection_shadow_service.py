"""Tests for ORB brain selection shadow mode."""

from __future__ import annotations

from services.orb_brain_selection_shadow_service import (
    attach_brain_selection_shadow,
    run_brain_selection_shadow,
)


def test_shadow_returns_tier_and_comparison_fields():
    shadow = run_brain_selection_shadow(
        "What does regulation 13 mean?",
        mode="Ask ORB",
        prompt_tier="fast",
        expert_depth="general_light",
        route="/orb/standalone/conversation",
    )
    assert shadow["shadow_mode"] is True
    assert shadow["tier"] in {"quick", "standard", "deep"}
    assert 0.0 < shadow["confidence"] <= 1.0
    assert shadow["reason"]
    assert shadow["live_prompt_tier"] == "fast"
    assert shadow["live_expert_depth"] == "general_light"
    assert "agrees_with_unified_tier_from_prompt_tier" in shadow
    assert "agrees_with_unified_tier_from_expert_depth" in shadow


def test_attach_brain_selection_shadow_merges_into_context_used():
    shadow = run_brain_selection_shadow(
        "Hello",
        mode="Ask ORB",
        prompt_tier="fast",
        expert_depth="general_light",
    )
    merged = attach_brain_selection_shadow({"mode": "Ask ORB"}, shadow)
    assert merged["mode"] == "Ask ORB"
    assert merged["brain_selection_shadow"]["tier"] == shadow["tier"]


def test_shadow_agrees_when_live_matches_selected_mapping():
    shadow = run_brain_selection_shadow(
        "How should I write a restraint record with no injury?",
        mode="Ask ORB",
        prompt_tier="residential",
        expert_depth="residential_standard",
    )
    if shadow["tier"] == "standard":
        assert shadow["selected_prompt_tier"] == "residential"
        assert shadow["agrees_with_prompt_tier"] is True
        assert shadow["agrees_with_unified_tier_from_prompt_tier"] is True
