"""ORB Residential SCCIF children's homes Phase 2d ingestion tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256,
    EXPECTED_SOURCE_FILE_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum,
    verify_file,
)
from services.orb_residential_sccif_ingestion_service import (
    MAX_SCCIF_CHUNKS_PER_RETRIEVAL,
    SCCIF_CHILDREN_HOMES_SOURCE_ID,
    SCCIF_SOURCE_PATH,
    orb_residential_sccif_ingestion_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-sccif-children-homes-ingestion-phase-2d.md"
SERVICE_PATH = REPO_ROOT / "services" / "orb_residential_sccif_ingestion_service.py"
VERIFIER_PATH = REPO_ROOT / "scripts" / "verify_orb_sccif_children_homes_chunks.py"


@pytest.fixture
def service():
    return orb_residential_sccif_ingestion_service


def service_payload():
    import json

    return json.loads(SCCIF_CHUNKS_PATH.read_text(encoding="utf-8"))


def test_sccif_chunks_exist_and_verify(service):
    assert SCCIF_CHUNKS_PATH.is_file()
    assert SCCIF_SOURCE_PATH.is_file()
    assert verify_file(SCCIF_CHUNKS_PATH) == []
    assert service.chunk_count() == 951
    assert service.source_artefact_exists() is True


def test_source_and_chunk_checksums_are_present_and_verified():
    payload = service_payload()
    assert payload["source"]["source_file_checksum"] == EXPECTED_SOURCE_FILE_SHA256
    assert payload["provenance"]["chunk_json_sha256"] == EXPECTED_CHUNK_JSON_SHA256
    assert calculate_checksum(payload) == EXPECTED_CHUNK_JSON_SHA256


def test_judgement_area_indexing_works(service):
    index = service.judgement_area_index()
    assert "helped_and_protected" in index
    assert "overall_experiences_progress" in service.verified_judgement_areas()


def test_evaluation_area_indexing_works(service):
    index = service.evaluation_area_index()
    assert "good_benchmark" in index
    assert "required_evidence" in index


def test_inspection_evidence_theme_indexing_works(service):
    index = service.inspection_evidence_theme_index()
    assert index


def test_retrieval_by_judgement_area_works(service):
    matches = service.retrieve_chunks(judgement_area="helped_and_protected")
    assert matches
    assert all(match["judgement_area"] == "helped_and_protected" for match in matches)


def test_retrieval_by_evaluation_area_works(service):
    matches = service.retrieve_chunks(evaluation_area="good_benchmark")
    assert matches
    assert any("good_benchmark" in match["evaluation_area"] for match in matches)


def test_retrieval_by_inspection_evidence_theme_works(service):
    matches = service.retrieve_chunks(inspection_evidence_theme="safeguard")
    assert matches


def test_retrieval_by_workflow_domain_works(service):
    matches = service.retrieve_chunks(workflow_domain="safeguarding_concern")
    assert matches
    assert any("safeguarding_concern" in match["related_workflow_domains"] for match in matches)


def test_retrieval_by_quality_standard_works(service):
    matches = service.retrieve_chunks(quality_standard="the protection of children standard")
    assert matches


def test_retrieval_by_regulation_works(service):
    matches = service.retrieve_chunks(regulation="Regulation 44")
    assert matches


def test_retrieval_cap_is_respected(service):
    policy = service.retrieval_policy()
    matches = service.retrieve_chunks(query="safeguarding inspection evidence", limit=50)
    assert 0 < len(matches) <= policy["maximum_exact_chunks"]
    assert len(matches) <= MAX_SCCIF_CHUNKS_PER_RETRIEVAL


def test_no_full_sccif_blob_is_returned(service):
    assert service.returns_full_sccif_blob(limit=50) is False
    bundle = service.source_bundle(query="inspection evidence safeguarding", limit=50)
    assert bundle["never_send_full_sccif_to_llm"] is True
    assert bundle["exact_chunk_count"] < service.chunk_count()


def test_official_sccif_citation_label_requires_verified_reference(service):
    framework_chunks = [
        chunk for chunk in service.chunks() if chunk["generated_metadata"]["content_kind"] == "framework_text"
    ]
    assert framework_chunks
    assert all(service.exact_citation_allowed(chunk) for chunk in framework_chunks[:5])
    sample = dict(framework_chunks[0])
    sample["official_reference"] = "unverified reference"
    assert service.exact_citation_allowed(sample) is False


def test_generated_official_looking_labels_are_rejected_by_verifier():
    payload = service_payload()
    chunk = dict(payload["chunks"][0])
    chunk["generated_metadata"] = dict(chunk["generated_metadata"])
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "SCCIF section 3"
    from scripts.verify_orb_sccif_children_homes_manifest import validate_sccif_children_homes_chunk

    errors = validate_sccif_children_homes_chunk(
        chunk,
        verified_judgement_areas=set(payload["verified_judgement_areas"]),
        verified_official_references=set(payload["verified_official_references"]),
    )
    assert any("Generated citation labels must not look like official SCCIF labels" in error for error in errors)


def test_internal_split_labels_are_unambiguous(service):
    for chunk in service.chunks():
        metadata = chunk.get("generated_metadata") or {}
        if metadata.get("generated_label") is True and chunk.get("quote_allowed") is True:
            label = chunk["citation_label"].lower()
            assert "internal chunk" in label
            assert chunk["internal_chunk_id"] in chunk["citation_label"]


def test_exact_citations_require_exact_source_text(service):
    chunk = next(
        item for item in service.chunks() if item.get("quote_allowed") is True and item.get("text")
    )
    assert chunk["source_text_exact"] is True
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
    from scripts.verify_orb_sccif_children_homes_manifest import validate_sccif_children_homes_chunk

    errors = validate_sccif_children_homes_chunk(
        chunk,
        verified_judgement_areas=set(payload["verified_judgement_areas"]),
        verified_official_references=set(payload["verified_official_references"]),
    )
    assert errors


def test_guide_commentary_is_not_treated_as_sccif_text(service):
    for chunk in service.chunks():
        metadata = chunk.get("generated_metadata") or {}
        assert metadata.get("content_kind") != "guide_commentary_reference"
        assert chunk.get("source_id") == SCCIF_CHILDREN_HOMES_SOURCE_ID


def test_regulations_text_is_not_treated_as_sccif_text(service):
    for chunk in service.chunks():
        metadata = chunk.get("generated_metadata") or {}
        assert metadata.get("content_kind") != "regulations_commentary_reference"


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB predicts the Ofsted judgement.",
        "ORB decides the home is inspection ready.",
        "ORB confirms this evidence meets outstanding.",
        "ORB determines the home is good.",
        "ORB guarantees the inspection outcome.",
        "ORB guarantees compliance.",
        "ORB replaces Ofsted judgement.",
        "ORB replaces inspector judgement.",
        "ORB replaces Registered Manager judgement.",
        "ORB replaces provider judgement.",
    ],
)
def test_unsafe_boundary_wording_is_rejected(unsafe_text: str):
    payload = service_payload()
    chunk = dict(payload["chunks"][0])
    chunk["professional_judgement_boundary"] = unsafe_text
    from scripts.verify_orb_sccif_children_homes_manifest import validate_sccif_children_homes_chunk

    errors = validate_sccif_children_homes_chunk(
        chunk,
        verified_judgement_areas=set(payload["verified_judgement_areas"]),
        verified_official_references=set(payload["verified_official_references"]),
    )
    assert errors


def test_boundary_wording_is_present(service):
    chunk = service.retrieve_chunks(judgement_area="helped_and_protected")[0]
    blocked = " ".join(chunk["not_to_be_used_for"]).lower()
    assert "predict" in blocked
    assert "inspection readiness" in blocked
    assert "outcome" in blocked
    assert "does not predict" in chunk["grade_prediction_boundary"].lower()
    assert "does not decide" in chunk["inspection_readiness_boundary"].lower()
    assert "does not guarantee" in chunk["compliance_guarantee_boundary"].lower()


@pytest.mark.parametrize(
    "confirmation",
    [
        "judgement_area_mapping_confirmed",
        "evaluation_area_mapping_confirmed",
        "inspection_evidence_theme_mapping_confirmed",
        "quote_allowed_status_confirmed",
        "related_quality_standards_mapping_confirmed",
        "related_regulations_mapping_confirmed",
    ],
)
def test_missing_human_review_confirmations_fail(confirmation: str):
    payload = service_payload()
    review = dict(payload["human_review"])
    del review[confirmation]
    payload = dict(payload)
    payload["human_review"] = review
    from scripts.verify_orb_sccif_children_homes_manifest import validate_sccif_children_homes_payload

    errors = validate_sccif_children_homes_payload(payload)
    assert any(f"human_review.{confirmation}" in error for error in errors)


def test_guide_chunks_are_unchanged():
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(guide_payload["chunks"]) == 371
    assert calculate_guide_checksum(guide_payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_regulations_2015_chunks_are_unchanged():
    regulations_payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    assert len(regulations_payload["chunks"]) == 100
    assert calculate_regulations_checksum(regulations_payload) == EXPECTED_REGULATIONS_CHUNK_JSON_SHA256


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


def test_knowledge_retrieval_service_was_not_wired_to_sccif_chunks():
    source = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(encoding="utf-8")
    assert "orb_residential_sccif_ingestion_service" not in source


def test_phase_2d_documentation_exists_and_preserves_scope():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Phase 2d" in content
    assert "SCCIF source text ingested?" in content
    assert "Guide chunk content changed?" in content
    assert "Regulations 2015 chunk content changed?" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
    assert "live orb answer wiring" in content.lower()
