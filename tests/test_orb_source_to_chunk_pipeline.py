from __future__ import annotations

import copy
from pathlib import Path

from scripts.orb_source_to_chunk_pipeline import (
    INPUT_RULES,
    REGULATIONS_2015_SOURCE_ID,
    REQUIRED_HUMAN_REVIEW_CONFIRMATIONS,
    REQUIRED_MANIFEST_FIELDS,
    RESERVED_FUTURE_SOURCE_IDS,
    SCCIF_SOURCE_ID,
    build_scaffold_payload,
    calculate_canonical_json_sha256,
    source_manifest_schema,
    validate_pipeline_payload,
    validate_source_manifest,
)
from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "orb_source_to_chunk_pipeline.py"
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-source-to-chunk-pipeline.md"


def _manifest() -> dict:
    return {
        "source_id": "future_tier_1_source",
        "source_title": "Future Tier 1 Reviewed Source",
        "source_type": "statutory_guidance",
        "official_url": "https://www.gov.uk/future-reviewed-source",
        "publisher": "Department for Education",
        "version": "Reviewed version 1",
        "last_verified_date": "2026-06-29",
        "jurisdiction": "England",
        "statutory_status": "statutory_guidance",
        "citation_authority": "authoritative_guidance",
        "source_file_path": "data/orb_residential_ingestion/future_tier_1_source.txt",
        "source_file_checksum": "a" * 64,
        "ingestion_scope": "scaffold validation only",
        "excluded_sections": ["appendix not in scope"],
        "requires_human_review": True,
        "allowed_quote_basis": ["exact_source_text_internal_chunk"],
        "not_to_be_used_for": [
            "guaranteing compliance",
            "predicting Ofsted grades",
            "replacing professional judgement",
        ],
        "professional_judgement_boundary": "Adults and managers remain responsible for judgement and local procedure.",
        "required_mappings": ["daily_recording"],
    }


def _human_review() -> dict:
    review = {
        "status": "approved",
        "reviewer": "ORB reviewer",
        "reviewed_at": "2026-06-29T11:00:00Z",
    }
    review.update({field: True for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS})
    return review


def _chunk() -> dict:
    manifest = _manifest()
    return {
        "chunk_id": "future-tier-1-source-0001",
        "chunk_index": 0,
        "source_id": manifest["source_id"],
        "source_title": manifest["source_title"],
        "source_type": manifest["source_type"],
        "official_url": manifest["official_url"],
        "publisher": manifest["publisher"],
        "version": manifest["version"],
        "last_verified_date": manifest["last_verified_date"],
        "source_file_checksum": manifest["source_file_checksum"],
        "section_heading": "Reviewed section",
        "paragraph_reference": None,
        "official_paragraph_reference": None,
        "official_reference_present_in_source": False,
        "generated_reference": True,
        "internal_chunk_id": "internal:future-tier-1-source:0001",
        "quality_standard": "Quality and purpose of care",
        "related_regulations": ["Reg 12"],
        "related_workflow_domains": ["daily_recording"],
        "regulation_number": None,
        "sccif_judgement_area": None,
        "workflow_domains": ["daily_recording"],
        "citation_label": "Future Tier 1 Reviewed Source, section Reviewed section, internal chunk internal:future-tier-1-source:0001",
        "citation_boundary": "internal generated split, not an official paragraph label",
        "basis_type": "exact",
        "quote_allowed": True,
        "quote_basis": "exact_source_text_internal_chunk",
        "source_text_exact": True,
        "generated_metadata": {"split_reason": "size cap"},
        "retrieval_priority": 1,
        "requires_local_policy": False,
        "professional_judgement_boundary": manifest["professional_judgement_boundary"],
        "not_to_be_used_for": manifest["not_to_be_used_for"],
        "exact_excerpt": "Adults should record what happened, what was observed, and what support was offered.",
        "text": "Adults should record what happened, what was observed, and what support was offered.",
        "content_hash": "b" * 64,
    }


def _payload() -> dict:
    return build_scaffold_payload(_manifest(), [_chunk()], human_review=_human_review(), expected_chunk_count=1)


def _errors_for(payload: dict) -> str:
    return "\n".join(validate_pipeline_payload(payload, expected_chunk_count=1))


def test_source_manifest_schema_exists():
    schema = source_manifest_schema()
    assert set(REQUIRED_MANIFEST_FIELDS) <= set(schema)
    assert schema["requires_human_review"]["type"] == "boolean"


def test_source_manifest_requires_official_url_publisher_version_and_checksum():
    manifest = _manifest()
    for field in ("official_url", "publisher", "version", "source_file_checksum"):
        invalid = copy.deepcopy(manifest)
        invalid[field] = ""
        errors = "\n".join(validate_source_manifest(invalid))
        assert f"source.{field} must be present" in errors


def test_pipeline_refuses_missing_source_checksum():
    manifest = _manifest()
    manifest["source_file_checksum"] = ""
    errors = "\n".join(validate_source_manifest(manifest))
    assert "source.source_file_checksum must be recorded before chunk generation" in errors


def test_pipeline_refuses_uncontrolled_runtime_web_fetching():
    manifest = _manifest()
    manifest["runtime_web_fetch_allowed"] = True
    manifest["source_file_path"] = "https://www.gov.uk/live-source"
    errors = "\n".join(validate_source_manifest(manifest))
    assert "runtime web fetching is not permitted" in errors
    assert "committed local artefact path" in errors
    assert any("No live web fetching" in rule for rule in INPUT_RULES)


def test_generated_paragraph_labels_cannot_look_official():
    payload = _payload()
    payload["chunks"][0]["paragraph_reference"] = "1.2"
    errors = _errors_for(payload)
    assert "generated paragraph labels cannot look official" in errors


def test_internal_chunk_ids_must_be_clearly_labelled_internal():
    payload = _payload()
    payload["chunks"][0]["internal_chunk_id"] = "future-tier-1-source-0001"
    payload["chunks"][0]["citation_label"] = "Future Tier 1 Reviewed Source chunk 0001"
    errors = _errors_for(payload)
    assert "generated splits must use an internal chunk label" in errors
    assert "quote-allowed internal chunks need a clear internal chunk label" in errors


def test_exact_citations_require_exact_source_text():
    payload = _payload()
    payload["chunks"][0]["source_text_exact"] = False
    errors = _errors_for(payload)
    assert "exact citations require exact source text" in errors


def test_metadata_cannot_be_quoteable():
    payload = _payload()
    payload["chunks"][0]["quote_basis"] = "generated_metadata"
    payload["chunks"][0]["generated_metadata"]["quote_allowed"] = True
    errors = _errors_for(payload)
    assert "metadata cannot be quoteable exact source text" in errors
    assert "generated metadata cannot be quoteable" in errors


def test_checksum_strategy_is_deterministic():
    first = build_scaffold_payload(_manifest(), [_chunk()], human_review=_human_review(), generated_at="2026-06-29T11:00:00Z")
    second = build_scaffold_payload(_manifest(), [_chunk()], human_review=_human_review(), generated_at="2026-06-30T11:00:00Z")
    assert first["provenance"]["chunk_json_sha256"] == second["provenance"]["chunk_json_sha256"]

    first["provenance"]["chunk_json_sha256"] = "ignored-in-canonical-input"
    assert calculate_canonical_json_sha256(first) == second["provenance"]["chunk_json_sha256"]


def test_validation_catches_missing_required_metadata():
    payload = _payload()
    del payload["chunks"][0]["publisher"]
    errors = _errors_for(payload)
    assert "missing required metadata fields" in errors
    assert "publisher" in errors


def test_validation_catches_misleading_citation_labels():
    payload = _payload()
    payload["chunks"][0]["citation_label"] = "Future Tier 1 Reviewed Source, para. 1.2"
    errors = _errors_for(payload)
    assert "generated references must not be exposed as official citation labels" in errors


def test_validation_catches_compliance_guarantee_language():
    payload = _payload()
    payload["chunks"][0]["text"] = "This source guarantees compliance when followed."
    errors = _errors_for(payload)
    assert "claims a compliance guarantee" in errors


def test_validation_catches_sccif_grade_prediction_language():
    payload = _payload()
    payload["chunks"][0]["text"] = "This chunk can predict Ofsted grade outcomes."
    errors = _errors_for(payload)
    assert "claims or enables SCCIF grade prediction" in errors


def test_validation_requires_human_review_before_chunks_become_quote_allowed():
    payload = build_scaffold_payload(_manifest(), [_chunk()], human_review={"status": "not_reviewed"}, expected_chunk_count=1)
    errors = _errors_for(payload)
    assert "Human review must be approved before chunks become quote-allowed" in errors
    assert "human_review.reviewer must be recorded" in errors


def test_scaffold_does_not_ingest_regulations_2015_or_sccif():
    assert RESERVED_FUTURE_SOURCE_IDS == {REGULATIONS_2015_SOURCE_ID, SCCIF_SOURCE_ID}
    payload = _payload()
    payload["source"]["source_id"] = REGULATIONS_2015_SOURCE_ID
    payload["chunks"][0]["source_id"] = SCCIF_SOURCE_ID
    errors = _errors_for(payload)
    assert "Reserved future sources are not ingested by this scaffold" in errors
    assert REGULATIONS_2015_SOURCE_ID in errors
    assert SCCIF_SOURCE_ID in errors


def test_scaffold_does_not_alter_existing_guide_chunk_json():
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(guide_payload["chunks"]) == 371
    assert calculate_guide_checksum(guide_payload) == EXPECTED_CHUNK_JSON_SHA256


def test_no_runtime_route_frontend_or_os_assistant_wiring_occurred():
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


def test_pipeline_documentation_exists_and_preserves_scope():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "Controlled Source-to-Chunk Pipeline" in content
    assert "No new source is ingested by this scaffold" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content
