"""Q1.3 — Live ORB adult-facing recording contract enforcement tests."""

from __future__ import annotations

import asyncio

import pytest

from assistant.knowledge.adult_identity_language import sanitize_visible_final_answer
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_recording_output_contract_service import (
    answer_uses_legacy_recording_scaffold,
    enforce_live_recording_contract_answer,
    has_recording_contract_sections,
)
from services.orb_residential_finalization_service import finalize_orb_residential_answer
from services.orb_therapeutic_language_contract_service import build_safe_residential_scenario_scaffold
from tests.test_orb_recording_output_contract_q1 import (
    REG_A_PROMPT,
    REG_B_PROMPT,
    SELF_HARM_WRITE_PROMPT,
)

_LEGACY_MARKERS = (
    "what is known",
    "what to clarify",
    "recording wording scaffold",
)


def _assert_live_recording_contract(answer: str) -> None:
    lower = answer.lower()
    assert lower.lstrip().startswith("## draft record") or lower.startswith("draft record")
    assert has_recording_contract_sections(answer)
    for marker in _LEGACY_MARKERS:
        assert marker not in lower
    assert "felt record the young person" not in lower
    assert "the key is to record the behaviour without blame" not in lower
    assert "before you use this" not in lower
    assert answer.rstrip()[-1] in ".]" or "safer" in lower[-40:]


async def _live_adult_facing_answer(prompt: str) -> tuple[str, dict]:
    result = await orb_converged_general_assistant_service.answer(
        prompt,
        mode="Ask ORB",
        raw_user_message=prompt,
    )
    packet = indicare_intelligence_core_service.build_intelligence_packet(prompt, mode="Ask ORB")
    return finalize_orb_residential_answer(
        str(result.get("answer") or ""),
        user_input=prompt,
        indicare_intelligence=packet,
        mode="Ask ORB",
        sanitize_closer=orb_grounded_answer_style_service.sanitize_high_attention_closer,
    )


@pytest.mark.asyncio
async def test_live_route_daily_record_after_contact_uses_q1_contract():
    answer, meta = await _live_adult_facing_answer(REG_A_PROMPT)
    _assert_live_recording_contract(answer)
    assert "staff gave" in answer.lower()
    assert "the adult gave" not in answer.lower()
    assert "manager" not in answer.lower() or "pattern" in answer.lower() or "concern" in answer.lower()


@pytest.mark.asyncio
async def test_live_route_screen_time_incident_uses_q1_contract():
    answer, _meta = await _live_adult_facing_answer(REG_B_PROMPT)
    _assert_live_recording_contract(answer)
    assert "Staff" in answer or "staff" in answer.lower()
    assert "the adult members present" not in answer.lower()
    assert "articulate their experience" not in answer.lower()
    assert "encouraged to express their thoughts and emotions" not in answer.lower()
    for fact in ("screen", "chair", "bedroom", "safe"):
        assert fact in answer.lower()


@pytest.mark.asyncio
async def test_stream_route_daily_record_uses_deterministic_q1_contract():
    meta: dict = {}
    chunks: list[str] = []
    async for delta in orb_general_assistant_service.stream_answer(
        REG_A_PROMPT,
        mode="Ask ORB",
        raw_user_message=REG_A_PROMPT,
        stream_meta=meta,
    ):
        chunks.append(delta)
    answer = "".join(chunks)
    packet = indicare_intelligence_core_service.build_intelligence_packet(REG_A_PROMPT, mode="Ask ORB")
    final, _ = finalize_orb_residential_answer(
        answer,
        user_input=REG_A_PROMPT,
        indicare_intelligence=packet,
        mode="Ask ORB",
        sanitize_closer=orb_grounded_answer_style_service.sanitize_high_attention_closer,
    )
    _assert_live_recording_contract(final)
    assert meta.get("tools_used") == ["orb_execution_policy_deterministic"]


def test_enforce_live_recording_contract_replaces_legacy_scaffold():
    legacy = build_safe_residential_scenario_scaffold(REG_A_PROMPT)
    assert answer_uses_legacy_recording_scaffold(legacy)
    enforced, meta = enforce_live_recording_contract_answer(legacy, REG_A_PROMPT)
    assert meta.get("live_recording_contract_enforced") is True
    _assert_live_recording_contract(enforced)


def test_sanitize_visible_preserves_q1_daily_record_sections():
    legacy = build_safe_residential_scenario_scaffold(REG_B_PROMPT)
    enforced, _ = enforce_live_recording_contract_answer(legacy, REG_B_PROMPT)
    cleaned = sanitize_visible_final_answer(enforced, source_text=REG_B_PROMPT)
    _assert_live_recording_contract(cleaned)


@pytest.mark.asyncio
async def test_self_harm_write_prompt_still_bypasses_live_recording_contract():
    enforced, meta = enforce_live_recording_contract_answer(
        build_safe_residential_scenario_scaffold(SELF_HARM_WRITE_PROMPT),
        SELF_HARM_WRITE_PROMPT,
    )
    assert meta.get("live_recording_contract_enforced") is not True
    result = await orb_general_assistant_service.answer(
        SELF_HARM_WRITE_PROMPT,
        mode="Ask ORB",
        raw_user_message=SELF_HARM_WRITE_PROMPT,
    )
    tools = result.get("tools_used") or []
    assert "orb_execution_policy_deterministic" not in tools or not has_recording_contract_sections(
        str(result.get("answer") or "")
    )
