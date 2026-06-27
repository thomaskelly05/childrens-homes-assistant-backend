from __future__ import annotations

import pytest
from fastapi import HTTPException

from services import orb_ai_abuse_guard_service as guard


@pytest.fixture(autouse=True)
def _reset():
    guard.reset_daily_counters_for_tests()
    yield
    guard.reset_daily_counters_for_tests()


def test_prompt_length_limit():
    with pytest.raises(HTTPException) as exc:
        guard.enforce_prompt_length("x" * (guard.MAX_PROMPT_CHARS + 1), user_id=1)
    assert exc.value.status_code == 400
    assert exc.value.detail["code"] == "prompt_too_long"


def test_comparison_length_limit():
    with pytest.raises(HTTPException) as exc:
        guard.enforce_comparison_text_length("x" * (guard.MAX_COMPARISON_TEXT_CHARS + 1), user_id=1)
    assert exc.value.detail["code"] == "comparison_too_long"


def test_daily_ai_call_guard():
    original_limit = guard.DAILY_AI_CALLS_PER_USER
    original_max_calls = guard._daily_counter.max_calls
    try:
        guard.DAILY_AI_CALLS_PER_USER = 2
        guard._daily_counter.max_calls = 2
        guard.enforce_daily_ai_call_budget(99)
        guard.enforce_daily_ai_call_budget(99)
        with pytest.raises(HTTPException) as exc:
            guard.enforce_daily_ai_call_budget(99)
        assert exc.value.detail["code"] == "daily_ai_limit"
    finally:
        guard.DAILY_AI_CALLS_PER_USER = original_limit
        guard._daily_counter.max_calls = original_max_calls


def test_policy_snapshot_has_limits():
    snap = guard.policy_snapshot()
    assert snap["max_prompt_chars"] > 0
    assert snap["max_streaming_seconds"] > 0
