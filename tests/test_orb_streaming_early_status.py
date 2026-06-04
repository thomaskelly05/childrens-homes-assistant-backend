from __future__ import annotations

import inspect

from services.orb_stream_status_service import (
    stream_status_payload,
    stream_status_sequence,
    safeguarding_opening_token,
)


def test_general_light_emits_no_residential_status_sequence():
    assert stream_status_sequence("general_light") == []


def test_residential_light_status_messages():
    seq = stream_status_sequence("residential_light")
    assert len(seq) >= 1
    assert any("context" in (s.get("message") or "").lower() for s in seq)


def test_safeguarding_critical_has_immediate_opening():
    assert safeguarding_opening_token()
    seq = stream_status_sequence("safeguarding_critical")
    assert any("safety" in (s.get("message") or "").lower() for s in seq)


def test_stream_route_yields_status_before_context_build():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert 'yield _sse_event("status"' in source
    assert "_build_standalone_request_context(payload)" in source
    # Status received is yielded before full context build inside generator
    received_idx = source.index('stream_status_payload("received")')
    build_idx = source.index("_build_standalone_request_context(payload)")
    assert received_idx < build_idx


def test_status_payload_shape():
    payload = stream_status_payload("received")
    assert payload["type"] == "status"
    assert payload["stage"] == "received"
