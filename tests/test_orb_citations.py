from __future__ import annotations

import pytest

from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service


@pytest.fixture
def citation_service():
    return orb_citation_service


def _packs_for(message: str, *, mode: str | None = None, profile: bool = False):
    return orb_knowledge_retrieval_service.retrieve_sources(
        message,
        mode=mode,
        profile_context=profile,
    )


def test_product_answer_citations_include_indicare_context(citation_service):
    citations = citation_service.build_citations(_packs_for("tell me about IndiCare"))
    labels = {c["label"] for c in citations}
    assert "IndiCare product context" in labels
    assert all(c["live_retrieved"] is False for c in citations)


def test_ofsted_answer_citations_include_regulatory_basis(citation_service):
    citations = citation_service.build_citations(_packs_for("what would Ofsted expect"))
    labels = {c["label"] for c in citations}
    assert "Ofsted SCCIF framework knowledge" in labels
    types = {c["type"] for c in citations}
    assert "regulatory_framework" in types


def test_general_answer_citations_include_general_knowledge(citation_service):
    citations = citation_service.build_citations(_packs_for("what is quantum computing"))
    labels = {c["label"] for c in citations}
    assert "General model knowledge" in labels


def test_user_profile_citations(citation_service):
    citations = citation_service.build_citations(
        _packs_for("use this profile", profile=True),
        has_images=False,
    )
    labels = {c["label"] for c in citations}
    assert "User-provided context" in labels


def test_image_citation_added_when_has_images(citation_service):
    citations = citation_service.build_citations(
        _packs_for("look at this"),
        has_images=True,
    )
    labels = {c["label"] for c in citations}
    assert "User-uploaded image" in labels
    image = next(c for c in citations if c["type"] == "image_context")
    assert image["live_retrieved"] is False


def test_no_citation_claims_live_retrieval_by_default(citation_service):
    citations = citation_service.build_citations(_packs_for("Ofsted inspection prep"))
    assert not any(c.get("live_retrieved") for c in citations)


def test_frontend_sources_payload_shape(citation_service):
    citations = citation_service.build_citations(_packs_for("tell me about IndiCare"))
    sources = citation_service.frontend_sources_payload(citations)
    assert sources
    first = sources[0]
    assert "label" in first
    assert "type" in first
    assert "basis" in first


def test_append_sources_basis_does_not_duplicate_section(citation_service):
    citations = citation_service.build_citations(_packs_for("hello"))
    answer = "Sources / basis\n- already there"
    result = citation_service.append_sources_basis(answer, citations)
    assert result == answer


def test_normalise_sources_preserves_basis(citation_service):
    raw = [{"label": "Test", "type": "general_knowledge", "basis": "General model knowledge"}]
    normalised = citation_service.normalise_sources(raw)
    assert normalised[0]["basis"] == "General model knowledge"


def test_frontend_sources_payload_includes_document_fields(citation_service):
    citations = [
        {
            "id": "doc-1",
            "label": "Recording quality — Section 1",
            "type": "document_chunk:recording_quality",
            "basis": "ORB Knowledge Library",
            "note": "Excerpt",
            "document_chunk": True,
            "section": "Section 1",
            "page": "2",
            "origin": "seeded",
            "live_retrieved": False,
        }
    ]
    sources = citation_service.frontend_sources_payload(citations)
    assert sources[0].get("document_chunk") is True
    assert sources[0].get("section") == "Section 1"


def test_ofsted_citations_include_official_metadata(citation_service):
    packs = _packs_for("Ofsted child voice inspection")
    ofsted = next(p for p in packs if p.get("pack_key") == "ofsted_sccif")
    citations = citation_service.build_citations([ofsted])
    assert citations[0].get("official_source") is True
    assert citations[0].get("confidence_level") == "official"


def test_regulation_label_enriches_exact_excerpt_and_url(citation_service):
    citations = citation_service.build_citations(
        [{"pack_key": "childrens_homes_regs", "short_citation_label": "Reg 12", "source_type": "regulatory_framework"}]
    )
    reg = next(c for c in citations if "12" in c.get("label", ""))
    assert reg.get("why_cited")
    assert reg.get("exact_excerpt") or reg.get("excerpt")
    assert reg.get("source_url", "").startswith("https://")
    assert reg.get("exact_text_available") is True


def test_summary_only_citation_marks_basis_type(citation_service):
    citations = citation_service.build_citations(
        [{"pack_key": "general", "short_citation_label": "General model knowledge", "source_type": "general_knowledge"}]
    )
    item = citations[0]
    assert item.get("basis_type") == "summary"
    assert item.get("exact_text_available") is False


def test_rag_citation_governance_fields(citation_service):
    from services.orb_rag_retrieval_service import orb_rag_retrieval_service

    results = [
        {
            "source_id": "x",
            "chunk_index": 0,
            "source_type": "regulatory_framework",
            "citation_label": "Test",
            "source_title": "Test",
            "text": "text",
            "official_source": True,
            "source_confidence": "official",
            "governance_status": "approved",
            "metadata": {"source_version": "v1"},
        }
    ]
    citations = orb_rag_retrieval_service.build_rag_citations(
        results,
        retrieval_strategy="hybrid_semantic_keyword",
    )
    payload = citation_service.frontend_sources_payload(citations)
    assert payload[0].get("official_source") is True
    assert payload[0].get("retrieval_strategy") == "hybrid_semantic_keyword"
