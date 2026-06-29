#!/usr/bin/env python3
"""Verify the committed ORB Residential Guide chunk artefact.

Checksum strategy:
  * algorithm: SHA-256
  * input: normalised canonical JSON, not raw file bytes
  * canonical form: UTF-8 JSON with sorted keys, compact separators,
    ensure_ascii=False, excluding provenance.chunk_json_sha256

If the checksum changes, reviewers should treat it as evidence that the
committed artefact content or metadata changed and review the chunk diff before
accepting a new expected checksum.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.orb_residential_governed_ingestion_prep_service import (  # noqa: E402
    REQUIRED_CHUNK_METADATA_FIELDS,
)
from services.orb_residential_guide_ingestion_service import (  # noqa: E402
    GUIDE_CHUNKS_PATH,
    GUIDE_SOURCE_ID,
    QUALITY_STANDARD_NAMES,
)

EXPECTED_SOURCE_TITLE = "Guide to the Children's Homes Regulations including the Quality Standards"
EXPECTED_OFFICIAL_URL = (
    "https://www.gov.uk/government/publications/"
    "childrens-homes-regulations-including-quality-standards-guide"
)
EXPECTED_PUBLISHER = "Department for Education"
EXPECTED_VERSION = "Version 1.17 FINAL (April 2015)"
EXPECTED_CHUNK_COUNT = 371
EXPECTED_CHUNK_JSON_SHA256 = (
    "2b18519d5c0cb719156081e5233a1ba900b95a7f0678380a3c2bb888574baaad"
)
MAX_CHUNK_TEXT_CHARS_EXCLUSIVE = 1300

REGULATIONS_2015_SOURCE_ID = "childrens_homes_regulations_2015"
SCCIF_SOURCE_ID = "ofsted_sccif_childrens_homes"

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "source",
    "quality_standards",
    "retrieval_policy",
    "excluded_sources",
    "chunks",
    "provenance",
}
REQUIRED_SOURCE_FIELDS = {
    "source_id",
    "source_title",
    "official_url",
    "publisher",
    "version",
    "last_verified_date",
}
REQUIRED_CHUNK_FIELDS = set(REQUIRED_CHUNK_METADATA_FIELDS) | {
    "chunk_id",
    "chunk_index",
    "source_integrity",
    "exact_excerpt",
    "text",
    "content_hash",
    "official_paragraph_reference",
    "original_extracted_reference",
    "generated_reference",
    "contains_embedded_regulation_excerpt",
}
REQUIRED_RETRIEVAL_POLICY = {
    "never_send_full_guide_to_llm": True,
    "maximum_exact_chunks": 3,
    "deterministic_selection_before_llm": True,
    "runtime_scraping_or_downloading": False,
}
ALLOWED_QUOTE_BASIS = {
    "exact_guide_text_official_paragraph",
    "exact_guide_text_official_paragraph_with_embedded_regulation_excerpt",
    "exact_guide_text_internal_chunk",
    "exact_guide_text_internal_chunk_with_embedded_regulation_excerpt",
}
OFFICIAL_PARAGRAPH_REFERENCE = re.compile(r"^\d{1,2}\.\d{1,2}$")
MISLEADING_GENERATED_REFERENCE = re.compile(r"^(?:\d{1,2}|\d{1,2}\.\d{1,2}\.\d+)$")
COMPLIANCE_GUARANTEE_CLAIM = re.compile(
    r"\b(?:guarantees?|guaranteed|guaranteeing)\s+compliance\b",
    re.IGNORECASE,
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def load_payload(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("Guide chunk artefact must contain a JSON object.")
    return payload


def canonical_payload_for_checksum(payload: dict[str, Any]) -> dict[str, Any]:
    canonical = copy.deepcopy(payload)
    provenance = canonical.get("provenance")
    if isinstance(provenance, dict):
        provenance.pop("chunk_json_sha256", None)
    return canonical


def calculate_checksum(payload: dict[str, Any]) -> str:
    encoded = json.dumps(
        canonical_payload_for_checksum(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def collect_errors(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    errors.extend(_validate_top_level(payload))
    errors.extend(_validate_source(payload))
    errors.extend(_validate_checksum(payload))
    errors.extend(_validate_retrieval_policy(payload))
    errors.extend(_validate_excluded_sources(payload))
    chunks = payload.get("chunks")
    if not isinstance(chunks, list):
        return errors + ["chunks must be a list."]
    errors.extend(_validate_chunks(chunks))
    errors.extend(_validate_quality_standards(payload, chunks))
    return errors


def verify_file(path: Path = GUIDE_CHUNKS_PATH) -> list[str]:
    if not path.is_file():
        return [f"Guide chunk artefact does not exist: {path}"]
    try:
        payload = load_payload(path)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return [f"Guide chunk artefact could not be loaded: {exc}"]
    return collect_errors(payload)


def _validate_top_level(payload: dict[str, Any]) -> list[str]:
    errors = []
    missing = REQUIRED_TOP_LEVEL_KEYS - set(payload)
    if missing:
        errors.append(f"Missing top-level keys: {sorted(missing)}")
    return errors


def _validate_source(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    source = payload.get("source")
    if not isinstance(source, dict):
        return ["source must be an object."]

    missing = REQUIRED_SOURCE_FIELDS - set(source)
    if missing:
        errors.append(f"Source metadata missing fields: {sorted(missing)}")
    expected_values = {
        "source_id": GUIDE_SOURCE_ID,
        "source_title": EXPECTED_SOURCE_TITLE,
        "official_url": EXPECTED_OFFICIAL_URL,
        "publisher": EXPECTED_PUBLISHER,
        "version": EXPECTED_VERSION,
    }
    for field, expected in expected_values.items():
        if source.get(field) != expected:
            errors.append(f"source.{field} must be {expected!r}.")
    if not _text(source.get("last_verified_date")):
        errors.append("source.last_verified_date must be present.")
    return errors


def _validate_checksum(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    provenance = payload.get("provenance")
    if not isinstance(provenance, dict):
        return ["provenance must be an object."]
    documented = provenance.get("chunk_json_sha256")
    if documented != EXPECTED_CHUNK_JSON_SHA256:
        errors.append("Documented chunk checksum does not match the expected Phase 2a checksum.")
    actual = calculate_checksum(payload)
    if actual != EXPECTED_CHUNK_JSON_SHA256:
        errors.append(
            f"Calculated chunk checksum changed: {actual} "
            f"(expected {EXPECTED_CHUNK_JSON_SHA256})."
        )
    algorithm = _text(provenance.get("checksum_algorithm")).lower()
    if "sha256" not in algorithm or "canonical json" not in algorithm:
        errors.append("provenance.checksum_algorithm must describe SHA-256 over canonical JSON.")
    return errors


def _validate_retrieval_policy(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    policy = payload.get("retrieval_policy")
    if not isinstance(policy, dict):
        return ["retrieval_policy must be an object."]
    for field, expected in REQUIRED_RETRIEVAL_POLICY.items():
        if policy.get(field) != expected:
            errors.append(f"retrieval_policy.{field} must be {expected!r}.")
    return errors


def _validate_excluded_sources(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    excluded = payload.get("excluded_sources")
    if not isinstance(excluded, dict):
        return ["excluded_sources must be an object."]
    expected_false_flags = {
        "childrens_homes_regulations_2015_full_text_ingested",
        "ofsted_sccif_childrens_homes_full_text_ingested",
        "full_113_source_catalogue_ingested",
    }
    for flag in expected_false_flags:
        if excluded.get(flag) is not False:
            errors.append(f"excluded_sources.{flag} must remain false.")
    return errors


def _validate_chunks(chunks: list[Any]) -> list[str]:
    errors: list[str] = []
    if len(chunks) != EXPECTED_CHUNK_COUNT:
        errors.append(f"Chunk count must be {EXPECTED_CHUNK_COUNT}, found {len(chunks)}.")
    for index, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            errors.append(f"Chunk {index} must be an object.")
            continue
        errors.extend(_validate_chunk(index, chunk))
    return errors


def _validate_chunk(index: int, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    prefix = f"Chunk {index}"
    missing = REQUIRED_CHUNK_FIELDS - set(chunk)
    if missing:
        errors.append(f"{prefix} missing required fields: {sorted(missing)}")

    if chunk.get("source_id") != GUIDE_SOURCE_ID:
        errors.append(f"{prefix} source_id must be {GUIDE_SOURCE_ID!r}.")
    if chunk.get("source_title") != EXPECTED_SOURCE_TITLE:
        errors.append(f"{prefix} source_title must be {EXPECTED_SOURCE_TITLE!r}.")
    if chunk.get("official_url") != EXPECTED_OFFICIAL_URL:
        errors.append(f"{prefix} official_url must be the approved official URL.")
    if chunk.get("publisher") != EXPECTED_PUBLISHER:
        errors.append(f"{prefix} publisher must be {EXPECTED_PUBLISHER!r}.")
    if chunk.get("version") != EXPECTED_VERSION:
        errors.append(f"{prefix} version must be {EXPECTED_VERSION!r}.")
    if not _text(chunk.get("last_verified_date")):
        errors.append(f"{prefix} last_verified_date must be present.")

    text = _text(chunk.get("text"))
    if not text:
        errors.append(f"{prefix} text must be present.")
    if len(text) >= MAX_CHUNK_TEXT_CHARS_EXCLUSIVE:
        errors.append(
            f"{prefix} text length {len(text)} exceeds accepted limit "
            f"(< {MAX_CHUNK_TEXT_CHARS_EXCLUSIVE})."
        )
    if not _text(chunk.get("exact_excerpt")):
        errors.append(f"{prefix} exact_excerpt must be present.")
    if not _text(chunk.get("citation_label")):
        errors.append(f"{prefix} citation_label must be present.")
    if not _text(chunk.get("quote_basis")):
        errors.append(f"{prefix} quote_basis must be present.")
    if chunk.get("quote_basis") not in ALLOWED_QUOTE_BASIS:
        errors.append(f"{prefix} quote_basis is not an approved Guide quote basis.")
    if not isinstance(chunk.get("generated_metadata"), dict):
        errors.append(f"{prefix} generated_metadata must be an object.")
    if not isinstance(chunk.get("related_regulations"), list):
        errors.append(f"{prefix} related_regulations must be a list.")
    if not isinstance(chunk.get("related_workflow_domains"), list):
        errors.append(f"{prefix} related_workflow_domains must be a list.")

    errors.extend(_validate_citation_reference_safety(index, chunk))
    errors.extend(_validate_source_exclusions(index, chunk))
    errors.extend(_validate_compliance_boundary(index, chunk))
    return errors


def _validate_citation_reference_safety(index: int, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if chunk.get("quote_allowed") is not True:
        return errors

    prefix = f"Chunk {index}"
    label = _text(chunk.get("citation_label"))
    lower_label = label.lower()
    internal_chunk_id = _text(chunk.get("internal_chunk_id"))
    official_ref = _text(chunk.get("official_paragraph_reference"))
    paragraph_ref = _text(chunk.get("paragraph_reference"))
    original_ref = _text(chunk.get("original_extracted_reference"))
    generated_metadata = chunk.get("generated_metadata")
    if not isinstance(generated_metadata, dict):
        generated_metadata = {}
    generated_ref = bool(chunk.get("generated_reference")) or (
        generated_metadata.get("original_reference_is_official_paragraph") is False
    )

    if official_ref and not OFFICIAL_PARAGRAPH_REFERENCE.fullmatch(official_ref):
        errors.append(f"{prefix} official_paragraph_reference is not a verified Guide paragraph.")
    if paragraph_ref and not OFFICIAL_PARAGRAPH_REFERENCE.fullmatch(paragraph_ref):
        errors.append(f"{prefix} paragraph_reference looks generated or non-official.")
    if paragraph_ref and MISLEADING_GENERATED_REFERENCE.fullmatch(paragraph_ref) and not official_ref:
        errors.append(f"{prefix} uses a generated paragraph_reference as if official.")

    has_official_reference = bool(official_ref)
    has_unambiguous_internal_id = (
        "internal chunk" in lower_label
        and internal_chunk_id
        and internal_chunk_id in label
        and "official guide paragraph" not in lower_label
        and "para." not in lower_label
    )
    if not (has_official_reference or has_unambiguous_internal_id):
        errors.append(f"{prefix} quote-allowed chunk needs a verified official paragraph or clear internal chunk label.")

    if generated_ref or MISLEADING_GENERATED_REFERENCE.fullmatch(original_ref):
        if official_ref or paragraph_ref:
            errors.append(f"{prefix} generated extracted reference is exposed as an official paragraph.")
        if not has_unambiguous_internal_id:
            errors.append(f"{prefix} generated extracted reference needs an unambiguous internal chunk label.")

    return errors


def _validate_source_exclusions(index: int, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    prefix = f"Chunk {index}"
    if chunk.get("source_id") in {REGULATIONS_2015_SOURCE_ID, SCCIF_SOURCE_ID}:
        errors.append(f"{prefix} uses an excluded full-text source_id.")
    if chunk.get("regulations_2015_full_text_ingested") is True:
        errors.append(f"{prefix} marks Regulations 2015 as full-text ingested.")
    if chunk.get("sccif_full_text_ingested") is True:
        errors.append(f"{prefix} marks SCCIF as full-text ingested.")
    return errors


def _validate_compliance_boundary(index: int, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    text_fields = " ".join(
        _text(chunk.get(field))
        for field in ("text", "exact_excerpt", "citation_label")
    )
    if COMPLIANCE_GUARANTEE_CLAIM.search(text_fields):
        errors.append(f"Chunk {index} claims a compliance guarantee.")
    blocked_uses = " ".join(_text(item) for item in chunk.get("not_to_be_used_for") or [])
    if "guaranteeing compliance" not in blocked_uses.lower():
        errors.append(f"Chunk {index} does not preserve the compliance guarantee prohibition.")
    return errors


def _validate_quality_standards(payload: dict[str, Any], chunks: list[Any]) -> list[str]:
    errors: list[str] = []
    expected = set(QUALITY_STANDARD_NAMES)
    declared = {
        item.get("quality_standard")
        for item in payload.get("quality_standards") or []
        if isinstance(item, dict) and item.get("quality_standard")
    }
    represented = {
        chunk.get("quality_standard")
        for chunk in chunks
        if isinstance(chunk, dict) and chunk.get("quality_standard")
    }
    if declared != expected:
        errors.append(f"Declared Quality Standards mismatch: {sorted(declared)}")
    if represented != expected:
        errors.append(f"Chunk Quality Standards coverage mismatch: {sorted(represented)}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the ORB Residential Guide chunks.")
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=GUIDE_CHUNKS_PATH,
        help="Path to guide_to_childrens_homes_regulations_chunks.json.",
    )
    args = parser.parse_args()

    errors = verify_file(args.path)
    if errors:
        print("Guide chunk verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    payload = load_payload(args.path)
    print("Guide chunk verification passed.")
    print(f"Path: {args.path}")
    print(f"Chunks: {len(payload['chunks'])}")
    print(f"Checksum strategy: SHA-256 over normalised canonical JSON excluding provenance.chunk_json_sha256")
    print(f"Checksum: {calculate_checksum(payload)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
