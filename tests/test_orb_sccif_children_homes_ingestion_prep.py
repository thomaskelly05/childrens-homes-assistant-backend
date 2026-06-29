"""ORB Residential SCCIF children's homes ingestion-prep tests.

Non-invasive guards only. These tests do not ingest, scrape, download, or wire
runtime retrieval.
"""

from __future__ import annotations

import copy
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
from scripts.verify_orb_sccif_children_homes_manifest import (
    REQUIRED_HUMAN_REVIEW_CONFIRMATIONS,
    REQUIRED_MANIFEST_FIELDS,
    sccif_children_homes_chunk_schema,
    sccif_children_homes_manifest_schema,
    sccif_children_homes_manifest_template,
    validate_sccif_children_homes_chunk,
    validate_sccif_children_homes_manifest,
    validate_sccif_children_homes_payload,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "verify_orb_sccif_children_homes_manifest.py"
DOC_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-sccif-children-homes-ingestion-prep.md"
SCCIF_CHUNKS_PATH = (
    REPO_ROOT / "data" / "orb_residential_ingestion" / "ofsted_sccif_childrens_homes_chunks.json"
)


def _manifest() -> dict:
    manifest = sccif_children_homes_manifest_template()
    manifest.update(
        {
            "version": "Synthetic reviewed version placeholder",
            "last_verified_date": "2026-06-29",
            "source_file_path": (
                "data/orb_residential_ingestion/ofsted_sccif_childrens_homes_source.txt"
            ),
            "source_file_checksum": "a" * 64,
        }
    )
    return manifest


def _chunk() -> dict:
    return {
        "source_id": "ofsted_sccif_childrens_homes",
        "judgement_area": "helped_and_protected",
        "evaluation_area": "Safeguarding and protection",
        "inspection_evidence_theme": "management oversight after safeguarding events",
        "section_heading": "Synthetic section heading for validation only",
        "official_reference": "SCCIF children's homes, helped and protected",
        "internal_chunk_id": "internal:sccif-children-homes:helped-and-protected:0001",
        "source_text_exact": True,
        "generated_metadata": {
            "content_kind": "framework_text",
            "generated_label": False,
            "source_text_present_in_this_pr": False,
        },
        "quote_allowed": True,
        "quote_basis": "exact_sccif_framework_text_after_human_review",
        "citation_label": (
            "Social care common inspection framework (SCCIF): children's homes, "
            "helped and protected"
        ),
        "related_quality_standards": ["The protection of children standard"],
        "related_regulations": ["Regulation 12"],
        "related_workflow_domains": ["safeguarding_concern"],
        "requires_local_policy": True,
        "professional_judgement_boundary": (
            "Registered Manager, Responsible Individual and provider judgement remains required."
        ),
        "grade_prediction_boundary": "ORB does not predict Ofsted judgements or grades.",
        "inspection_readiness_boundary": "ORB does not decide inspection readiness.",
        "compliance_guarantee_boundary": "ORB does not guarantee inspection outcomes.",
        "not_to_be_used_for": [
            "predicting Ofsted judgements or grades",
            "deciding inspection readiness",
            "guaranteeing inspection outcomes",
            "deciding statutory compliance",
            "replacing Ofsted or inspector judgement",
            "replacing registered manager or provider judgement",
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
        "schema_version": "orb-sccif-children-homes-ingestion-prep-v1",
        "source": _manifest(),
        "verified_judgement_areas": ["helped_and_protected"],
        "verified_official_references": ["SCCIF children's homes, helped and protected"],
        "judgement_area_index": {
            "helped_and_protected": {
                "label": "How well children are helped and protected",
            }
        },
        "evaluation_area_index": {
            "safeguarding_and_protection": {
                "label": "Safeguarding and protection",
            }
        },
        "inspection_evidence_theme_index": {
            "management_oversight_after_safeguarding_events": {
                "label": "Management oversight after safeguarding events",
            }
        },
        "chunks": [_chunk()],
        "human_review": _human_review(),
        "excluded_sources": {
            "ofsted_sccif_childrens_homes_full_text_ingested": False,
            "childrens_homes_regulations_2015_full_text_ingested": True,
        },
        "runtime_answer_wiring_changed": False,
        "frontend_behaviour_changed": False,
    }


def _manifest_errors(manifest: dict) -> str:
    return "\n".join(validate_sccif_children_homes_manifest(manifest))


def _chunk_errors(
    chunk: dict,
    *,
    verified_areas: set[str] | None = None,
    verified_references: set[str] | None = None,
) -> str:
    return "\n".join(
        validate_sccif_children_homes_chunk(
            chunk,
            verified_judgement_areas={"helped_and_protected"} if verified_areas is None else verified_areas,
            verified_official_references=(
                {"SCCIF children's homes, helped and protected"}
                if verified_references is None
                else verified_references
            ),
        )
    )


def _payload_errors(payload: dict) -> str:
    return "\n".join(validate_sccif_children_homes_payload(payload))


def test_sccif_manifest_schema_exists():
    schema = sccif_children_homes_manifest_schema()
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


def test_judgement_area_indexing_is_required():
    manifest = _manifest()
    manifest["judgement_area_index_required"] = False
    errors = _manifest_errors(manifest)
    assert "source.judgement_area_index_required must be true" in errors


def test_evaluation_area_indexing_is_required():
    manifest = _manifest()
    manifest["evaluation_area_index_required"] = False
    errors = _manifest_errors(manifest)
    assert "source.evaluation_area_index_required must be true" in errors


def test_inspection_evidence_theme_indexing_is_required():
    manifest = _manifest()
    manifest["inspection_evidence_theme_index_required"] = False
    errors = _manifest_errors(manifest)
    assert "source.inspection_evidence_theme_index_required must be true" in errors


def test_missing_source_checksum_is_rejected():
    manifest = _manifest()
    manifest["source_file_checksum"] = ""
    errors = _manifest_errors(manifest)
    assert "source.source_file_checksum must be present" in errors


def test_missing_judgement_area_is_rejected_for_sccif_chunks():
    chunk = _chunk()
    chunk["judgement_area"] = ""
    errors = _chunk_errors(chunk)
    assert "framework_text chunks require judgement_area" in errors


def test_generated_official_looking_sccif_labels_are_rejected():
    chunk = _chunk()
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "SCCIF section 3"
    errors = _chunk_errors(chunk)
    assert "Generated citation labels must not look like official SCCIF labels" in errors


def test_internal_chunk_labels_are_accepted_only_when_clearly_internal():
    chunk = _chunk()
    chunk["official_reference"] = ""
    chunk["generated_metadata"]["generated_label"] = True
    chunk["citation_label"] = "internal chunk internal:sccif-children-homes:helped-and-protected:0001"
    assert "Generated/internal splits" not in _chunk_errors(chunk, verified_references=set())

    chunk["citation_label"] = "SCCIF split 0001"
    errors = _chunk_errors(chunk, verified_areas=set(), verified_references=set())
    assert "Generated/internal splits must use a clear internal chunk label" in errors
    assert "Quote-allowed internal chunks require a clear internal chunk label" in errors


def test_exact_citations_require_exact_source_text():
    chunk = _chunk()
    chunk["source_text_exact"] = False
    errors = _chunk_errors(chunk)
    assert "Exact citations require exact SCCIF source text" in errors


def test_metadata_cannot_be_quote_allowed():
    chunk = _chunk()
    chunk["generated_metadata"]["content_kind"] = "generated_metadata"
    chunk["generated_metadata"]["quote_allowed"] = True
    chunk["quote_basis"] = "generated_metadata"
    errors = _chunk_errors(chunk)
    assert "Only exact SCCIF framework text may be quote-allowed" in errors
    assert "Metadata cannot be cited as exact SCCIF source text" in errors
    assert "Generated metadata cannot be quote-allowed" in errors


@pytest.mark.parametrize(
    "unsafe_text",
    [
        "ORB predicts the Ofsted judgement.",
        "ORB guarantees the inspection outcome.",
        "ORB decides the home is inspection ready.",
        "ORB confirms this evidence meets outstanding.",
        "ORB determines the home is good.",
        "ORB grades the home.",
        "ORB decides SCCIF compliance.",
        "ORB replaces Ofsted judgement.",
        "ORB replaces Registered Manager judgement.",
        "ORB guarantees compliance.",
    ],
)
def test_unsafe_boundary_claims_are_rejected(unsafe_text: str):
    chunk = _chunk()
    chunk["professional_judgement_boundary"] = (
        f"{unsafe_text} Professional judgement remains; manager judgement remains."
    )
    errors = _chunk_errors(chunk)
    assert "SCCIF chunks must not" in errors


def test_safe_sccif_boundary_wording_passes():
    chunk = _chunk()
    chunk["professional_judgement_boundary"] = (
        "ORB supports inspection preparation and evidence review. "
        "ORB does not predict Ofsted judgements. ORB does not decide inspection readiness. "
        "Ofsted makes inspection judgements. Registered Manager, Responsible Individual "
        "and provider judgement remain responsible."
    )
    chunk["grade_prediction_boundary"] = "ORB does not predict Ofsted judgements."
    chunk["inspection_readiness_boundary"] = "ORB does not decide inspection readiness."
    chunk["compliance_guarantee_boundary"] = "ORB does not guarantee outcomes."
    errors = _chunk_errors(chunk)
    assert errors == ""


@pytest.mark.parametrize(
    "confirmation",
    [
        "judgement_area_mapping_confirmed",
        "evaluation_area_mapping_confirmed",
        "inspection_evidence_theme_mapping_confirmed",
        "grade_prediction_boundary_confirmed",
        "compliance_guarantee_boundary_confirmed",
    ],
)
def test_required_human_review_confirmations_cannot_be_missing(confirmation: str):
    payload = _payload()
    del payload["human_review"][confirmation]
    errors = _payload_errors(payload)
    assert f"human_review.{confirmation} must be true" in errors


def test_guide_chunks_are_unchanged():
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(guide_payload["chunks"]) == 371
    assert calculate_guide_checksum(guide_payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_regulations_2015_chunks_are_unchanged():
    regulations_payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    assert len(regulations_payload["chunks"]) == 100
    assert calculate_regulations_checksum(regulations_payload) == EXPECTED_REGULATIONS_CHUNK_JSON_SHA256


def test_sccif_prep_payload_rejects_full_text_ingestion_flag_in_prep_schema():
    payload = _payload()
    assert _payload_errors(payload) == ""

    changed = copy.deepcopy(payload)
    changed["excluded_sources"]["ofsted_sccif_childrens_homes_full_text_ingested"] = True
    errors = _payload_errors(changed)
    assert "SCCIF full-text ingestion flag must remain false" in errors


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


def test_sccif_documentation_exists_and_preserves_scope():
    assert DOC_PATH.is_file()
    content = DOC_PATH.read_text(encoding="utf-8")
    assert "SCCIF Children's Homes Source-Specific Ingestion Prep" in content
    assert "No SCCIF source text is ingested" in content
    assert "Regulations 2015 chunk content changed?" in content
    assert "Guide chunk content changed?" in content
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_chunk_schema_includes_sccif_specific_fields():
    schema = sccif_children_homes_chunk_schema()
    for field in (
        "judgement_area",
        "evaluation_area",
        "inspection_evidence_theme",
        "grade_prediction_boundary",
        "compliance_guarantee_boundary",
    ):
        assert field in schema
