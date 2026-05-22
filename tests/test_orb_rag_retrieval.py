from __future__ import annotations

import pytest

from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service


@pytest.fixture(autouse=True)
def seeded_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


@pytest.mark.parametrize(
    "query,expected_type",
    [
        ("Ofsted child voice", "regulatory_framework"),
        ("help me write a daily note", "recording_quality"),
        ("tell me about IndiCare", "product_context"),
        ("safeguarding concern escalation", "safeguarding_principles"),
    ],
)
def test_rag_search_finds_relevant_source_type(query, expected_type):
    results = orb_rag_retrieval_service.search(query, limit=6)
    assert results
    types = {r["source_type"] for r in results}
    assert expected_type in types


def test_retrieve_for_conversation_merges_citations():
    rag = orb_rag_retrieval_service.retrieve_for_conversation(
        "What would Ofsted expect around child voice?",
        mode="Ofsted Lens",
    )
    assert rag["source_packs"]
    assert rag["citations"]
    assert rag["grounding_context"]
    assert "Knowledge Library" in rag["grounding_context"] or "document" in rag["grounding_context"].lower()
    labels = {c["label"] for c in rag["citations"]}
    assert any("Ofsted" in label or "SCCIF" in label or "Quality" in label for label in labels)


def test_build_grounded_context_includes_passages():
    results = orb_rag_retrieval_service.search("daily note recording", limit=3)
    context = orb_rag_retrieval_service.build_grounded_context(
        "daily note",
        document_results=results,
    )
    assert "Grounding context" in context
    if results:
        assert "Retrieved document passages" in context


def test_document_citations_not_live():
    results = orb_rag_retrieval_service.search("IndiCare ORB", limit=4)
    citations = orb_rag_retrieval_service.build_rag_citations(results)
    for citation in citations:
        assert citation["live_retrieved"] is False
