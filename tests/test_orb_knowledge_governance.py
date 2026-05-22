from __future__ import annotations

import pytest

from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()
    yield


def test_seeded_ofsted_official_metadata():
    source = orb_knowledge_library_service.get_source("seed-ofsted-sccif")
    assert source is not None
    assert source["official_source"] is True
    assert source["confidence_level"] == "official"
    assert source["source_version"] == "built-in-summary-v1"


def test_seeded_quality_standards_official():
    source = orb_knowledge_library_service.get_source("seed-quality-standards")
    assert source is not None
    assert source["official_source"] is True
    assert source["publisher"] == "Department for Education"


def test_update_source_governance():
    source = orb_knowledge_library_service.get_source("seed-recording-quality")
    assert source
    updated = orb_knowledge_library_service.update_source_governance(
        source["id"],
        {"governance_status": "needs_review", "notes": "Review annually"},
    )
    assert updated["governance_status"] == "needs_review"


def test_list_sources_needing_review():
    orb_knowledge_library_service.update_source_governance(
        "seed-safeguarding",
        {"governance_status": "needs_review"},
    )
    needing = orb_knowledge_library_service.list_sources_needing_review()
    ids = {s["id"] for s in needing}
    assert "seed-safeguarding" in ids


def test_search_warning_for_needs_review(monkeypatch):
    orb_knowledge_library_service.update_source_governance(
        "seed-recording-quality",
        {"governance_status": "needs_review"},
    )
    results = orb_knowledge_library_service.search_chunks_keyword("daily note recording", limit=6)
    if results:
        assert any(r.get("warning") for r in results)
