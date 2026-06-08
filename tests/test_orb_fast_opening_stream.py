from __future__ import annotations

import inspect

from services.orb_fast_opening_service import fast_opening_for_message


def test_dont_care_opening_for_residential_deep():
    opening = fast_opening_for_message(
        "She keeps saying she doesn't care.",
        expert_depth="residential_deep",
    )
    assert opening
    assert "communication" in opening.lower()
    assert "attitude" in opening.lower()


def test_missing_cannabis_opening():
    opening = fast_opening_for_message(
        "A young person has returned after missing for 3 days and smells of cannabis.",
        expert_depth="residential_deep",
    )
    assert opening
    assert "safe" in opening.lower()
    assert "blame" in opening.lower() or "interrogation" in opening.lower()


def test_general_light_has_no_fast_opening():
    assert (
        fast_opening_for_message(
            "What is the capital of France?",
            expert_depth="general_light",
        )
        is None
    )


def test_stream_route_emits_fast_opening_before_context_build():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    opening_idx = source.index("fast_opening_for_message")
    build_idx = source.index("_build_standalone_request_context")
    token_idx = source.index('yield _sse_event("token"', opening_idx)
    assert opening_idx < build_idx
    assert token_idx < build_idx
