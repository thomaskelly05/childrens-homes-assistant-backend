from __future__ import annotations

from assistant.multi_thread_continuity import (
    build_multi_thread_continuity,
    build_multi_thread_continuity_prompt_block,
    serialise_multi_thread_continuity,
)


def test_multi_thread_continuity_builds_prior_thread_summaries():
    current_thread = {
        "thread_id": "current-1",
        "messages": [
            {"role": "user", "content": "Continue the safeguarding review."}
        ],
    }

    prior_threads = [
        {
            "thread_id": "prior-1",
            "assistant_surface": "standalone",
            "messages": [
                {"role": "user", "content": "Help me build a handover workflow."}
            ],
            "memory_candidates": [
                {"key": "preferred_tone", "value": "professional"}
            ],
        }
    ]

    result = build_multi_thread_continuity(
        current_thread=current_thread,
        prior_threads=prior_threads,
        assistant_surface="standalone",
    )

    assert result.prior_threads != []
    assert result.safe_memory != {}


def test_multi_thread_continuity_skips_threads_with_different_surface():
    current_thread = {
        "thread_id": "current-1",
        "messages": [
            {"role": "user", "content": "Continue."}
        ],
    }

    prior_threads = [
        {
            "thread_id": "prior-os",
            "assistant_surface": "os_embedded",
            "messages": [
                {"role": "user", "content": "Child chronology review."}
            ],
        }
    ]

    result = build_multi_thread_continuity(
        current_thread=current_thread,
        prior_threads=prior_threads,
        assistant_surface="standalone",
    )

    assert result.prior_threads == []
    assert "skipped_thread_with_different_assistant_surface" in result.warnings


def test_multi_thread_continuity_prompt_block_contains_safe_memory():
    current_thread = {
        "thread_id": "current-1",
        "messages": [
            {"role": "user", "content": "Continue with governance dashboard work."}
        ],
        "memory_candidates": [
            {"key": "response_style", "value": "detailed"}
        ],
    }

    result = build_multi_thread_continuity(
        current_thread=current_thread,
        prior_threads=[],
        assistant_surface="standalone",
    )

    prompt_block = build_multi_thread_continuity_prompt_block(result)

    assert "MULTI-THREAD CONTINUITY CONTEXT" in prompt_block
    assert "Safe user preferences" in prompt_block


def test_serialised_multi_thread_continuity_contains_current_thread():
    current_thread = {
        "thread_id": "current-1",
        "messages": [
            {"role": "user", "content": "Continue the review."}
        ],
    }

    result = build_multi_thread_continuity(
        current_thread=current_thread,
        prior_threads=[],
        assistant_surface="standalone",
    )

    payload = serialise_multi_thread_continuity(result)

    assert payload["current_thread"] != {}
    assert payload["assistant_surface"] == "standalone"
