"""ORB Residential Regulations 2015 Phase 2b ingestion tests."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256,
    EXPECTED_SOURCE_FILE_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum,
    verify_file,
)
from services.orb_residential_regulations_2015_ingestion_service import (
    MAX_REGULATIONS_CHUNKS_PER_RETRIEVAL,
    REGULATIONS_2015_SOURCE_ID,
    REGULATIONS_SOURCE_PATH,
    orb_residential_regulations_2015_ingestion_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-regulations-2015-ingestion-phase-2b.md"
SERVICE_PATH = REPO_ROOT / "services" / "orb_residential_regulations_2015_ingestion_service.py"
VERIFIER_PATH = REPO_ROOT / "scripts" / "verify_orb_regulations_2015_chunks.py"


@pytest.fixture
def service():
    return orb_residential_regulations_2015_ingestion_service


def test_regulations_2015_chunks_exist_and_verify(service):
    assert REGULATIONS_CHUNKS_PATH.is_file()
    assert REGULATIONS_SOURCE_PATH.is_file()
    assert verify_file(REGULATIONS_CHUNKS_PATH) == []
    assert service.chunk_count() == 100
    assert service.source_artefact_exists() is True


def test_source_and_chunk_checksums_are_present_and_verified():
    payload = service_payload()
    assert payload["source"]["source_file_checksum"] == EXPECTED_SOURCE_FILE_SHA256
    assert payload["provenance"]["chunk_json_sha256"] == EXPECTED_CHUNK_JSON_SHA256
    assert calculate_checksum(payload) == EXPECTED_CHUNK_JSON_SHA256


def service_payload():
    import json

    return json.loads(REGULATIONS_CHUNKS_PATH.read_text(encoding="utf-8"))


def test_regulation_number_indexing_works(service):
    index = service.regulation_index()
    assert index["by_number"]
    assert "12" in index["by_number"]
    assert service.verified_regulation_numbers()
    assert "12" in service.verified_regulation_numbers()


def test_retrieval_by_regulation_number_works(service):
    matches = service.retrieve_chunks(regulation_number="12")
    assert matches
    assert all(match["regulation_number"] == "12" for match in matches)
    assert all(match["source_id"] == REGULATIONS_2015_SOURCE_ID for match in matches)


def test_retrieval_by_part_works(service):
    matches = service.retrieve_chunks(part_number="2")
    assert matches
    assert all(match["part_number"] == "2" for match in matches)


def test_retrieval_by_schedule_works(service):
    matches = service.retrieve_chunks(schedule_number="1")
    assert matches
    assert all(match["schedule_number"] == "1" for match in matches)


def test_retrieval_by_workflow_domain_works(service):
    matches = service.retrieve_chunks(workflow_domain="safeguarding_concern")
    assert matches
    assert any("safeguarding_concern" in match["related_workflow_domains"] for match in matches)


def test_retrieval_by_quality_standard_works(service):
    matches = service.retrieve_chunks(quality_standard="Protection of children")
    assert matches
    assert any("Protection of children" in match["related_quality_standards"] for match in matches)


def test_retrieval_cap_is_respected(service):
    policy = service.retrieval_policy()
    matches = service.retrieve_chunks(query="children home regulation safeguarding", limit=50)
    assert 0 < len(matches) <= policy["maximum_exact_chunks"]
    assert len(matches) <= MAX_REGULATIONS_CHUNKS_PER_RETRIEVAL


def test_no_full_regulations_blob_is_returned(service):
    assert service.returns_full_regulations_blob(limit=50) is False
    bundle = service.source_bundle(query="regulation children home", limit=50)
    assert bundle["never_send_full_regulations_to_llm"] is True
    assert bundle["exact_chunk_count"] < service.chunk_count()


def test_regulation_12_citation_label_requires_verified_regulation_number(service):
    reg12_chunks = service.retrieve_chunks(regulation_number="12")
    assert reg12_chunks
    assert all(chunk["regulation_number"] == "12" for chunk in reg12_chunks)
    assert all("internal chunk" in chunk["citation_label"] for chunk in reg12_chunks)
    assert all(service.exact_citation_allowed(chunk) for chunk in reg12_chunks)

    official = service.retrieve_chunks(regulation_number="1")[0]
    assert "Regulation 1" in official["citation_label"]
    assert service.exact_citation_allowed(official) is True

    fake = dict(official)
    fake["regulation_number"] = "99"
    fake["citation_label"] = "The Children's Homes (England) Regulations 2015, Regulation 1"
    assert service.exact_citation_allowed(fake) is False


def test_generated_official_looking_labels_are_rejected_by_verifier():
    payload = service_payload()
    chunk = dict(payload["chunks"][0])
    chunk["generated_metadata"] = dict(chunk["generated_metadata"])
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "Regulation 12"
    from scripts.verify_orb_regulations_2015_manifest import validate_regulations_2015_chunk

    errors = validate_regulations_2015_chunk(
        chunk,
        verified_regulation_numbers=set(payload["verified_regulation_numbers"]),
    )
    assert any("Generated citation labels must not look like official Regulation labels" in error for error in errors)


def test_internal_split_labels_are_unambiguous(service):
    for chunk in service.chunks():
        metadata = chunk.get("generated_metadata") or {}
        if metadata.get("generated_label") is True:
            label = chunk["citation_label"].lower()
            assert "internal chunk" in label
            assert chunk["internal_chunk_id"] in chunk["citation_label"]


def test_exact_citations_require_exact_source_text(service):
    chunk = service.retrieve_chunks(regulation_number="12")[0]
    assert chunk["source_text_exact"] is True
    assert chunk["text"]
    assert service.exact_citation_allowed(chunk) is True
    broken = dict(chunk)
    broken["source_text_exact"] = False
    assert service.exact_citation_allowed(broken) is False


def test_metadata_cannot_be_quote_allowed():
    payload = service_payload()
    chunk = dict(payload["chunks"][0])
    chunk["generated_metadata"] = {
        "content_kind": "generated_metadata",
        "generated_label": True,
        "quote_allowed": True,
    }
    chunk["quote_basis"] = "generated_metadata"
    from scripts.verify_orb_regulations_2015_manifest import validate_regulations_2015_chunk

    errors = validate_regulations_2015_chunk(
        chunk,
        verified_regulation_numbers=set(payload["verified_regulation_numbers"]),
    )
    assert errors


def test_guide_commentary_is_not_treated_as_regulations_text(service):
    for chunk in service.chunks():
        metadata = chunk.get("generated_metadata") or {}
        assert metadata.get("content_kind") != "guide_commentary_reference"
        assert chunk.get("source_id") == REGULATIONS_2015_SOURCE_ID


def test_boundary_wording_is_present(service):
    chunk = service.retrieve_chunks(regulation_number="12")[0]
    blocked = " ".join(chunk["not_to_be_used_for"]).lower()
    assert "legal advice" in blocked
    assert "compliance" in blocked
    assert "notification" in blocked
    assert "ofsted" in blocked
    assert "does not provide legal advice" in chunk["legal_advice_boundary"].lower()


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB decides statutory compliance.",
        "ORB guarantees compliance with Regulation 12.",
        "ORB decides whether Regulation 40 notification is required.",
        "ORB gives legal advice on the Regulations.",
        "ORB guarantees the Ofsted outcome.",
    ],
)
def test_unsafe_boundary_wording_is_rejected(unsafe_text: str):
    payload = service_payload()
    chunk = dict(payload["chunks"][0])
    chunk["professional_judgement_boundary"] = unsafe_text
    from scripts.verify_orb_regulations_2015_manifest import validate_regulations_2015_chunk

    errors = validate_regulations_2015_chunk(
        chunk,
        verified_regulation_numbers=set(payload["verified_regulation_numbers"]),
    )
    assert errors


def test_human_review_approval_is_required():
    payload = service_payload()
    review = payload["human_review"]
    assert review["status"] == "approved"
    assert review["chunk_boundaries_confirmed"] is True
    assert review["quote_allowed_status_confirmed"] is True
    assert review["related_quality_standards_mapping_confirmed"] is True
    assert review["related_workflow_domains_mapping_confirmed"] is True


def test_missing_human_review_confirmations_fail():
    payload = service_payload()
    review = dict(payload["human_review"])
    del review["chunk_boundaries_confirmed"]
    payload = dict(payload)
    payload["human_review"] = review
    from scripts.verify_orb_regulations_2015_manifest import validate_regulations_2015_payload

    errors = validate_regulations_2015_payload(payload)
    assert any("chunk_boundaries_confirmed" in error for error in errors)


def test_guide_chunks_are_unchanged():
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(guide_payload["chunks"]) == 371
    assert calculate_guide_checksum(guide_payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_sccif_is_not_ingested():
    payload = service_payload()
    assert payload["excluded_sources"]["ofsted_sccif_childrens_homes_full_text_ingested"] is False
    assert not (REPO_ROOT / "data" / "orb_residential_ingestion" / "ofsted_sccif_childrens_homes_chunks.json").exists()


def test_no_live_runtime_wiring_occurred(service):
    assert service.runtime_answer_wiring_enabled() is False
    assert service.runtime_scraping_or_downloading_performed() is False
    payload = service_payload()
    assert payload["runtime_answer_wiring_changed"] is False
    assert payload["frontend_behaviour_changed"] is False
    assert payload["retrieval_policy"]["runtime_answer_wiring_enabled"] is False


def test_no_route_frontend_or_os_assistant_files_changed():
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "import requests",
        "import httpx",
        "urllib.request",
        "frontend/",
        "frontend-next",
        "orb_voice",
        "dictate",
        "communicate",
        "assistant_os_knowledge_routes",
        "assistant_routes",
        "ai_gateway",
    )
    for path in (SERVICE_PATH, VERIFIER_PATH):
        source = path.read_text(encoding="utf-8")
        for marker in forbidden:
            assert marker not in source


def test_knowledge_retrieval_service_was_not_wired_to_regulations_chunks():
    source = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(encoding="utf-8")
    assert "orb_residential_regulations_2015_ingestion_service" not in source


def test_phase_2b_documentation_exists_and_preserves_scope():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2b" in content
    assert "SCCIF" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
    assert "live orb answer wiring" in content.lower()
