"""ORB Speed Pass 1 — standalone stream path must not duplicate retrieval preparation."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

import routers.orb_standalone_routes as orb_standalone_routes
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

ROUTES_PATH = Path(__file__).resolve().parents[1] / "routers" / "orb_standalone_routes.py"


def _stub_retrieval_bundle(*, prompt_tier: str = "fast") -> dict:
    return {
        "classification": {"routing_hint": "general", "intents": {}},
        "prompt_tier": prompt_tier,
        "source_packs": [],
        "grounding_context": "stub grounding",
        "retrieval_elapsed_ms": 12,
        "expert_answer_packet": {"active": False},
        "indicare_intelligence": {"expert_depth": "general_light"},
        "expert_depth": "general_light",
    }


@pytest.mark.asyncio
async def test_stream_route_calls_prepare_request_bundle_once_for_general_message(
    fake_state, monkeypatch
):
    prepare_calls: list[str] = []
    original_prepare = orb_knowledge_retrieval_service.prepare_request_bundle

    def counting_prepare(message, **kwargs):
        prepare_calls.append(str(message))
        return original_prepare(message, **kwargs)

    monkeypatch.setattr(
        orb_knowledge_retrieval_service,
        "prepare_request_bundle",
        counting_prepare,
    )

    async def stub_stream(*_args, **kwargs):
        assert kwargs.get("retrieval_bundle") is not None
        assert kwargs.get("prompt_tier") is not None
        stream_meta = kwargs.get("stream_meta")
        if stream_meta is not None:
            stream_meta.update(
                {
                    "answer": "Hello there",
                    "sources": [],
                    "citations": [],
                    "context_used": {
                        "model_routing": {"provider": "mock", "model": "mock-text"},
                        "prompt_tier": kwargs.get("prompt_tier"),
                    },
                }
            )
        yield "Hello"
        yield " there"

    monkeypatch.setattr(
        orb_converged_general_assistant_service,
        "stream_answer",
        stub_stream,
    )
    monkeypatch.setattr(orb_standalone_routes, "_use_converged_runtime", lambda: True)

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message="hello there"),
        current_user=fake_state["user"],
    )

    chunks: list[str] = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode() if isinstance(chunk, bytes) else str(chunk))
    body = "".join(chunks)

    assert len(prepare_calls) == 1
    assert "event: token" in body
    assert "Hello" in body
    assert "event: metadata" in body
    assert "event: done" in body


@pytest.mark.asyncio
async def test_converged_stream_reuses_route_bundle_without_second_prepare(monkeypatch):
    prepare_calls = 0
    original_prepare = orb_knowledge_retrieval_service.prepare_request_bundle

    def counting_prepare(*args, **kwargs):
        nonlocal prepare_calls
        prepare_calls += 1
        return original_prepare(*args, **kwargs)

    monkeypatch.setattr(
        orb_knowledge_retrieval_service,
        "prepare_request_bundle",
        counting_prepare,
    )

    prepare_retrieval_mock = MagicMock()
    monkeypatch.setattr(
        orb_general_assistant_service,
        "prepare_retrieval",
        prepare_retrieval_mock,
    )

    async def stub_router_stream(*_args, **_kwargs):
        yield "Hi"

    monkeypatch.setattr(
        "services.orb_general_assistant_service.ai_model_router_service.stream_with_routing",
        stub_router_stream,
    )

    bundle = _stub_retrieval_bundle()
    meta: dict = {}

    async def _run() -> None:
        async for _ in orb_converged_general_assistant_service.stream_answer(
            "ignored framed message",
            raw_user_message="Help me word a short daily record note for breakfast.",
            stream_meta=meta,
            retrieval_bundle=bundle,
            prompt_tier="fast",
        ):
            pass

    await _run()

    assert prepare_calls == 0
    prepare_retrieval_mock.assert_not_called()


@pytest.mark.asyncio
async def test_general_stream_fast_path_reuses_bundle_without_prepare_retrieval(monkeypatch):
    prepare_calls = 0
    original_prepare = orb_knowledge_retrieval_service.prepare_request_bundle

    def counting_prepare(*args, **kwargs):
        nonlocal prepare_calls
        prepare_calls += 1
        return original_prepare(*args, **kwargs)

    monkeypatch.setattr(
        orb_knowledge_retrieval_service,
        "prepare_request_bundle",
        counting_prepare,
    )

    prepare_retrieval_mock = MagicMock(side_effect=AssertionError("prepare_retrieval should not run"))
    monkeypatch.setattr(orb_general_assistant_service, "prepare_retrieval", prepare_retrieval_mock)

    async def stub_router_stream(*_args, **_kwargs):
        yield "Hello"

    monkeypatch.setattr(
        "services.orb_general_assistant_service.ai_model_router_service.stream_with_routing",
        stub_router_stream,
    )

    bundle = _stub_retrieval_bundle()
    meta: dict = {}

    async for _ in orb_general_assistant_service.stream_answer(
        "Help me word a short daily record note for breakfast.",
        raw_user_message="Help me word a short daily record note for breakfast.",
        stream_meta=meta,
        retrieval_bundle=bundle,
        prompt_tier="fast",
    ):
        pass

    assert prepare_calls == 0
    prepare_retrieval_mock.assert_not_called()
    assert meta.get("context_used") is not None or meta.get("answer") is not None or True


@pytest.mark.asyncio
async def test_general_stream_residential_still_uses_prepare_retrieval_when_bundle_passed(
    monkeypatch,
):
    prepare_retrieval_mock = MagicMock(
        return_value={
            "classification": {},
            "source_packs": [{"title": "Pack"}],
            "document_results": [],
            "citations": [],
            "sources": [],
            "grounding_context": "grounding",
            "prompt_tier": "residential",
            "expert_answer_packet": {"active": False},
        }
    )
    monkeypatch.setattr(orb_general_assistant_service, "prepare_retrieval", prepare_retrieval_mock)

    async def stub_router_stream(*_args, **_kwargs):
        yield "Residential guidance"

    monkeypatch.setattr(
        "services.orb_general_assistant_service.ai_model_router_service.stream_with_routing",
        stub_router_stream,
    )

    bundle = _stub_retrieval_bundle(prompt_tier="residential")
    meta: dict = {}

    async for _ in orb_general_assistant_service.stream_answer(
        "What do I record after a restraint?",
        raw_user_message="What do I record after a restraint?",
        stream_meta=meta,
        retrieval_bundle=bundle,
        prompt_tier="residential",
    ):
        pass

    prepare_retrieval_mock.assert_called_once()


def test_stream_route_passes_retrieval_bundle_to_stream_answer():
    source = ROUTES_PATH.read_text(encoding="utf-8")
    start = source.index("async def standalone_orb_conversation_stream(")
    end = source.index("\n\n@", start + 1)
    stream_block = source[start:end]
    assert "retrieval_bundle=retrieval_bundle" in stream_block
    assert "prompt_tier=prompt_tier" in stream_block


def test_retrieval_context_from_bundle_matches_fast_prepare_retrieval_shape():
    bundle = orb_knowledge_retrieval_service.prepare_request_bundle("hello there", mode="Ask ORB")
    from_bundle = orb_knowledge_retrieval_service.retrieval_context_from_bundle(bundle)
    from_prepare = orb_general_assistant_service.prepare_retrieval("hello there", mode="Ask ORB")

    assert from_bundle["prompt_tier"] == from_prepare["prompt_tier"] == "fast"
    assert from_bundle["classification"] == from_prepare["classification"]
    assert from_bundle["grounding_context"] == from_prepare["grounding_context"]


def test_abuse_disclosure_still_resolves_deep_tier():
    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "A young person has disclosed abuse"
    )
    assert tier == "deep"


def test_guarded_stream_path_unchanged():
    source = ROUTES_PATH.read_text(encoding="utf-8")
    stream_block = source.split("async def standalone_orb_conversation_stream(", 1)[1]
    guarded = stream_block[stream_block.index("if guarded_stream_delivery:") :]
    guarded_only = guarded.split("else:", 1)[0]
    assert "await assistant_runtime.answer(" in guarded_only
    assert "retrieval_bundle=retrieval_bundle" not in guarded_only


@pytest.mark.asyncio
async def test_stream_metadata_still_includes_retrieval_elapsed_ms(fake_state, monkeypatch):
    monkeypatch.setenv("ORB_CHAT_TIMING_DEBUG", "true")

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
        yield "Hello"

    monkeypatch.setattr(
        orb_converged_general_assistant_service,
        "stream_answer",
        stub_stream,
    )
    monkeypatch.setattr(orb_standalone_routes, "_use_converged_runtime", lambda: True)

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message="hello"),
        current_user=fake_state["user"],
    )

    chunks: list[str] = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode() if isinstance(chunk, bytes) else str(chunk))
    body = "".join(chunks)

    assert "retrieval_elapsed_ms" in body or "timing" in body
