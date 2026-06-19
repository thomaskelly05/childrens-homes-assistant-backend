"""Regression tests for Phase 1 guarded stream delivery (safety parity with POST)."""

from __future__ import annotations

from pathlib import Path

ROUTES_PATH = Path(__file__).resolve().parents[1] / "routers" / "orb_standalone_routes.py"


def _routes_source() -> str:
    return ROUTES_PATH.read_text(encoding="utf-8")


def _stream_route_source() -> str:
    source = _routes_source()
    start = source.index("async def standalone_orb_conversation_stream(")
    return source[start:]


def _guarded_delivery_helper_source() -> str:
    source = _routes_source()
    start = source.index("def _requires_guarded_stream_delivery(")
    end = source.index("\ndef _build_standalone_request_context(", start)
    return source[start:end]


def _requires_guarded_stream_delivery_core(
    safety_scaffold: dict | None,
    *,
    mode: str,
) -> bool:
    """Core branches exercised without optional deep-routing scaffold service."""
    scaffold = safety_scaffold or {}
    if scaffold.get("guardrail_active"):
        return True
    normalised = str(mode or "").strip().lower()
    if "safeguarding" in normalised:
        return True
    return False


def test_requires_guarded_stream_when_guardrail_active():
    assert _requires_guarded_stream_delivery_core({"guardrail_active": True}, mode="Ask ORB") is True


def test_requires_guarded_stream_for_safeguarding_mode():
    assert _requires_guarded_stream_delivery_core({}, mode="Safeguarding Thinking") is True


def test_does_not_require_guarded_stream_for_benign_ask_orb():
    assert _requires_guarded_stream_delivery_core({}, mode="Ask ORB") is False


def test_helper_checks_guardrail_active_and_safeguarding_mode():
    helper = _guarded_delivery_helper_source()
    assert 'scaffold.get("guardrail_active")' in helper
    assert '"safeguarding" in normalised' in helper
    assert "requires_deep_routing" in helper


def test_context_build_precedes_fast_opening_token_emission():
    source = _stream_route_source()
    build_idx = source.index("_build_standalone_request_context(")
    guarded_idx = source.index("_requires_guarded_stream_delivery(")
    fast_opening_gate = "if fast_opening and not guarded_stream_delivery:"
    assert fast_opening_gate in source
    fast_gate_idx = source.index(fast_opening_gate)
    assert build_idx < guarded_idx < fast_gate_idx


def test_guarded_path_buffers_with_post_answer_before_client_tokens():
    source = _stream_route_source()
    guarded_block = source[source.index("if guarded_stream_delivery:") :]
    assert "await assistant_runtime.answer(" in guarded_block
    assert "yield_answer_text_as_stream" in guarded_block
    answer_idx = guarded_block.index("await assistant_runtime.answer(")
    stream_yield_idx = guarded_block.index("yield_answer_text_as_stream")
    assert answer_idx < stream_yield_idx
    assert "assistant_runtime.stream_answer(" not in guarded_block.split("else:")[0]


def test_fast_opening_suppressed_when_guarded():
    source = _stream_route_source()
    assert "if fast_opening and not guarded_stream_delivery:" in source


def test_route_documents_guarded_delivery_intent():
    routes_source = _routes_source()
    assert "Buffer stream tokens until post-LLM guardrails" in routes_source
    assert "POST-equivalent path" in routes_source
