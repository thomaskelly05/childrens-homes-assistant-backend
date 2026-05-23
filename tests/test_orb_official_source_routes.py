from __future__ import annotations

import asyncio

import pytest

import routers.orb_knowledge_routes as knowledge_routes
from schemas.orb_knowledge import OrbKnowledgeOfficialImportRequest
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)


def test_official_sources_route(fake_state):
    orb_knowledge_library_service.create_source(
        {
            "id": "official-1",
            "title": "SCCIF",
            "source_type": "regulatory_framework",
            "official_source": True,
            "status": "indexed",
        }
    )
    response = asyncio.run(knowledge_routes.official_sources(current_user=fake_state["user"]))
    assert response["success"] is True
    assert any(s["id"] == "official-1" for s in response["data"])


def test_citation_health_route(fake_state):
    orb_knowledge_library_service.create_source(
        {
            "id": "health-src",
            "title": "Test",
            "source_type": "policy",
            "status": "indexed",
        }
    )
    orb_knowledge_library_service.upsert_chunks(
        "health-src",
        [
            {
                "id": "health-src-chunk-0",
                "source_id": "health-src",
                "chunk_index": 0,
                "text": "Paragraph one.",
                "section": "Reporting",
                "citation_anchor": "src:health-src|chunk:0",
                "keywords": [],
            }
        ],
    )
    response = asyncio.run(
        knowledge_routes.source_citation_health("health-src", current_user=fake_state["user"])
    )
    assert response["success"] is True
    assert response["data"]["chunk_count"] == 1


def test_approve_and_needs_review(fake_state):
    orb_knowledge_library_service.create_source(
        {
            "id": "gov-src",
            "title": "Policy",
            "source_type": "policy",
            "status": "indexed",
            "governance_status": "draft",
        }
    )
    approve = asyncio.run(
        knowledge_routes.approve_source("gov-src", current_user=fake_state["user"])
    )
    assert approve["data"]["governance_status"] == "approved"

    review = asyncio.run(
        knowledge_routes.needs_review_source(
            "gov-src", reason="Annual review", current_user=fake_state["user"]
        )
    )
    assert review["data"]["governance_status"] == "needs_review"


def test_import_official_source(fake_state):
    response = asyncio.run(
        knowledge_routes.import_official_source(
            OrbKnowledgeOfficialImportRequest(
                title="Recording guidance",
                text="# Child voice\n\nInclude views and wishes.",
                family_key="provider_policy",
                approve_now=True,
            ),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["chunk_count"] >= 1
    assert response["data"]["citation_health"]["chunk_count"] >= 1


def test_rebuild_citations(fake_state):
    orb_knowledge_library_service.create_source(
        {
            "id": "rebuild-src",
            "title": "Guide",
            "source_type": "policy",
            "status": "indexed",
        }
    )
    orb_knowledge_library_service.upsert_chunks(
        "rebuild-src",
        [
            {
                "id": "rebuild-src-chunk-0",
                "source_id": "rebuild-src",
                "chunk_index": 0,
                "text": "Content here.",
                "section": "Intro",
                "keywords": [],
            }
        ],
    )
    response = asyncio.run(
        knowledge_routes.rebuild_citations("rebuild-src", current_user=fake_state["user"])
    )
    assert response["data"]["rebuilt"] == 1
