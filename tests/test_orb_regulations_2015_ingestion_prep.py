"""ORB Residential Regulations 2015 ingestion-prep tests.

Non-invasive guards only. These tests do not ingest, scrape, download, or wire
runtime retrieval.
"""

from __future__ import annotations

import copy
from pathlib import Path

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_manifest import (
    REQUIRED_HUMAN_REVIEW_CONFIRMATIONS,
    REQUIRED_MANIFEST_FIELDS,
    regulation_chunk_schema,
    regulations_2015_manifest_schema,
    regulations_2015_manifest_template,
    validate_regulations_2015_chunk,
    validate_regulations_2015_manifest,
    validate_regulations_2015_payload,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "verify_orb_regulations_2015_manifest.py"
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-regulations-2015-ingestion-prep.md"


def _manifest() -> dict:
    manifest = regulations_2015_manifest_template()
    manifest.update(
        {
            "version": "Synthetic reviewed version placeholder",
            "last_verified_date": "2026-06-29",
            "source_file_path": (
                "data/orb_residential_ingestion/"
                "children_homes_regulations_2015_source.txt"
            ),
            "source_file_checksum": "a" * 64,
        }
    )
    return manifest


def _chunk() -> dict:
    manifest = _manifest()
    return {
        "source_id": manifest["source_id"],
        "regulation_number": "12",
        "regulation_title": "Synthetic regulation title for validation only",
        "part_number": "2",
        "part_title": "Synthetic part title",
        "schedule_number": "",
        "schedule_title": "",
        "official_reference": "regulation 12",
        "internal_chunk_id": "internal:regulations-2015:reg-12:0001",
        "source_text_exact": True,
        "generated_metadata": {
            "content_kind": "regulation_text",
            "generated_label": False,
            "source_text_present_in_this_pr": False,
        },
        "quote_allowed": True,
        "quote_basis": "exact_regulation_text_after_human_review",
        "citation_label": "The Children's Homes (England) Regulations 2015, Regulation 12",
        "related_quality_standards": ["The protection of children standard"],
        "related_workflow_domains": ["safeguarding_concern"],
        "requires_local_policy": True,
        "professional_judgement_boundary": "Registered manager and provider judgement remains required.",
        "legal_advice_boundary": "ORB cannot provide legal advice.",
        "not_to_be_used_for": [
            "providing legal advice",
            "deciding statutory compliance",
            "deciding notification thresholds",
            "replacing registered manager or provider judgement",
            "guaranteeing Ofsted outcomes",
        ],
    }


def _human_review() -> dict:
    review = {
        "status": "approved",
        "reviewer": "ORB reviewer",
        "reviewed_at": "2026-06-29T12:00:00Z",
    }
    review.update({field: True for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS})
    return review


def _payload() -> dict:
    return {
        "schema_version": "orb-regulations-2015-ingestion-prep-v1",
        "source": _manifest(),
        "verified_regulation_numbers": ["12"],
        "chunks": [_chunk()],
        "human_review": _human_review(),
        "excluded_sources": {
            "childrens_homes_regulations_2015_full_text_ingested": False,
            "ofsted_sccif_childrens_homes_full_text_ingested": False,
        },
        "runtime_answer_wiring_changed": False,
        "frontend_behaviour_changed": False,
    }


def _manifest_errors(manifest: dict) -> str:
    return "\n".join(validate_regulations_2015_manifest(manifest))


def _chunk_errors(chunk: dict, verified: set[str] | None = None) -> str:
    return "\n".join(
        validate_regulations_2015_chunk(
            chunk,
            verified_regulation_numbers={"12"} if verified is None else verified,
        )
    )


def _payload_errors(payload: dict) -> str:
    return "\n".join(validate_regulations_2015_payload(payload))


def test_regulations_2015_manifest_schema_exists():
    schema = regulations_2015_manifest_schema()
    assert set(REQUIRED_MANIFEST_FIELDS) <= set(schema)
    assert schema["official_url"]["required"] is True
    assert schema["requires_human_review"]["type"] == "boolean"


def test_manifest_requires_official_url_publisher_jurisdiction_version_and_checksum():
    for field in (
        "official_url",
        "publisher",
        "jurisdiction",
        "version",
        "source_file_checksum",
    ):
        manifest = _manifest()
        manifest[field] = ""
        errors = _manifest_errors(manifest)
        assert f"source.{field} must be present" in errors


def test_regulation_number_indexing_is_required():
    manifest = _manifest()
    manifest["regulation_index_required"] = False
    errors = _manifest_errors(manifest)
    assert "source.regulation_index_required must be true" in errors


def test_part_and_schedule_indexing_requirements_are_represented():
    schema = regulations_2015_manifest_schema()
    chunk_schema = regulation_chunk_schema()
    assert "part_index_required" in schema
    assert "schedule_index_required" in schema
    assert "part_number" in chunk_schema
    assert "schedule_number" in chunk_schema


def test_missing_source_checksum_is_rejected():
    manifest = _manifest()
    manifest["source_file_checksum"] = ""
    errors = _manifest_errors(manifest)
    assert "source.source_file_checksum must be present" in errors


def test_missing_regulation_number_is_rejected_for_regulation_chunks():
    chunk = _chunk()
    chunk["regulation_number"] = ""
    errors = _chunk_errors(chunk)
    assert "regulation_text chunks require regulation_number" in errors


def test_regulation_12_label_is_rejected_unless_verified_regulation_number_exists():
    chunk = _chunk()
    errors = _chunk_errors(chunk, verified=set())
    assert "Official regulation citation labels require a verified regulation_number" in errors

    assert _chunk_errors(chunk, verified={"12"}) == ""


def test_internal_chunk_labels_are_accepted_only_when_clearly_internal():
    chunk = _chunk()
    chunk["official_reference"] = ""
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "internal chunk internal:regulations-2015:reg-12:0001"
    assert "Generated/internal splits" not in _chunk_errors(chunk, verified=set())

    chunk["citation_label"] = "Regulations 2015 split 0001"
    errors = _chunk_errors(chunk, verified=set())
    assert "Generated/internal splits must use a clear internal chunk label" in errors
    assert "Quote-allowed internal chunks require a clear internal chunk label" in errors


def test_generated_official_looking_labels_are_rejected():
    chunk = _chunk()
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "Regulation 12"
    errors = _chunk_errors(chunk, verified={"12"})
    assert "Generated citation labels must not look like official Regulation labels" in errors


def test_exact_citations_require_exact_source_text():
    chunk = _chunk()
    chunk["source_text_exact"] = False
    errors = _chunk_errors(chunk)
    assert "Exact citations require exact Regulation source text" in errors


def test_metadata_cannot_be_quote_allowed():
    chunk = _chunk()
    chunk["generated_metadata"]["content_kind"] = "generated_metadata"
    chunk["generated_metadata"]["quote_allowed"] = True
    chunk["quote_basis"] = "generated_metadata"
    errors = _chunk_errors(chunk)
    assert "Only exact regulation or schedule text may be quote-allowed" in errors
    assert "Metadata cannot be cited as exact Regulation source text" in errors
    assert "Generated metadata cannot be quote-allowed" in errors


def test_compliance_guarantee_wording_is_rejected():
    chunk = _chunk()
    chunk["professional_judgement_boundary"] = "ORB guarantees statutory compliance when this is followed."
    errors = _chunk_errors(chunk)
    assert "must not claim compliance is guaranteed" in errors


def test_legal_advice_wording_is_rejected():
    chunk = _chunk()
    chunk["citation_label"] = "ORB legal advice on Regulation 12"
    errors = _chunk_errors(chunk)
    assert "must not present ORB as giving legal advice" in errors


def test_embedded_guide_references_are_not_treated_as_regulations_2015_ingestion():
    chunk = _chunk()
    chunk["generated_metadata"]["content_kind"] = "guide_commentary_reference"
    chunk["quote_allowed"] = False
    chunk["quote_basis"] = "none_until_human_review"
    chunk["citation_label"] = (
        "Guide commentary reference, internal chunk "
        "internal:regulations-2015:reg-12:0001"
    )
    chunk["treat_as_regulations_ingestion"] = True
    errors = _chunk_errors(chunk)
    assert "Embedded Guide references must not be treated as Regulations 2015 ingestion" in errors


def test_no_regulations_2015_source_text_is_ingested_in_this_pr():
    payload = _payload()
    assert _payload_errors(payload) == ""

    regulations_files = [
        path
        for path in (REPO_ROOT / "data" / "orb_residential_ingestion").glob(
            "*regulations_2015*"
        )
        if path.name != "guide_to_childrens_homes_regulations_chunks.json"
    ]
    assert regulations_files == []

    changed = copy.deepcopy(payload)
    changed["excluded_sources"]["childrens_homes_regulations_2015_full_text_ingested"] = True
    errors = _payload_errors(changed)
    assert "Regulations 2015 full-text ingestion flag must remain false" in errors


def test_sccif_is_not_ingested_by_regulations_prep():
    payload = _payload()
    payload["excluded_sources"]["ofsted_sccif_childrens_homes_full_text_ingested"] = True
    errors = _payload_errors(payload)
    assert "SCCIF full-text ingestion flag must remain false" in errors

    assert not (
        REPO_ROOT
        / "data"
        / "orb_residential_ingestion"
        / "ofsted_sccif_childrens_homes_chunks.json"
    ).exists()


def test_guide_chunks_are_unchanged():
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(guide_payload["chunks"]) == 371
    assert calculate_guide_checksum(guide_payload) == EXPECTED_CHUNK_JSON_SHA256


def test_no_runtime_frontend_route_or_os_assistant_wiring_occurred():
    source = SCRIPT_PATH.read_text(encoding="utf-8")
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
    for marker in forbidden:
        assert marker not in source


def test_regulations_2015_documentation_exists_and_preserves_scope():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Regulations 2015 Source-Specific Ingestion Prep" in content
    assert "No Regulations 2015 source text is ingested" in content
    assert "SCCIF is not ingested" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
