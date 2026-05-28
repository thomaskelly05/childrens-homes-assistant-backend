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
    assert "sendStandaloneOrbMessageStream" in text
    assert "stream_fallback" in text
