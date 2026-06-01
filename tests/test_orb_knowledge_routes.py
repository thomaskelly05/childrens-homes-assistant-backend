from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

import routers.orb_knowledge_routes as knowledge_routes
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


def test_knowledge_health_route(fake_state):
    response = asyncio.run(knowledge_routes.knowledge_health(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["standalone_only"] is True
    assert response["data"]["os_linked"] is False


def test_list_sources_route(fake_state):
    response = asyncio.run(knowledge_routes.list_sources(current_user=fake_state["user"]))
    assert response["success"] is True
    assert len(response["data"]) >= 8


def test_ingest_and_search_routes(fake_state):
    from schemas.orb_knowledge import OrbKnowledgeDocumentIngestRequest, OrbKnowledgeSearchRequest

    ingest = asyncio.run(
        knowledge_routes.ingest_text(
            OrbKnowledgeDocumentIngestRequest(
                title="Test note guidance",
                text="Daily notes should be factual and child-centred with the child's voice.",
                source_type="recording_quality",
            ),
            current_user=fake_state["user"],
        )
    )
    assert ingest["success"] is True
    assert ingest["data"]["chunk_count"] >= 1

    search = asyncio.run(
        knowledge_routes.search_knowledge(
            OrbKnowledgeSearchRequest(query="daily note child voice"),
            current_user=fake_state["user"],
        )
    )
    assert search["success"] is True
    assert search["data"]["total"] >= 1


def test_summary_route(fake_state):
    response = asyncio.run(knowledge_routes.knowledge_summary(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["care_record_access"] is False


def test_knowledge_router_registered():
    loader = Path(__file__).resolve().parents[1] / "core" / "router_loader.py"
    assert "routers.orb_knowledge_routes" in loader.read_text(encoding="utf-8")
