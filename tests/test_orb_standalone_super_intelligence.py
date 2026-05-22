from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
import routers.orb_standalone_routes as orb_standalone_routes
from services.orb_general_assistant_service import (
    GENERAL_ORB_SYSTEM_PROMPT,
    orb_general_assistant_service,
)
from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_standalone_sources import INDICARE_PRODUCT_FALLBACK, build_standalone_sources

REPO_ROOT = Path(__file__).resolve().parents[1]
ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ORB_LOCAL_STORE = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-local-store.ts"
STANDALONE_ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
GENERAL_SERVICE = REPO_ROOT / "services" / "orb_general_assistant_service.py"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


PROMPT_MARKERS = [
    "ChatGPT-class",
    "general knowledge",
    "IndiCare",
    "residential children's homes",
    "Care Hub",
    "Record",
    "Intelligence Spine",
    "Ofsted",
    "SCCIF",
    "Quality Standards",
    "standalone /orb",
    "/assistant/orb",
]


def test_standalone_prompt_contains_chatgpt_class_identity():
    routes = _read(STANDALONE_ROUTES)
    for marker in PROMPT_MARKERS:
        assert marker in routes or marker in GENERAL_ORB_SYSTEM_PROMPT, f"missing prompt marker: {marker}"


def test_indicare_fallback_does_not_refuse_product_questions():
    answer = orb_general_assistant_service._fallback_answer("tell me about indicare")
    lower = answer.lower()
    assert "indicare" in lower
    assert "residential" in lower
    assert "orb" in lower
    assert "can't provide information about indicare" not in lower
    assert "cannot provide information about indicare" not in lower
    assert "live os records" not in lower or "does not access live" in lower or "no live" in lower


def test_indicare_product_fallback_constant():
    lower = INDICARE_PRODUCT_FALLBACK.lower()
    assert "indicare" in lower
    assert "residential" in lower
    assert "orb" in lower
    assert "sources / basis" in lower


def test_build_standalone_sources_includes_expected_types():
    sources = build_standalone_sources("What would Ofsted expect in child voice evidence?", mode="Ofsted Lens")
    types = {item["type"] for item in sources}
    assert "regulatory_framework" in types
    assert "safety_boundary" in types

    safeguarding_sources = build_standalone_sources("Help me think through a safeguarding concern", mode="Safeguarding")
    safeguard_types = {item["type"] for item in safeguarding_sources}
    assert "safeguarding_principles" in safeguard_types or "safety_boundary" in safeguard_types


def test_standalone_route_response_includes_citations_and_retrieval(fake_state, monkeypatch):
    async def stub_answer(*_args, **_kwargs):
        retrieval = orb_general_assistant_service.prepare_retrieval(
            "tell me about indicare",
            mode="Ask ORB",
        )
        return {
            "answer": "IndiCare is a children's homes platform.",
            "sources": retrieval["sources"],
            "citations": retrieval["citations"],
            "context_used": orb_general_assistant_service._retrieval_context_used(retrieval),
            "tools_used": ["standalone_orb_general_assistant"],
        }

    monkeypatch.setattr(orb_standalone_routes.orb_general_assistant_service, "answer", stub_answer)

    response = asyncio.run(
        orb_standalone_routes.standalone_orb_conversation(
            orb_standalone_routes.OrbStandaloneConversationRequest(message="tell me about indicare"),
            current_user=fake_state["user"],
        )
    )

    assert response["citations"]
    assert response["sources"]
    assert response["context_used"]["os_linked"] is False
    assert response["context_used"]["care_record_access"] is False
    assert response["context_used"]["retrieval"]["live_retrieved"] is False
    assert response["context_used"]["retrieval"]["strategy"] in {
        "built_in_source_pack",
        "source_pack_plus_document_rag",
    }
    assert "document_result_count" in response["context_used"]["retrieval"]


def test_knowledge_services_exist():
    from services.orb_knowledge_source_pack_service import list_source_packs
    from services.orb_knowledge_library_service import orb_knowledge_library_service
    from services.orb_rag_retrieval_service import orb_rag_retrieval_service

    assert list_source_packs()
    assert orb_knowledge_retrieval_service
    assert orb_citation_service
    assert orb_knowledge_library_service
    assert orb_rag_retrieval_service


def test_prepare_retrieval_uses_document_rag(monkeypatch):
    from services.orb_knowledge_library_service import orb_knowledge_library_service

    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()

    retrieval = orb_general_assistant_service.prepare_retrieval(
        "tell me about IndiCare and daily notes",
        mode="Ask ORB",
    )
    assert retrieval["source_packs"]
    assert retrieval["citations"]
    ctx = orb_general_assistant_service._retrieval_context_used(retrieval)
    assert ctx["os_linked"] is False
    assert ctx["retrieval"]["strategy"] in {
        "source_pack_plus_document_rag",
        "built_in_source_pack",
    }
    assert "document_result_count" in ctx["retrieval"]


def test_standalone_route_exception_fallback_for_indicare(fake_state, monkeypatch):
    async def failing_answer(*_args, **_kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr(orb_standalone_routes.orb_general_assistant_service, "answer", failing_answer)

    response = asyncio.run(
        orb_standalone_routes.standalone_orb_conversation(
            orb_standalone_routes.OrbStandaloneConversationRequest(message="tell me about indicare"),
            current_user=fake_state["user"],
        )
    )

    answer = response["answer"].lower()
    assert "indicare" in answer
    assert "can't provide information about indicare" not in answer
    assert response["context_used"]["care_record_access"] is False
    assert response["sources"]


def test_frontend_dedupe_and_sources_markers():
    store = _read(ORB_LOCAL_STORE)
    companion = _read(ORB_COMPANION)
    for marker in (
        "dedupeOrbMessages",
        "repairOrbWorkspace",
        "repairOrbChat",
        "WORKSPACE_SCHEMA_VERSION",
    ):
        assert marker in store, f"missing store marker: {marker}"
    for marker in ("visibleMessages", "dedupeOrbMessages", "Sources / basis", "SourcesBasis"):
        assert marker in companion, f"missing companion marker: {marker}"


def test_general_service_module_has_product_knowledge():
    text = _read(GENERAL_SERVICE)
    assert "ChatGPT-class" in text
    assert "IndiCare product context" in text or "product knowledge" in text.lower()
