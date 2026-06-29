from __future__ import annotations

import re
from pathlib import Path

from services.orb_residential_guide_ingestion_service import (
    EXCLUDED_FULL_TEXT_SOURCE_IDS,
    GUIDE_CHUNKS_PATH,
    GUIDE_SOURCE_ID,
    QUALITY_STANDARD_NAMES,
    orb_residential_guide_ingestion_service,
)
from services.orb_residential_governed_ingestion_prep_service import (
    REQUIRED_CHUNK_METADATA_FIELDS,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_guide_is_structured_full_text_chunks_not_summary_metadata():
    service = orb_residential_guide_ingestion_service
    chunks = service.chunks()
    assert GUIDE_CHUNKS_PATH.is_file()
    assert service.source_metadata()["source_integrity"] == "full_document"
    assert service.source_metadata()["runtime_fetch_required"] is False
    assert service.chunk_count() == 371
    assert service.chunk_count() > 100
    assert {chunk["source_id"] for chunk in chunks} == {GUIDE_SOURCE_ID}
    assert all(chunk["basis_type"] == "exact" for chunk in chunks)
    assert all(chunk["source_integrity"] == "full_document" for chunk in chunks)
    assert all(chunk["exact_excerpt"] for chunk in chunks)
    assert max(len(chunk["text"]) for chunk in chunks) < 1300


def test_guide_chunks_include_required_metadata_fields():
    required = set(REQUIRED_CHUNK_METADATA_FIELDS)
    for chunk in orb_residential_guide_ingestion_service.chunks():
        assert required <= set(chunk)
        assert chunk["official_url"].startswith("https://www.gov.uk/")
        assert chunk["publisher"] == "Department for Education"
        assert chunk["version"]
        assert chunk["last_verified_date"]
        assert isinstance(chunk["related_regulations"], list)
        assert isinstance(chunk["related_workflow_domains"], list)
        assert isinstance(chunk["not_to_be_used_for"], list)
        assert chunk["internal_chunk_id"].startswith("guide-")
        assert isinstance(chunk["generated_metadata"], dict)
        assert chunk["source_text_exact"] is True
        assert chunk["quote_basis"]


def test_chunks_map_to_all_nine_quality_standards():
    standards = {
        chunk["quality_standard"]
        for chunk in orb_residential_guide_ingestion_service.chunks()
        if chunk.get("quality_standard")
    }
    assert standards == set(QUALITY_STANDARD_NAMES)
    for standard in QUALITY_STANDARD_NAMES:
        matches = orb_residential_guide_ingestion_service.retrieve_chunks(
            quality_standard=standard,
        )
        assert matches
        assert all(match["quality_standard"] == standard for match in matches)


def test_exact_citation_requires_exact_guide_chunk():
    service = orb_residential_guide_ingestion_service
    chunk = service.retrieve_chunks(quality_standard="Protection of children")[0]
    assert service.exact_citation_allowed(chunk) is True

    metadata_only_summary = {
        "source_id": GUIDE_SOURCE_ID,
        "source_integrity": "summary_only",
        "basis_type": "summary",
        "citation_label": "Guide metadata summary",
        "summary": "Quality Standards summary only.",
        "quote_allowed": False,
    }
    assert service.metadata_summary_can_be_exact_citation(metadata_only_summary) is False


def test_quote_allowed_chunks_do_not_present_generated_refs_as_official_paragraphs():
    generated_multi_dot = re.compile(r"^\d{1,2}\.\d{1,2}\.\d+")
    integer_ref = re.compile(r"^\d{1,2}$")
    for chunk in orb_residential_guide_ingestion_service.chunks():
        if chunk["quote_allowed"] is not True:
            continue
        original = str(chunk.get("original_extracted_reference") or "")
        paragraph_reference = chunk.get("paragraph_reference")
        label = chunk["citation_label"].lower()

        assert not (paragraph_reference and generated_multi_dot.match(str(paragraph_reference)))
        assert not (paragraph_reference and integer_ref.match(str(paragraph_reference)))
        if generated_multi_dot.match(original) or integer_ref.match(original):
            assert chunk["official_paragraph_reference"] is None
            assert paragraph_reference is None
            assert "internal chunk" in label
            assert "official guide paragraph" not in label


def test_every_quote_allowed_chunk_has_verified_official_or_internal_label():
    for chunk in orb_residential_guide_ingestion_service.chunks():
        if chunk["quote_allowed"] is not True:
            continue
        label = chunk["citation_label"].lower()
        has_official = bool(chunk.get("official_paragraph_reference"))
        has_internal = "internal chunk" in label and chunk["internal_chunk_id"] in chunk["citation_label"]
        assert has_official or has_internal
        assert chunk["quote_basis"] in {
            "exact_guide_text_official_paragraph",
            "exact_guide_text_official_paragraph_with_embedded_regulation_excerpt",
            "exact_guide_text_internal_chunk",
            "exact_guide_text_internal_chunk_with_embedded_regulation_excerpt",
        }


def test_generated_metadata_is_not_quotable_source_text():
    service = orb_residential_guide_ingestion_service
    chunk = service.retrieve_chunks(source_id=GUIDE_SOURCE_ID)[0]
    generated_metadata_as_chunk = {
        "source_id": GUIDE_SOURCE_ID,
        "basis_type": "exact",
        "source_integrity": "full_document",
        "quote_allowed": True,
        "source_text_exact": False,
        "quote_basis": "generated_metadata",
        "citation_label": f"Generated metadata for {chunk['internal_chunk_id']}",
        "exact_excerpt": str(chunk["generated_metadata"]),
        "generated_metadata": chunk["generated_metadata"],
    }
    assert service.exact_citation_allowed(generated_metadata_as_chunk) is False


def test_embedded_regulation_excerpts_are_labelled_as_guide_chunks_not_regulations_ingestion():
    embedded = [
        chunk
        for chunk in orb_residential_guide_ingestion_service.chunks()
        if chunk.get("contains_embedded_regulation_excerpt")
    ]
    assert embedded
    for chunk in embedded:
        label = chunk["citation_label"].lower()
        assert chunk["source_id"] == GUIDE_SOURCE_ID
        assert "guide-embedded regulation excerpt" in label
        assert "not regulations 2015 full-text ingestion" in label


def test_guide_chunks_do_not_claim_compliance_guarantee():
    chunks = orb_residential_guide_ingestion_service.chunks()
    for chunk in chunks:
        blocked = " ".join(chunk["not_to_be_used_for"]).lower()
        boundary = chunk["professional_judgement_boundary"].lower()
        assert "guaranteeing compliance" in blocked
        assert "does not replace" in boundary
        assert "guarantees compliance" not in chunk["text"].lower()


def test_retrieval_selects_by_quality_standard_workflow_regulation_keyword_and_source():
    service = orb_residential_guide_ingestion_service
    by_standard = service.retrieve_chunks(quality_standard="Leadership and management")
    assert by_standard
    assert all(chunk["quality_standard"] == "Leadership and management" for chunk in by_standard)

    by_workflow = service.retrieve_chunks(workflow_domain="missing_from_care")
    assert by_workflow
    assert all("missing_from_care" in chunk["related_workflow_domains"] for chunk in by_workflow)

    by_regulation = service.retrieve_chunks(regulation_reference="Reg 12")
    assert by_regulation
    assert all("Reg 12" in chunk["related_regulations"] for chunk in by_regulation)

    by_keyword = service.retrieve_chunks(query="advocate children needs met")
    assert by_keyword
    assert any("advocate" in chunk["text"].lower() for chunk in by_keyword)

    by_source = service.retrieve_chunks(source_id=GUIDE_SOURCE_ID)
    assert by_source
    assert all(chunk["source_id"] == GUIDE_SOURCE_ID for chunk in by_source)


def test_retrieval_does_not_return_whole_guide_and_respects_source_bundle_caps():
    service = orb_residential_guide_ingestion_service
    policy = service.retrieval_policy()
    results = service.retrieve_chunks(query="quality standards care planning leadership", limit=50)
    assert 0 < len(results) <= policy["maximum_exact_chunks"]
    assert len(results) < service.chunk_count()

    bundle = service.source_bundle(workflow_domain="incident_recording", limit=50)
    assert bundle["never_send_full_guide_to_llm"] is True
    assert bundle["deterministic_selection_before_llm"] is True
    assert bundle["exact_chunk_count"] <= policy["maximum_exact_chunks"]
    assert len(" ".join(chunk["text"] for chunk in bundle["chunks"])) < 4000


def test_no_regulations_sccif_catalogue_or_runtime_fetch_ingestion():
    service = orb_residential_guide_ingestion_service
    assert service.full_text_source_ids() == {GUIDE_SOURCE_ID}
    assert service.full_text_source_ids().isdisjoint(EXCLUDED_FULL_TEXT_SOURCE_IDS)
    exclusions = service.excluded_sources()
    assert exclusions["childrens_homes_regulations_2015_full_text_ingested"] is False
    assert exclusions["ofsted_sccif_childrens_homes_full_text_ingested"] is False
    assert exclusions["full_113_source_catalogue_ingested"] is False
    assert service.runtime_scraping_or_downloading_performed() is False


def test_runtime_routes_frontend_os_assistant_and_nr_1_surfaces_are_untouched():
    service_source = (
        REPO_ROOT / "services" / "orb_residential_guide_ingestion_service.py"
    ).read_text(encoding="utf-8")
    forbidden = (
        "from fastapi",
        "import requests",
        "import httpx",
        "urllib.request",
        "from routers",
        "assistant_os_knowledge_routes",
        "frontend/",
        "orb_voice",
        "dictate",
        "communicate",
    )
    for marker in forbidden:
        assert marker not in service_source
