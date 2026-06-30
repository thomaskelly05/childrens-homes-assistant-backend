"""Q1.3.1 — Converged stream runtime keyword compatibility for live ORB chat."""

from __future__ import annotations

import inspect

import pytest

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_recording_output_contract_service import has_recording_contract_sections
from services.orb_residential_finalization_service import finalize_orb_residential_answer
from tests.test_orb_recording_output_contract_q1 import REG_A_PROMPT, REG_B_PROMPT

_STREAM_FAILURE_MARKERS = (
    "orb could not complete this response",
    "what is known",
    "what to clarify",
    "recording wording scaffold",
    "i'm treating this as",
    "the key is to record the behaviour without blame",
    "before you use this",
)


def _route_stream_kwargs(prompt: str) -> dict:
    brain_convergence = orb_brain_convergence_orchestrator_service.build_brain_decision(
        prompt,
        mode="Ask ORB",
    )
    execution_policy = orb_execution_policy_service.resolve(
        prompt,
        brain_convergence=brain_convergence.to_dict(),
        mode="Ask ORB",
    )
    return {
        "brain_convergence": brain_convergence.to_dict(),
        "execution_policy": execution_policy.to_dict(),
    }


def _assert_live_q1_stream_answer(answer: str, *, meta: dict) -> None:
    lower = answer.lower()
    assert lower.lstrip().startswith("## draft record") or lower.startswith("draft record")
    assert has_recording_contract_sections(answer)
    for marker in _STREAM_FAILURE_MARKERS:
        assert marker not in lower, f"unexpected marker: {marker!r}"
    assert meta.get("tools_used") == ["orb_execution_policy_deterministic"]


async def _converged_stream_final_answer(prompt: str) -> tuple[str, dict]:
    route_kwargs = _route_stream_kwargs(prompt)
    meta: dict = {}
    chunks: list[str] = []
    async for delta in orb_converged_general_assistant_service.stream_answer(
        prompt,
        mode="Ask ORB",
        raw_user_message=prompt,
        stream_meta=meta,
        brain_convergence=route_kwargs["brain_convergence"],
        execution_policy=route_kwargs["execution_policy"],
    ):
        chunks.append(delta)
    packet = indicare_intelligence_core_service.build_intelligence_packet(prompt, mode="Ask ORB")
    final, _ = finalize_orb_residential_answer(
        "".join(chunks),
        user_input=prompt,
        indicare_intelligence=packet,
        mode="Ask ORB",
        sanitize_closer=orb_grounded_answer_style_service.sanitize_high_attention_closer,
    )
    return final, meta


def test_converged_stream_answer_accepts_route_kwargs() -> None:
    params = inspect.signature(orb_converged_general_assistant_service.stream_answer).parameters
    assert "brain_convergence" in params
    assert "execution_policy" in params


@pytest.mark.asyncio
async def test_converged_stream_route_kwargs_do_not_raise_for_incident_prompt() -> None:
    answer, meta = await _converged_stream_final_answer(REG_B_PROMPT)
    _assert_live_q1_stream_answer(answer, meta=meta)
    lower = answer.lower()
    for fact in ("screen", "shout", "chair", "bedroom", "safe"):
        assert fact in lower
    assert "articulate their experience" not in lower
    assert "the adult members present" not in lower


@pytest.mark.asyncio
async def test_converged_stream_route_kwargs_do_not_raise_for_daily_contact_prompt() -> None:
    answer, meta = await _converged_stream_final_answer(REG_A_PROMPT)
    _assert_live_q1_stream_answer(answer, meta=meta)
    lower = answer.lower()
    assert "staff gave" in lower or "staff " in lower
    assert "contact" in lower
    assert "the adult gave" not in lower
