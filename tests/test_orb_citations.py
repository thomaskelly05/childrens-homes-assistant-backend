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
