from __future__ import annotations

import pytest

from assistant import streaming as legacy_streaming
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    return recorded


def test_legacy_streaming_module_documents_not_live():
    text = legacy_streaming.__doc__ or ""
    assert "not wired to live routes" in text.lower() or "llm_provider" in text


def test_legacy_streaming_blocks_without_openai_when_disabled(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    chunks = list(
        legacy_streaming.run_chat_stream(
            [{"role": "user", "content": "hello"}],
            metadata={"ai_feature": "legacy_assistant_stream"},
        )
    )
    assert chunks
    assert "not available" in chunks[0].lower() or "external ai" in chunks[0].lower()


def test_retrieval_embedding_respects_external_ai_disabled(monkeypatch):
    from assistant.retrieval import embed_query

    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    with pytest.raises(RuntimeError, match="embedding"):
        embed_query("What are the children's homes regulations for restraint?")
