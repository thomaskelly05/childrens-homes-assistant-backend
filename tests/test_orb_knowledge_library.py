from __future__ import annotations

import pytest

from services.orb_knowledge_library_service import (
    SEED_FILE_MAP,
    orb_knowledge_library_service,
)


@pytest.fixture(autouse=True)
def fresh_memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()
    yield


def test_builtin_sources_seeded():
    sources = orb_knowledge_library_service.list_sources()
    assert len(sources) >= len(SEED_FILE_MAP)
    ids = {s["id"] for s in sources}
    for meta in SEED_FILE_MAP.values():
        assert meta["id"] in ids


def test_source_metadata_standalone_boundary():
    sources = orb_knowledge_library_service.list_sources()
    for source in sources:
        assert source.get("standalone_only") is True
        assert source.get("os_linked") is False
        assert source.get("care_record_access") is False
        assert source.get("live_retrieved") is False


def test_list_and_get_source():
    sources = orb_knowledge_library_service.list_sources(source_type="product_context")
    assert sources
    source = orb_knowledge_library_service.get_source(sources[0]["id"])
    assert source is not None
    assert source["title"]


def test_search_chunks_keyword_ofsted():
    results = orb_knowledge_library_service.search_chunks_keyword(
        "Ofsted child voice inspection",
        limit=5,
    )
    assert results
    types = {r["source_type"] for r in results}
    assert "regulatory_framework" in types


def test_library_summary():
    summary = orb_knowledge_library_service.get_library_summary()
    assert summary["source_count"] > 0
    assert summary["chunk_count"] > 0
    assert summary["standalone_only"] is True
