from __future__ import annotations

import inspect

from services.orb_fast_opening_service import fast_opening_for_message, safeguarding_opening_token
from services.orb_stream_status_service import (
    USER_STATUS_PREPARING_GUIDANCE,
    USER_STATUS_SAFEST_STEPS,
    stream_status_payload,
    stream_status_sequence,
)


def test_general_light_emits_no_residential_status_sequence():
    assert stream_status_sequence("general_light") == []


def test_residential_light_status_messages():
    seq = stream_status_sequence("residential_light")
    assert len(seq) >= 1
    assert any(USER_STATUS_PREPARING_GUIDANCE in (s.get("message") or "") for s in seq)


def test_safeguarding_critical_has_immediate_opening():
    assert safeguarding_opening_token()
    assert fast_opening_for_message(
        "A young person disclosed self-harm",
        expert_depth="safeguarding_critical",
    )
    seq = stream_status_sequence("safeguarding_critical")
    assert any(USER_STATUS_SAFEST_STEPS in (s.get("message") or "") for s in seq)


def test_stream_route_yields_status_before_context_build():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert 'yield _sse_event("status"' in source
    assert "_build_standalone_request_context(" in source
    assert "fast_opening_for_message" in source
    # Status received is yielded before full context build inside generator
    received_idx = source.index('stream_status_payload("received")')
    build_idx = source.index("_build_standalone_request_context(")
    assert received_idx < build_idx
    opening_idx = source.index("fast_opening_for_message")
    assert opening_idx < build_idx


def test_status_payload_shape():
    payload = stream_status_payload("received")
    assert payload["type"] == "status"
    assert payload["stage"] == "received"
