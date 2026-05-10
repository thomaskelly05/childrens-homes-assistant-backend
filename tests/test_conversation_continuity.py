from __future__ import annotations

from assistant.conversation_continuity import (
    build_conversation_continuity,
    normalise_history_items,
    serialise_conversation_continuity,
)


def test_normalise_history_items_keeps_recent_valid_messages():
    history = [
        {"role": "system", "content": "system message"},
        {"role": "user", "content": "Can you help me write this daily note?"},
        {"role": "assistant", "content": "Yes, what happened during the shift?"},
    ]

    items = normalise_history_items(history)

    assert len(items) == 2
    assert items[0].role == "user"
    assert items[1].role == "assistant"


def test_standalone_continuity_filters_possible_os_context():
    history = [
        {
            "role": "user",
            "content": "[incident:44] Young person absconded from the home.",
        },
        {
            "role": "assistant",
            "content": "Please continue the chronology.",
        },
    ]

    continuity = build_conversation_continuity(
        history=history,
        assistant_surface="standalone",
    )

    assert "standalone_history_contains_possible_os_context" in continuity.warnings
    assert "incident:44" not in continuity.summary


def test_os_continuity_keeps_context_but_warns_not_to_treat_as_evidence():
    history = [
        {
            "role": "user",
            "content": "Continue the chronology from yesterday's safeguarding concern.",
        },
        {
            "role": "assistant",
            "content": "I can continue using the scoped evidence already attached.",
        },
    ]

    continuity = build_conversation_continuity(
        history=history,
        assistant_surface="os_embedded",
    )

    assert "Do not treat previous chat wording as OS evidence" in continuity.summary
    assert "Continue the chronology" in continuity.summary


def test_serialised_continuity_contains_summary_and_items():
    history = [
        {
            "role": "user",
            "content": "Help me improve this safeguarding reflection.",
        }
    ]

    continuity = build_conversation_continuity(
        history=history,
        assistant_surface="standalone",
    )

    payload = serialise_conversation_continuity(continuity)

    assert payload["assistant_surface"] == "standalone"
    assert payload["item_count"] == 1
    assert payload["items"][0]["role"] == "user"
