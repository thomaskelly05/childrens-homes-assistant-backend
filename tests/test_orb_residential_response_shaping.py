"""ORB Residential response-shaping pass — concise recording support and merge formatting."""

from __future__ import annotations

import re

import pytest

from services.orb_action_engine_service import orb_action_engine_service
from services.orb_fast_opening_service import (
    _RESIDENTIAL_DEEP_DEFAULT_OPENING,
    ensure_fast_opening_spacing,
    merge_stream_answer,
)
from services.orb_therapeutic_language_contract_service import (
    build_residential_scenario_prompt_block,
    build_safe_residential_scenario_scaffold,
    is_short_residential_scenario,
    response_meets_residential_scenario_contract,
    states_dysregulation_as_unsupported_fact,
    treats_shorthand_as_clarification_needed,
    uses_weak_generic_phrasing,
)
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_brain_route_service import decide_orb_brain_route

SOPHIE_SHORT = "Sophie refused school and kicked off this morning"
JAMIE_SHORT = "Jamie played up after contact"
GENERAL_QUANTUM = "Explain quantum computing simply"


def _assert_no_joined_opening_bug(text: str) -> None:
    assert "way.Immediate" not in text
    assert "provided.Immediate" not in text
    assert not re.search(r"on the way\.[A-Z#]", text)
    assert not re.search(r"provided\.[A-Z#]", text)


def _assert_concise_residential_contract(scaffold: str, source: str) -> None:
    contract = response_meets_residential_scenario_contract(scaffold, source)
    assert contract["no_weak_generic_phrasing"], contract
    assert contract["shorthand_treated_correctly"], contract
    assert contract["includes_child_voice_prompt"], contract
    assert contract["includes_observable_prompt"], contract
    assert contract["includes_staff_response_prompt"], contract
    assert contract["includes_safeguarding_prompt"], contract
    assert contract["no_unsupported_dysregulation"], contract


# --- Fast opening merge ---


def test_ensure_fast_opening_spacing_fixes_way_immediate_join():
    broken = (
        "Start with what is safest and most practical right now — the full guidance is on the way."
        "Immediate Safety\nCheck everyone is safe."
    )
    fixed = ensure_fast_opening_spacing(broken)
    _assert_no_joined_opening_bug(fixed)
    assert "on the way.\n\nImmediate" in fixed


def test_ensure_fast_opening_spacing_fixes_provided_immediate_join():
    broken = (
        "I can help you record this safely. I'll only use what you've provided."
        "Immediate Safety"
    )
    fixed = ensure_fast_opening_spacing(broken)
    _assert_no_joined_opening_bug(fixed)
    assert "provided.\n\nImmediate" in fixed


def test_merge_stream_answer_inserts_paragraph_break_after_opening():
    opening = _RESIDENTIAL_DEEP_DEFAULT_OPENING
    model = "### Immediate Safety\nCheck everyone is safe."
    merged = merge_stream_answer(
        fast_opening=opening,
        model_answer=model,
        streamed_text=f"{opening}{model}",
    )
    _assert_no_joined_opening_bug(merged)
    assert merged.startswith(opening)
    assert "\n\n" in merged


def test_merge_stream_answer_replaces_generic_opening_when_model_substantial():
    opening = _RESIDENTIAL_DEEP_DEFAULT_OPENING
    model = (
        "First, check Jamie and others are safe.\n\n"
        "What is known:\n• Jamie was described as playing up.\n"
        "Recording wording scaffold: [add observable behaviour]."
    )
    merged = merge_stream_answer(
        fast_opening=opening,
        model_answer=model,
        streamed_text=f"{opening}\n\n{model}",
    )
    assert opening not in merged or merged.startswith("First, check")
    _assert_no_joined_opening_bug(merged)


# --- Short residential scenario detection ---


@pytest.mark.parametrize(
    "prompt",
    [
        SOPHIE_SHORT,
        JAMIE_SHORT,
        "Jamie kicked off after contact",
        "Sophie had a meltdown after a phone call",
        "Alex was attention seeking",
        "Sam refused meds",
        "Taylor was aggressive",
    ],
)
def test_short_residential_scenarios_detected(prompt: str):
    assert is_short_residential_scenario(prompt), prompt


def test_general_prompt_not_short_residential():
    assert not is_short_residential_scenario(GENERAL_QUANTUM)


# --- Sophie concise format ---


def test_sophie_short_scaffold_concise_recording_support():
    scaffold = build_safe_residential_scenario_scaffold(SOPHIE_SHORT)
    lowered = scaffold.lower()
    assert "first, check sophie" in lowered
    assert "kicked off" in lowered
    assert "final recording language" in lowered or "shorthand" in lowered
    assert "refused school" in lowered
    assert "what to clarify" in lowered
    assert "recording wording scaffold" in lowered
    assert "challenging moment" not in lowered
    assert "therapeutic interventions" not in lowered
    assert "it is essential" not in lowered
    _assert_concise_residential_contract(scaffold, SOPHIE_SHORT)


def test_sophie_scaffold_does_not_state_dysregulation_as_fact():
    scaffold = build_safe_residential_scenario_scaffold(SOPHIE_SHORT)
    assert not states_dysregulation_as_unsupported_fact(scaffold, SOPHIE_SHORT)
    assert "became emotionally dysregulated" not in scaffold.lower()


# --- Jamie concise format ---


def test_jamie_short_scaffold_concise_recording_support():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    lowered = scaffold.lower()
    assert "first, check jamie" in lowered
    assert "played up" in lowered
    assert "final recording language" in lowered or "shorthand" in lowered
    assert "after contact" in lowered
    assert "what to clarify" in lowered
    assert "recording wording scaffold" in lowered
    assert "challenging moment" not in lowered
    _assert_concise_residential_contract(scaffold, JAMIE_SHORT)


def test_jamie_scaffold_does_not_state_dysregulation_as_fact():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    assert not states_dysregulation_as_unsupported_fact(scaffold, JAMIE_SHORT)
    assert "became emotionally dysregulated" not in scaffold.lower()
    assert "jamie became emotionally dysregulated" not in scaffold.lower()


# --- Shorthand handling ---


def test_played_up_treated_as_shorthand_not_final_wording():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    assert treats_shorthand_as_clarification_needed(scaffold, JAMIE_SHORT)


def test_kicked_off_treated_as_shorthand_not_final_wording():
    scaffold = build_safe_residential_scenario_scaffold(SOPHIE_SHORT)
    assert treats_shorthand_as_clarification_needed(scaffold, SOPHIE_SHORT)


# --- Prompt block ---


def test_short_scenario_prompt_block_requests_concise_format():
    block = build_residential_scenario_prompt_block(JAMIE_SHORT).lower()
    assert "short residential scenario" in block
    assert "concise" in block
    assert "not a long essay" in block
    assert "therapeutic interventions" in block  # listed as forbidden


# --- General assistant unaffected ---


def test_general_prompt_remains_general_assistant():
    frame = orb_standalone_brain_service.frame(GENERAL_QUANTUM, mode="Ask ORB")
    decision = decide_orb_brain_route(GENERAL_QUANTUM, mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    assert decision.route == "general_assistant"
    assert not is_short_residential_scenario(GENERAL_QUANTUM)


# --- Action button prompts ---


def test_make_more_concise_action_requests_shorter_not_essay():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "make_more_concise",
        source_text=build_safe_residential_scenario_scaffold(JAMIE_SHORT),
    )
    lowered = prompt.lower()
    assert "shorter" in lowered
    assert "not another long essay" in lowered


def test_convert_to_recording_wording_uses_placeholders_prompt():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "convert_to_recording_wording",
        source_text=JAMIE_SHORT,
    )
    lowered = prompt.lower()
    assert "placeholder" in lowered
    assert "shorthand" in lowered
    assert "no invented" in lowered or "invented" in lowered


def test_convert_to_recording_wording_forbids_generic_phrases():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "convert_to_recording_wording",
        source_text=SOPHIE_SHORT,
    )
    assert "challenging moment" in prompt.lower()
    assert "therapeutic interventions" in prompt.lower()


# --- Language quality ---


def test_scaffold_avoids_forbidden_generic_phrases():
    for source in (SOPHIE_SHORT, JAMIE_SHORT):
        scaffold = build_safe_residential_scenario_scaffold(source)
        assert not uses_weak_generic_phrasing(scaffold), source
