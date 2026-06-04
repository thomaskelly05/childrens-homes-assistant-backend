from __future__ import annotations

import pytest

from services.ai_external_call_governance import governed_embeddings_create
from services.ai_usage_audit_service import ai_usage_audit_service
from services.orb_embedding_service import orb_embedding_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    return recorded


def test_governed_embeddings_blocked_when_external_ai_disabled(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    result = governed_embeddings_create(["Statutory guidance excerpt"])
    assert result["available"] is False
    assert result.get("blocked") is True


def test_orb_embedding_service_honours_disable_flag(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    result = orb_embedding_service.embed_many(["Provider policy on contact"])
    assert result["available"] is False


def test_governed_embeddings_redact_before_provider(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    captured: dict = {}

    class _Data:
        def __init__(self, index: int, embedding: list[float]):
            self.index = index
            self.embedding = embedding

    class _Embeddings:
        def create(self, *, model, input):
            captured["input"] = input
            return type("Resp", (), {"data": [_Data(0, [0.1, 0.2])]})()

    class _Client:
        embeddings = _Embeddings()

    monkeypatch.setattr("openai.OpenAI", lambda **_: _Client())
    result = governed_embeddings_create(["Child John Smith at SW1A 1AA"])
    assert result["available"] is True
    assert "John Smith" not in str(captured.get("input", ""))
