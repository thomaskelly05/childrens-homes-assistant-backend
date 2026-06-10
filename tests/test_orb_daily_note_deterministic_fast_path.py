"""Daily note deterministic fast path tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service


DAILY_NOTE_PROMPT = "Help me write a daily note"


def test_daily_note_deterministic_policy():
    policy = orb_execution_policy_service.resolve(DAILY_NOTE_PROMPT, mode="Ask ORB")
    assert policy.selected_contract == "daily_record"
    assert policy.execution_policy in {"deterministic_only", "internal_template_plus_validator"}
    assert policy.openai_allowed is False
    assert policy.embeddings_allowed is False
    assert policy.scenario_bank_allowed is False


@pytest.mark.asyncio
async def test_daily_note_does_not_call_openai():
    with patch(
        "services.ai_model_router_service.ai_model_router_service.complete_with_routing"
    ) as mock_llm:
        result = await orb_general_assistant_service.answer(
            DAILY_NOTE_PROMPT,
            mode="Ask ORB",
            raw_user_message=DAILY_NOTE_PROMPT,
        )
        mock_llm.assert_not_called()
        assert result.get("no_llm") is True


def test_daily_note_bundle_skips_embeddings_for_simple_contract():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(DAILY_NOTE_PROMPT, mode="Ask ORB")
    assert bundle.get("embedding_calls") == 0
    assert bundle.get("simple_standard_contract") is True


def test_daily_note_answer_invites_rough_notes():
    deterministic = orb_execution_policy_service.try_deterministic_answer(DAILY_NOTE_PROMPT)
    assert deterministic is not None
    answer = deterministic["answer"].lower()
    assert "paste" in answer
    assert "rough notes" in answer or "structure" in answer


def test_daily_note_answer_does_not_invent_facts():
    deterministic = orb_execution_policy_service.try_deterministic_answer(DAILY_NOTE_PROMPT)
    assert deterministic is not None
    answer = deterministic["answer"].lower()
    assert "jamie" not in answer
    assert "breakfast" not in answer or "paste" in answer
    assert "at 3pm" not in answer
    assert "staff member" not in answer or "staff support" in answer


def test_daily_note_minimal_prompt_chars():
    deterministic = orb_execution_policy_service.try_deterministic_answer(DAILY_NOTE_PROMPT)
    assert deterministic is not None
    assert len(deterministic["answer"]) < 1200


@pytest.mark.asyncio
async def test_daily_note_fast_response():
    with patch(
        "services.ai_model_router_service.ai_model_router_service.complete_with_routing"
    ):
        result = await orb_general_assistant_service.answer(
            DAILY_NOTE_PROMPT,
            mode="Ask ORB",
            raw_user_message=DAILY_NOTE_PROMPT,
        )
        telemetry = (result.get("context_used") or {}).get("execution_telemetry") or {}
        assert telemetry.get("openai_called") is False
        assert telemetry.get("embeddings_called") is False
