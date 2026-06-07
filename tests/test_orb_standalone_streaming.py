from __future__ import annotations

from pathlib import Path

import pytest

import routers.orb_standalone_routes as orb_standalone_routes

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


def test_streaming_route_exists():
    text = ROUTES.read_text(encoding="utf-8")
    assert '@router.post("/conversation/stream")' in text
    assert "standalone_orb_conversation_stream" in text
    assert '@router.post("/conversation")' in text


def test_streaming_route_uses_premium_orb_dependency():
    text = ROUTES.read_text(encoding="utf-8")
    stream_block = text.split('@router.post("/conversation/stream")', 1)[1].split("@router.", 1)[0]
    assert "require_standalone_orb_access" in stream_block
    assert "require_assistant_access" not in stream_block


def test_streaming_route_rejects_os_ids():
    text = ROUTES.read_text(encoding="utf-8")
    assert "_reject_standalone_os_ids" in text
    assert "FORBIDDEN_STANDALONE_OS_KEYS" in text


def test_reject_os_ids_raises_for_child_id():
    with pytest.raises(Exception) as exc:
        orb_standalone_routes._reject_standalone_os_ids({"child_id": 12})
    assert getattr(exc.value, "status_code", None) == 400


def test_prompt_tier_deep_for_high_risk():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

    tier = orb_knowledge_retrieval_service.resolve_prompt_tier("there is immediate danger and abuse")
    assert tier == "deep"


def test_prompt_tier_fast_for_simple_greeting():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

    tier = orb_knowledge_retrieval_service.resolve_prompt_tier("hello there")
    assert tier == "fast"


def test_sse_parser_documented_in_client():
    text = CLIENT.read_text(encoding="utf-8")
    assert "parseStandaloneOrbSseBlock" in text
    assert "event: 'token'" in text or "event === 'token'" in text
    assert "event: 'metadata'" in text or "event === 'metadata'" in text
    assert "event: 'done'" in text or "event === 'done'" in text
    assert "event: 'error'" in text or "event === 'error'" in text


def test_sse_event_helper_format():
    payload = orb_standalone_routes._sse_event("token", {"delta": "Hi"})
    assert payload.startswith("event: token\n")
    assert "Hi" in payload


@pytest.mark.asyncio
async def test_streaming_endpoint_emits_token_and_metadata(fake_state, monkeypatch):
    stream_meta_holder: dict = {}

    async def stub_stream(*_args, **kwargs):
        stream_meta = kwargs.get("stream_meta")
        if stream_meta is not None:
            stream_meta.update(
                {
                    "answer": "Hello",
                    "sources": [],
                    "citations": [],
                    "context_used": {"model_routing": {"provider": "mock", "model": "mock-text"}},
                }
            )
        yield "Hel"
        yield "lo"

    monkeypatch.setattr(
        orb_standalone_routes.orb_general_assistant_service,
        "stream_answer",
        stub_stream,
    )
    monkeypatch.setattr(orb_standalone_routes, "_use_converged_runtime", lambda: False)

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message="hello"),
        current_user=fake_state["user"],
    )

    chunks: list[str] = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode() if isinstance(chunk, bytes) else str(chunk))
    body = "".join(chunks)
    assert "event: token" in body
    assert "Hel" in body
    assert "event: metadata" in body
    assert "event: done" in body


def test_frontend_exports_stream_send():
    text = CLIENT.read_text(encoding="utf-8")
    assert "conversationStream" in text
    assert "sendStandaloneOrbMessageStream" in text


def test_care_companion_uses_true_streaming():
    companion = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
    text = companion.read_text(encoding="utf-8")
    assert "askOrbBrain" in text
    assert "stream_fallback" in text


def test_chunk_text_for_stream_preserves_spaces():
    from services.ai_model_router_service import _chunk_text_for_stream

    text = "Hello! How can I assist you today?"
    chunks = _chunk_text_for_stream(text)
    assert "".join(chunks) == text


def test_openai_stream_delta_helper_preserves_leading_spaces():
    from services.ai_providers.openai_provider import _stream_delta

    assert _stream_delta(" How") == " How"
    assert _stream_delta(" Hello") == " Hello"


def test_instant_fast_answer_for_hello():
    from services.orb_general_assistant_service import orb_general_assistant_service

    answer = orb_general_assistant_service._try_instant_fast_answer("hello")
    assert answer is not None
    assert answer == "Hello — what would you like to work on?"
    assert "safeguarding" not in answer.lower()


def test_instant_fast_answer_for_thanks():
    from services.orb_general_assistant_service import orb_general_assistant_service

    answer = orb_general_assistant_service._try_instant_fast_answer("thank you")
    assert answer == "You're welcome."


def test_hello_stream_metadata_omits_image_unavailable_flag():
    import asyncio

    from services.orb_general_assistant_service import orb_general_assistant_service

    meta: dict = {}

    async def _run() -> None:
        async for _ in orb_general_assistant_service.stream_answer(
            "hello",
            raw_user_message="hello",
            stream_meta=meta,
        ):
            pass

    asyncio.run(_run())
    assert meta.get("image_understanding_available") is None


def test_hello_sanitize_has_no_threshold_closer():
    from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service

    raw = (
        "Hello! How can I help?\n\n"
        "ORB can support your thinking, but the threshold decision should remain human-led."
    )
    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        raw,
        message="hello",
        mode="Ask ORB",
    )
    assert "threshold decision" not in cleaned.lower()
    assert "manager oversight is visible" not in cleaned.lower()


def test_abuse_disclosure_still_gets_safeguarding_boundary():
    from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service

    cleaned = orb_grounded_answer_style_service.sanitize_high_attention_closer(
        "A young person has disclosed abuse. Seek advice.",
        message="A young person has disclosed abuse",
        mode="Ask ORB",
    )
    assert "abuse" in cleaned.lower()


def test_restraint_recording_tier_is_residential_not_deep():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "What do I record after a restraint?"
    )
    assert tier == "residential"


def test_abuse_disclosure_uses_deep_tier():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "A young person has disclosed abuse"
    )
    assert tier == "deep"
