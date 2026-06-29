from __future__ import annotations

from datetime import datetime, timedelta, timezone

from services.orb_exact_citation_service import orb_exact_citation_service


def test_builds_citation_with_section():
    source = {"id": "s1", "title": "Quality Standards guide", "publisher": "DfE"}
    chunk = {
        "source_id": "s1",
        "chunk_index": 2,
        "section": "Positive relationships",
        "page": "12",
        "text": "Staff build warm relationships.",
    }
    label = orb_exact_citation_service.build_exact_citation_label(source, chunk)
    assert "Positive relationships" in label
    assert "p. 12" in label


def test_does_not_invent_page():
    source = {"id": "s1", "title": "Policy"}
    chunk = {"source_id": "s1", "chunk_index": 0, "text": "Some text."}
    label = orb_exact_citation_service.build_exact_citation_label(source, chunk)
    assert "p." not in label
    assert "section/page not available" in label


def test_summary_only_warning():
    source = {"source_integrity": "summary_only", "governance_status": "approved"}
    warn = orb_exact_citation_service.source_warning(source)
    assert warn and "summary" in warn.lower()


def test_exact_citation_allowed_requires_exact_full_document_chunk():
    exact_source = {"id": "guide", "source_integrity": "full_document", "quote_allowed": True}
    exact_chunk = {
        "source_id": "guide",
        "basis_type": "exact",
        "source_integrity": "full_document",
        "quote_allowed": True,
        "source_text_exact": True,
        "quote_basis": "exact_guide_text_official_paragraph",
        "official_paragraph_reference": "1.7",
        "citation_label": "Guide para. 1.7",
        "exact_excerpt": "This Guide is a statement published pursuant to section 23.",
    }
    summary_chunk = {
        "source_id": "guide",
        "basis_type": "summary",
        "source_integrity": "summary_only",
        "citation_label": "Guide summary",
        "text": "Summary only.",
    }
    assert orb_exact_citation_service.exact_citation_allowed(exact_chunk, exact_source) is True
    assert orb_exact_citation_service.exact_citation_allowed(summary_chunk) is False


def test_exact_citation_allows_internal_chunk_only_when_label_is_clear():
    internal_chunk = {
        "source_id": "guide",
        "basis_type": "exact",
        "source_integrity": "full_document",
        "quote_allowed": True,
        "source_text_exact": True,
        "quote_basis": "exact_guide_text_internal_chunk",
        "generated_reference": True,
        "internal_chunk_id": "guide-qpc-004",
        "citation_label": "Guide to the Children's Homes Regulations, section \"Quality and purpose of care\", internal chunk guide-qpc-004",
        "exact_excerpt": "Exact Guide text.",
    }
    misleading_chunk = {
        **internal_chunk,
        "citation_label": "Guide to the Children's Homes Regulations, para. 4.1.2.1",
    }
    assert orb_exact_citation_service.exact_citation_allowed(internal_chunk) is True
    assert orb_exact_citation_service.exact_citation_allowed(misleading_chunk) is False


def test_expired_warning():
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    source = {"expires_at": past, "governance_status": "approved", "source_integrity": "full_document"}
    warn = orb_exact_citation_service.source_warning(source)
    assert warn and "review" in warn.lower()


def test_merge_duplicate_citations():
    citations = [
        {"citation_anchor": "a|1", "exact_citation": "One"},
        {"citation_anchor": "a|1", "exact_citation": "One dup"},
        {"citation_anchor": "b|2", "exact_citation": "Two"},
    ]
    merged = orb_exact_citation_service.merge_duplicate_citations(citations)
    assert len(merged) == 2


def test_citations_for_search_results():
    results = [
        {
            "source_id": "s1",
            "source_title": "SCCIF",
            "source_type": "regulatory_framework",
            "chunk_index": 0,
            "section": "Child voice",
            "text": "Include the child's views.",
            "citation_label": "SCCIF — Child voice",
            "official_source": True,
            "source_confidence": "official",
            "governance_status": "approved",
            "metadata": {"source_integrity": "summary_only"},
        }
    ]
    source_by_id = {
        "s1": {
            "id": "s1",
            "title": "SCCIF",
            "official_source": True,
            "source_integrity": "summary_only",
            "governance_status": "approved",
        }
    }
    citations = orb_exact_citation_service.citations_for_search_results(results, source_by_id=source_by_id)
    assert citations[0].get("exact_citation")
    assert citations[0].get("excerpt")
