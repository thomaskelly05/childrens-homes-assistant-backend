from __future__ import annotations

import copy
from pathlib import Path

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum,
    collect_errors,
    load_payload,
    verify_file,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "verify_orb_guide_chunks.py"


def _payload() -> dict:
    return load_payload(GUIDE_CHUNKS_PATH)


def _errors_for(payload: dict) -> str:
    return "\n".join(collect_errors(payload))


def test_verification_script_exists():
    assert SCRIPT_PATH.is_file()


def test_verification_script_passes_current_guide_json():
    assert verify_file(GUIDE_CHUNKS_PATH) == []


def test_checksum_validation_matches_expected_and_detects_change():
    payload = _payload()
    assert calculate_checksum(payload) == EXPECTED_CHUNK_JSON_SHA256

    changed = copy.deepcopy(payload)
    changed["provenance"]["chunk_json_sha256"] = "not-the-approved-checksum"
    errors = _errors_for(changed)
    assert "Documented chunk checksum does not match" in errors


def test_required_metadata_validation_rejects_missing_chunk_field():
    payload = _payload()
    del payload["chunks"][0]["official_url"]

    errors = _errors_for(payload)
    assert "missing required fields" in errors
    assert "official_url" in errors


def test_quality_standards_coverage_validation_rejects_missing_standard():
    payload = _payload()
    removed_standard = "Care planning"
    payload["quality_standards"] = [
        item
        for item in payload["quality_standards"]
        if item["quality_standard"] != removed_standard
    ]
    for chunk in payload["chunks"]:
        if chunk.get("quality_standard") == removed_standard:
            chunk["quality_standard"] = "Quality and purpose of care"

    errors = _errors_for(payload)
    assert "Declared Quality Standards mismatch" in errors
    assert "Chunk Quality Standards coverage mismatch" in errors


def test_citation_reference_safety_accepts_current_payload():
    errors = _errors_for(_payload())
    assert "quote-allowed chunk needs" not in errors
    assert "generated extracted reference is exposed" not in errors


def test_misleading_generated_paragraph_references_are_rejected():
    payload = _payload()
    chunk = payload["chunks"][1]
    assert chunk["generated_reference"] is True

    chunk["paragraph_reference"] = "1.1.2"
    chunk["citation_label"] = "Guide to the Children's Homes Regulations, para. 1.1.2"

    errors = _errors_for(payload)
    assert "paragraph_reference looks generated or non-official" in errors
    assert "quote-allowed chunk needs a verified official paragraph or clear internal chunk label" in errors
    assert "generated extracted reference is exposed as an official paragraph" in errors


def test_regulations_2015_remains_not_ingested():
    payload = _payload()
    assert payload["excluded_sources"]["childrens_homes_regulations_2015_full_text_ingested"] is False
    assert "childrens_homes_regulations_2015" not in {
        chunk["source_id"] for chunk in payload["chunks"]
    }

    payload["excluded_sources"]["childrens_homes_regulations_2015_full_text_ingested"] = True
    errors = _errors_for(payload)
    assert "Regulations 2015" in errors


def test_sccif_remains_not_ingested():
    payload = _payload()
    assert payload["excluded_sources"]["ofsted_sccif_childrens_homes_full_text_ingested"] is False
    assert "ofsted_sccif_childrens_homes" not in {
        chunk["source_id"] for chunk in payload["chunks"]
    }

    payload["excluded_sources"]["ofsted_sccif_childrens_homes_full_text_ingested"] = True
    errors = _errors_for(payload)
    assert "SCCIF" in errors


def test_no_live_runtime_wiring_occurred():
    script_source = SCRIPT_PATH.read_text(encoding="utf-8")
    service_source = (
        REPO_ROOT / "services" / "orb_residential_guide_ingestion_service.py"
    ).read_text(encoding="utf-8")
    forbidden_markers = (
        "from fastapi",
        "import requests",
        "import httpx",
        "urllib.request",
        "include_router",
        "assistant_os_knowledge_routes",
        "frontend/",
        "orb_voice",
        "dictate",
        "communicate",
    )

    for marker in forbidden_markers:
        assert marker not in script_source
        assert marker not in service_source
