from __future__ import annotations

from unittest.mock import patch

import pytest

from services.orb_semantic_retrieval_service import orb_semantic_retrieval_service


def _chunk(chunk_index: int, text: str, embedding=None):
    return {
        "source_id": "seed-test",
        "chunk_index": chunk_index,
        "text": text,
        "embedding": embedding,
        "source_type": "regulatory_framework",
    }


def test_keyword_only_when_semantic_unavailable():
    keyword = [
        {
            "source_id": "a",
            "chunk_index": 0,
            "score": 4.0,
            "keyword_score": 4.0,
            "text": "missing from care",
        }
    ]
    with patch.object(orb_semantic_retrieval_service, "semantic_available", return_value=False):
        results, strategy = orb_semantic_retrieval_service.hybrid_search(
            "absconded",
            keyword,
            [_chunk(0, "missing from care")],
            limit=4,
        )
    assert strategy == "keyword_plus_synonyms"
    assert results[0]["semantic_score"] is None


def test_hybrid_with_mock_embeddings():
    query_vec = [1.0, 0.0]
    chunk_vec = [0.9, 0.1]
    chunks = [_chunk(0, "child voice wishes", embedding=chunk_vec)]
    keyword = [
        {
            "source_id": "seed-test",
            "chunk_index": 0,
            "score": 2.0,
            "text": "child voice",
            "source_type": "regulatory_framework",
        }
    ]
    with patch.object(orb_semantic_retrieval_service, "semantic_available", return_value=True):
        with patch(
            "services.orb_semantic_retrieval_service.orb_embedding_service.embed_text",
            return_value={"available": True, "embedding": query_vec},
        ):
            results, strategy = orb_semantic_retrieval_service.hybrid_search(
                "child voice",
                keyword,
                chunks,
                limit=4,
            )
    assert strategy == "hybrid_semantic_keyword"
    assert results
    assert results[0].get("semantic_score") is not None


def test_explain_match():
    reason = orb_semantic_retrieval_service.explain_match(2.0, 0.8, 0.3)
    assert "keyword" in reason
    assert "semantic" in reason
