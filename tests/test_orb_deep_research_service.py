from __future__ import annotations

import pytest

from schemas.orb_agents import OrbDeepResearchRequest
from services.orb_deep_research_service import LIVE_WEB_NOTE, orb_deep_research_service
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def seeded_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


@pytest.mark.parametrize("depth", ["quick", "standard", "deep"])
@pytest.mark.asyncio
async def test_deep_research_depths(depth: str):
    request = OrbDeepResearchRequest(
        query="What does guidance say about child voice?",
        depth=depth,
        preferred_output="briefing",
    )
    result = await orb_deep_research_service.run_deep_research(request)
    assert result.depth == depth
    assert result.output.body
    assert result.live_web_note == LIVE_WEB_NOTE
    assert "live web" in " ".join(result.source_gaps + result.warnings).lower()


@pytest.mark.asyncio
async def test_deep_research_clusters_and_citations():
    request = OrbDeepResearchRequest(query="Ofsted SCCIF child voice evidence", depth="standard")
    result = await orb_deep_research_service.run_deep_research(request)
    assert result.citations is not None
    assert result.steps


@pytest.mark.asyncio
async def test_deep_research_with_document_includes_understanding_warning(monkeypatch):
    from schemas.orb_documents import OrbDocumentUnderstanding

    async def stub_analyse(_request):
        return OrbDocumentUnderstanding(
            title="Uploaded",
            plain_english_summary="Document summary for research.",
        )

    monkeypatch.setattr(
        "services.orb_deep_research_service.orb_document_understanding_service.analyse_document",
        stub_analyse,
    )

    request = OrbDeepResearchRequest(
        query="What should we do about this policy?",
        document_text="Policy body text here.",
        depth="standard",
    )
    result = await orb_deep_research_service.run_deep_research(request)
    assert any("standalone document" in w.lower() for w in result.warnings)
    assert result.context_used.get("document_understanding", {}).get("included") is True
    assert result.context_used.get("evaluation")
    assert result.context_used.get("os_linked") is False


def test_identify_gaps_includes_live_web_note():
    gaps = orb_deep_research_service.identify_gaps([], "safeguarding escalation")
    assert any("live web" in g.lower() for g in gaps)
