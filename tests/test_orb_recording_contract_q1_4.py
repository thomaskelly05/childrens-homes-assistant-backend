"""Q1.4 — Recording output polish and template routing."""

from __future__ import annotations

import pytest

from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_recording_output_contract_service import (
    answer_has_mechanical_yp_sentence_chain,
    build_daily_record_contract_answer,
    build_incident_reflection_contract_answer,
    has_recording_contract_sections,
    recording_contract_blocked_by_safeguarding,
    try_build_recording_contract_answer,
)
from tests.test_orb_recording_output_contract_q1 import (
    ACTIVE_MISSING_WRITE_PROMPT,
    DISCLOSURE_WRITE_PROMPT,
    REG_A_PROMPT,
    REG_B_PROMPT,
    SELF_HARM_WRITE_PROMPT,
)

_LEGACY_MARKERS = (
    "what is known",
    "what to clarify",
    "recording wording scaffold",
    "i'm treating this as",
    "the key is to record the behaviour without blame",
)

_UNSUPPORTED_RESTORE = (
    "articulate their experience",
    "expressed their thoughts and emotions",
    "staff validated their feelings",
)


def _assert_q1_shape(answer: str) -> None:
    lower = answer.lower()
    assert lower.lstrip().startswith("## draft record") or lower.startswith("draft record")
    assert has_recording_contract_sections(answer)
    for marker in _LEGACY_MARKERS:
        assert marker not in lower


def test_reg_b_incident_narrative_flows_naturally():
    answer = build_incident_reflection_contract_answer(REG_B_PROMPT)
    _assert_q1_shape(answer)
    lower = answer.lower()
    assert "after being told they could not have extra screen time" in lower
    assert "[young person] shouted at staff, pushed a chair over and went to their bedroom" in lower
    assert not answer_has_mechanical_yp_sentence_chain(answer)
    for fact in ("screen", "shout", "chair", "bedroom", "safe", "restorative"):
        assert fact in lower
    for phrase in _UNSUPPORTED_RESTORE:
        assert phrase not in lower
    assert "the adult members present" not in lower


def test_reg_b_uses_short_placeholders():
    answer = build_incident_reflection_contract_answer(REG_B_PROMPT)
    assert "[Add exact words if known.]" in answer
    assert "[Add outcome or follow-up.]" in answer
    assert "exact words here if they shared them" not in answer.lower()


def test_reg_a_daily_record_still_works_with_q1_sections():
    answer = build_daily_record_contract_answer(REG_A_PROMPT)
    _assert_q1_shape(answer)
    lower = answer.lower()
    assert "following family contact" in lower
    assert "evening meal" in lower
    assert "staff gave" in lower
    assert "manager" not in lower or "pattern" in lower or "concern" in lower
    assert "[Add exact words if known.]" in answer


def test_reg_a_avoids_unnecessary_mechanical_yp_repetition():
    answer = build_daily_record_contract_answer(REG_A_PROMPT)
    assert not answer_has_mechanical_yp_sentence_chain(answer)


@pytest.mark.parametrize(
    "prompt",
    [SELF_HARM_WRITE_PROMPT, DISCLOSURE_WRITE_PROMPT, ACTIVE_MISSING_WRITE_PROMPT],
)
def test_safeguarding_prompts_still_block_q1_template(prompt: str):
    policy = orb_execution_policy_service.resolve(prompt)
    assert recording_contract_blocked_by_safeguarding(
        prompt,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    )
    assert try_build_recording_contract_answer(
        prompt,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    ) is None
