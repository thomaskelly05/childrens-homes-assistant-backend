from __future__ import annotations

from assistant.user_memory_policy import (
    assess_memory_candidates,
    build_memory_prompt_block,
    serialise_memory_policy_result,
)


def test_memory_policy_accepts_safe_user_preferences():
    result = assess_memory_candidates(
        [
            {
                "key": "preferred_format",
                "value": "Structured bullet points",
                "reason": "User prefers concise operational summaries.",
            },
            {
                "key": "role",
                "value": "Registered Manager",
            },
        ]
    )

    assert len(result.safe_to_store) == 2
    assert result.rejected == []


def test_memory_policy_rejects_child_or_os_specific_content():
    result = assess_memory_candidates(
        [
            {
                "key": "preferred_format",
                "value": "Remember child incident [incident:44] and safeguarding details.",
            }
        ]
    )

    assert result.safe_to_store == []
    assert result.rejected != []
    assert "memory_candidate_contains_os_or_child_specific_content" in result.warnings


def test_memory_policy_rejects_unknown_keys():
    result = assess_memory_candidates(
        [
            {
                "key": "child_name",
                "value": "Example Child",
            }
        ]
    )

    assert result.safe_to_store == []
    assert "memory_key_not_allowed" in result.warnings


def test_memory_prompt_block_contains_safe_preferences_only():
    prompt_block = build_memory_prompt_block(
        {
            "preferred_format": "Structured reports",
            "role": "Responsible Individual",
            "unsafe": "[incident:44]",
        }
    )

    assert "SAFE USER MEMORY CONTEXT" in prompt_block
    assert "preferred_format" in prompt_block
    assert "[incident:44]" not in prompt_block


def test_serialised_memory_policy_contains_safe_and_rejected_items():
    result = assess_memory_candidates(
        [
            {
                "key": "preferred_language",
                "value": "British English",
            },
            {
                "key": "child_name",
                "value": "Unsafe",
            },
        ]
    )

    payload = serialise_memory_policy_result(result)

    assert payload["safe_to_store"] != []
    assert payload["rejected"] != []
