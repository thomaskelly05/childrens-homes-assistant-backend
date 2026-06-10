"""Tests for compact deterministic daily-note and simple template responses."""

from __future__ import annotations

import re

from services.orb_execution_policy_service import (
    DAILY_NOTE_DETERMINISTIC_ANSWER,
    orb_execution_policy_service,
)
from services.orb_final_answer_contract_validator_service import validate_final_answer_contract


SIMPLE_DAILY_NOTE_PROMPTS = (
    "Help me write a daily note",
    "Give me a daily note structure",
    "Help me write a handover",
    "Give me a key-work template",
    "What should I include in a manager oversight note?",
)


def test_daily_note_prompt_uses_deterministic_execution():
    for prompt in ("Help me write a daily note", "Give me a daily note structure"):
        policy = orb_execution_policy_service.resolve(prompt)
        assert policy.execution_policy in {"deterministic_only", "internal_template_plus_validator"}
        assert policy.openai_allowed is False
        det = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
        assert det is not None
        assert det.get("no_llm") is True


def test_daily_note_returns_concise_structure_and_invitation():
    det = orb_execution_policy_service.try_deterministic_answer("Help me write a daily note")
    answer = det["answer"]
    assert "paste your rough notes" in answer.lower()
    assert "date/time" in answer.lower()
    assert "child's voice" in answer.lower()
    assert "what this means in practice" not in answer.lower()
    assert len(answer.split()) < 120


def test_daily_note_does_not_invent_examples():
    det = orb_execution_policy_service.try_deterministic_answer("Help me write a daily note")
    answer = det["answer"].lower()
    assert not re.search(r"\b(jamie|sarah|emma|liam|he was|she was|they were)\b", answer)


def test_daily_note_structure_matches_expected_headings():
    answer = DAILY_NOTE_DETERMINISTIC_ANSWER.lower()
    for heading in (
        "date/time",
        "young person",
        "mood/presentation",
        "what happened",
        "child's voice",
        "staff support",
        "outcome",
        "follow-up",
    ):
        assert heading in answer


def test_simple_template_prompts_avoid_openai():
    for prompt in SIMPLE_DAILY_NOTE_PROMPTS:
        policy = orb_execution_policy_service.resolve(prompt)
        assert policy.openai_allowed is False, prompt
        det = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
        assert det is not None, prompt


def test_daily_note_compact_answer_passes_validation():
    det = orb_execution_policy_service.try_deterministic_answer("Help me write a daily note")
    result = validate_final_answer_contract(
        det["answer"],
        contract_family="daily_record",
        source_text="Help me write a daily note",
    )
    assert "what this means in practice" not in result["sanitized_answer"].lower()
    assert not any("what this means in practice" in p for p in result["forbidden_patterns"])
