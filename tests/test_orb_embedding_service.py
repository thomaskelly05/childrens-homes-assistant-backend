from __future__ import annotations

import math

import pytest

from services.orb_embedding_service import OrbEmbeddingService, orb_embedding_service


@pytest.fixture
def embedding_svc(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("ORB_EMBEDDINGS_ENABLED", "true")
    return OrbEmbeddingService()


def test_missing_openai_key_does_not_crash(embedding_svc):
    assert embedding_svc.is_available() is False
    result = embedding_svc.embed_text("missing from care guidance")
    assert result["available"] is False
    assert result.get("embedding") is None


def test_cosine_similarity_works(embedding_svc):
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert embedding_svc.cosine_similarity(a, b) == pytest.approx(1.0, abs=1e-6)
    c = [0.0, 1.0, 0.0]
    assert embedding_svc.cosine_similarity(a, c) == pytest.approx(0.0, abs=1e-6)


def test_normalise_vector(embedding_svc):
    v = embedding_svc.normalise_vector([3.0, 4.0])
    assert math.isclose(math.sqrt(sum(x * x for x in v)), 1.0, rel_tol=1e-6)


def test_semantic_unavailable_fallback(embedding_svc, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    batch = embedding_svc.embed_many(["one", "two"])
    assert batch["available"] is False
    assert batch["embeddings"] == []


def test_estimate_embedding_cost(embedding_svc):
    est = embedding_svc.estimate_embedding_cost(["hello world"])
    assert est["text_count"] == 1
    assert est["estimated_tokens"] >= 1
