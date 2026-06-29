#!/usr/bin/env python3
"""Offline ORB Residential source-to-chunk pipeline scaffold.

This module defines reusable manifest, checksum, provenance, review-gate and
validation rules for future Tier 1 source ingestion. It intentionally does not
fetch, scrape, parse, ingest, publish, or wire sources into live ORB answers.
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

SCHEMA_VERSION = "orb-source-to-chunk-pipeline-v1"

REGULATIONS_2015_SOURCE_ID = "childrens_homes_regulations_2015"
SCCIF_SOURCE_ID = "ofsted_sccif_childrens_homes"
RESERVED_FUTURE_SOURCE_IDS = {REGULATIONS_2015_SOURCE_ID, SCCIF_SOURCE_ID}

CHECKSUM_ALGORITHM = "sha256"
CHECKSUM_STRATEGY = (
    "SHA-256 over UTF-8 canonical JSON with sorted keys, compact separators, "
    "ensure_ascii=False, excluding provenance.chunk_json_sha256 and "
    "provenance.generated_at."
)
CHECKSUM_EXCLUDED_PATHS: tuple[tuple[str, ...], ...] = (
    ("provenance", "chunk_json_sha256"),
    ("provenance", "generated_at"),
)
MAX_CHUNK_TEXT_CHARS = 1300
INTERNAL_CHUNK_ID_PREFIX = "internal:"

REQUIRED_MANIFEST_FIELDS: tuple[str, ...] = (
    "source_id",
    "source_title",
    "source_type",
    "official_url",
    "publisher",
    "version",
    "last_verified_date",
    "jurisdiction",
    "statutory_status",
    "citation_authority",
    "source_file_path",
    "source_file_checksum",
    "ingestion_scope",
    "excluded_sections",
    "requires_human_review",
    "allowed_quote_basis",
    "not_to_be_used_for",
    "professional_judgement_boundary",
)

SOURCE_MANIFEST_SCHEMA: dict[str, dict[str, Any]] = {
    field: {"required": True, "type": "list" if field in {"excluded_sections", "allowed_quote_basis", "not_to_be_used_for"} else "string"}
    for field in REQUIRED_MANIFEST_FIELDS
}
SOURCE_MANIFEST_SCHEMA["requires_human_review"] = {"required": True, "type": "boolean"}

INPUT_RULES: tuple[str, ...] = (
    "Source text must come from an approved official source or committed reviewed source artefact.",
    "No uncontrolled runtime scraping is permitted.",
    "No live web fetching is permitted during runtime.",
    "Local policy sources require upload and review before use.",
    "Third-sector and lived-experience sources must be marked reflective/practice-only.",
    "The source file checksum must be recorded before chunk generation.",
)

CHUNK_GENERATION_RULES: tuple[str, ...] = (
    "Chunk by official structure where possible.",
    "Preserve official paragraph or regulation references only where genuinely present.",
    "Never generate paragraph labels that look official.",
    "Use internal_chunk_id for generated splits.",
    "Distinguish source text from generated metadata.",
    "Preserve exact source text where quote_allowed is true.",
    "Cap chunk size.",
    "Preserve section heading, regulation number, Quality Standard, SCCIF judgement area, workflow domains and citation boundaries where applicable.",
)

CITATION_LABEL_RULES: tuple[str, ...] = (
    "Official references may only be used if genuinely present in the source.",
    "Internal chunk IDs must be clearly labelled as internal.",
    "Generated references must never be exposed as official paragraph labels.",
    "Exact citations require exact source text.",
    "Metadata cannot be cited as exact source text.",
    "Embedded references must be labelled by source context.",
    "No source may be used to guarantee compliance.",
    "No SCCIF source may be used to predict an Ofsted grade.",
)

REQUIRED_HUMAN_REVIEW_CONFIRMATIONS: tuple[str, ...] = (
    "source_provenance_confirmed",
    "official_url_confirmed",
    "version_date_confirmed",
    "chunk_boundaries_confirmed",
    "citation_labels_confirmed",
    "quote_allowed_status_confirmed",
    "regulation_quality_standard_sccif_mapping_confirmed",
    "no_misleading_references_confirmed",
    "no_overclaiming_confirmed",
    "local_policy_contamination_checked",
    "checksum_recorded",
)

REQUIRED_PAYLOAD_TOP_LEVEL_KEYS: tuple[str, ...] = (
    "schema_version",
    "source",
    "input_rules",
    "chunk_generation_rules",
    "citation_label_rules",
    "chunks",
    "provenance",
    "human_review",
    "excluded_sources",
)

REQUIRED_CHUNK_FIELDS: tuple[str, ...] = tuple(
    dict.fromkeys(
        (
            "chunk_id",
            "chunk_index",
            "source_file_checksum",
            "exact_excerpt",
            "text",
            "content_hash",
            "official_reference_present_in_source",
            "generated_reference",
            "citation_boundary",
            *REQUIRED_CHUNK_METADATA_FIELDS,
        )
    )
)

OFFICIAL_LOOKING_REFERENCE = re.compile(
    r"^(?:para\.?\s*)?\d{1,3}(?:\.\d{1,3}){1,4}[a-z]?$|^reg(?:ulation)?\.?\s*\d+[a-z]?(?:\(\d+\))*$",
    re.IGNORECASE,
)
MISLEADING_OFFICIAL_LABEL = re.compile(
    r"\b(?:official\s+)?(?:paragraph|para\.?|regulation|reg\.?)\s+\d",
    re.IGNORECASE,
)
OFFICIAL_LOOKING_REFERENCE_LABEL = re.compile(
    r"(?:\b(?:official\s+)?(?:para(?:graph)?\.?|section|reg(?:ulation)?\.?|article)\s*"
    r"\d{1,3}(?:\.\d{1,3}){0,4}[a-z]?(?:\(\d+\))*\b)"
    r"|(?:^|[,\s])\d{1,3}(?:\.\d{1,3}){0,4}[a-z]?(?:\(\d+\))*\s*(?:$|[,.;:\s])",
    re.IGNORECASE,
)
COMPLIANCE_GUARANTEE_CLAIM = re.compile(
    r"\b(?:guarantees?|guaranteed|guaranteeing|ensures?|ensured|ensuring)\s+(?:legal\s+)?compliance\b",
    re.IGNORECASE,
)
SCCIF_GRADE_PREDICTION_CLAIM = re.compile(
    r"\b(?:predicts?|predicted|predicting|guarantees?|determine[sd]?|determining)\b.{0,60}\b(?:ofsted\s+)?(?:grade|grading|judgement|outcome)\b",
    re.IGNORECASE,
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def source_manifest_template() -> dict[str, Any]:
    """Return a blank manifest with all required fields."""

    return {
        "source_id": "",
        "source_title": "",
        "source_type": "",
        "official_url": "",
        "publisher": "",
        "version": "",
        "last_verified_date": "",
        "jurisdiction": "",
        "statutory_status": "",
        "citation_authority": "",
        "source_file_path": "",
        "source_file_checksum": "",
        "ingestion_scope": "",
        "excluded_sections": [],
        "requires_human_review": True,
        "allowed_quote_basis": [],
        "not_to_be_used_for": [],
        "professional_judgement_boundary": "",
    }


def source_manifest_schema() -> dict[str, dict[str, Any]]:
    return copy.deepcopy(SOURCE_MANIFEST_SCHEMA)


def canonical_payload_for_checksum(payload: dict[str, Any]) -> dict[str, Any]:
    canonical = copy.deepcopy(payload)
    for path in CHECKSUM_EXCLUDED_PATHS:
        current: Any = canonical
        for key in path[:-1]:
            if not isinstance(current, dict):
                current = None
                break
            current = current.get(key)
        if isinstance(current, dict):
            current.pop(path[-1], None)
    return canonical


def calculate_canonical_json_sha256(payload: dict[str, Any]) -> str:
    encoded = json.dumps(
        canonical_payload_for_checksum(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def calculate_file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build_scaffold_payload(
    manifest: dict[str, Any],
    chunks: list[dict[str, Any]],
    *,
    human_review: dict[str, Any] | None = None,
    generated_at: str | None = None,
    expected_chunk_count: int | None = None,
) -> dict[str, Any]:
    """Build a governed payload from already-reviewed local source chunks.

    This function does not read source text, fetch URLs, scrape websites, call
    external APIs, or ingest the result into runtime retrieval.
    """

    payload = {
        "schema_version": SCHEMA_VERSION,
        "source": copy.deepcopy(manifest),
        "input_rules": list(INPUT_RULES),
        "chunk_generation_rules": list(CHUNK_GENERATION_RULES),
        "citation_label_rules": list(CITATION_LABEL_RULES),
        "chunks": copy.deepcopy(chunks),
        "provenance": {
            "checksum_algorithm": CHECKSUM_ALGORITHM,
            "checksum_strategy": CHECKSUM_STRATEGY,
            "source_file_sha256": _text(manifest.get("source_file_checksum")),
            "chunk_json_sha256": "",
            "generated_at": generated_at or "",
            "expected_chunk_count": expected_chunk_count,
            "runtime_scraping_or_downloading": False,
            "live_web_fetching": False,
        },
        "human_review": human_review or {"status": "not_reviewed"},
        "excluded_sources": {
            "childrens_homes_regulations_2015_full_text_ingested": False,
            "ofsted_sccif_childrens_homes_full_text_ingested": False,
        },
    }
    payload["provenance"]["chunk_json_sha256"] = calculate_canonical_json_sha256(payload)
    return payload


def validate_source_manifest(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["source manifest must be an object."]

    missing = [field for field in REQUIRED_MANIFEST_FIELDS if field not in manifest]
    if missing:
        errors.append(f"Source manifest missing fields: {missing}")

    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in manifest:
            continue
        value = manifest.get(field)
        if field in {"excluded_sections", "allowed_quote_basis", "not_to_be_used_for"}:
            if not isinstance(value, list):
                errors.append(f"source.{field} must be a list.")
            continue
        if field == "requires_human_review":
            if value is not True:
                errors.append("source.requires_human_review must be true before exact citation use.")
            continue
        if not _text(value):
            errors.append(f"source.{field} must be present.")

    official_url = _text(manifest.get("official_url"))
    source_file_path = _text(manifest.get("source_file_path"))
    if not official_url.startswith("https://"):
        errors.append("source.official_url must be an approved HTTPS official URL or reviewed source URL.")
    if source_file_path.startswith(("http://", "https://")):
        errors.append("source.source_file_path must be a committed local artefact path, not a runtime URL.")
    if manifest.get("runtime_web_fetch_allowed") is True or manifest.get("runtime_fetch_required") is True:
        errors.append("runtime web fetching is not permitted by this scaffold.")
    if not _text(manifest.get("source_file_checksum")):
        errors.append("source.source_file_checksum must be recorded before chunk generation.")

    source_type = _text(manifest.get("source_type"))
    statutory_status = _text(manifest.get("statutory_status"))
    citation_authority = _text(manifest.get("citation_authority"))
    if source_type in {"third_sector", "lived_experience"}:
        if statutory_status not in {"third_sector_resource", "lived_experience_resource", "reflective_practice"}:
            errors.append("third-sector/lived-experience sources must be marked reflective/practice-only.")
        if citation_authority not in {"reflective_only", "informative_practice"}:
            errors.append("third-sector/lived-experience sources cannot be statutory authority.")
    if source_type == "provider_policy" and manifest.get("local_policy_reviewed_uploaded") is not True:
        errors.append("local policy sources require upload and human review before use.")

    return errors


def validate_pipeline_payload(
    payload: dict[str, Any],
    *,
    expected_chunk_count: int | None = None,
    allow_reserved_future_sources: bool = False,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["pipeline payload must be an object."]

    missing_top = [key for key in REQUIRED_PAYLOAD_TOP_LEVEL_KEYS if key not in payload]
    if missing_top:
        errors.append(f"Missing top-level keys: {missing_top}")

    source = payload.get("source")
    if not isinstance(source, dict):
        return errors + ["source must be an object."]

    errors.extend(validate_source_manifest(source))
    errors.extend(_validate_reserved_sources_not_ingested(payload, allow_reserved_future_sources))
    errors.extend(_validate_provenance(payload))
    errors.extend(_validate_human_review_gate(payload))

    chunks = payload.get("chunks")
    if not isinstance(chunks, list):
        return errors + ["chunks must be a list."]
    if expected_chunk_count is not None and len(chunks) != expected_chunk_count:
        errors.append(f"Chunk count must be {expected_chunk_count}, found {len(chunks)}.")

    required_mappings = {
        _text(item)
        for item in source.get("required_mappings", [])
        if _text(item)
    }
    represented_mappings: dict[str, bool] = {item: False for item in required_mappings}
    excluded_sections = {_text(item).lower() for item in _as_list(source.get("excluded_sections"))}

    for index, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            errors.append(f"Chunk {index} must be an object.")
            continue
        errors.extend(_validate_chunk(index, chunk, source, excluded_sections))
        for mapping in represented_mappings:
            if _chunk_has_mapping(chunk, mapping):
                represented_mappings[mapping] = True

    missing_mappings = [mapping for mapping, present in represented_mappings.items() if not present]
    if missing_mappings:
        errors.append(f"Missing required mappings: {missing_mappings}")

    return errors


def validate_file(path: Path) -> list[str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"Pipeline payload could not be loaded: {exc}"]
    return validate_pipeline_payload(payload)


def _validate_reserved_sources_not_ingested(payload: dict[str, Any], allow_reserved: bool) -> list[str]:
    if allow_reserved:
        return []
    errors: list[str] = []
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    source_ids = {_text(source.get("source_id"))}
    for chunk in _as_list(payload.get("chunks")):
        if isinstance(chunk, dict):
            source_ids.add(_text(chunk.get("source_id")))
    reserved = sorted(source_ids & RESERVED_FUTURE_SOURCE_IDS)
    if reserved:
        errors.append(f"Reserved future sources are not ingested by this scaffold: {reserved}")

    excluded = payload.get("excluded_sources")
    if isinstance(excluded, dict):
        if excluded.get("childrens_homes_regulations_2015_full_text_ingested") is not False:
            errors.append("Regulations 2015 full-text ingestion flag must remain false.")
        if excluded.get("ofsted_sccif_childrens_homes_full_text_ingested") is not False:
            errors.append("SCCIF full-text ingestion flag must remain false.")
    return errors


def _validate_provenance(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    provenance = payload.get("provenance")
    if not isinstance(provenance, dict):
        return ["provenance must be an object."]

    if _text(provenance.get("checksum_algorithm")).lower() != CHECKSUM_ALGORITHM:
        errors.append("provenance.checksum_algorithm must be sha256.")
    if "canonical JSON" not in _text(provenance.get("checksum_strategy")):
        errors.append("provenance.checksum_strategy must describe canonical JSON.")
    if provenance.get("runtime_scraping_or_downloading") is not False:
        errors.append("provenance.runtime_scraping_or_downloading must be false.")
    if provenance.get("live_web_fetching") is not False:
        errors.append("provenance.live_web_fetching must be false.")

    source_checksum = _text(source.get("source_file_checksum"))
    provenance_checksum = _text(provenance.get("source_file_sha256"))
    if not provenance_checksum:
        errors.append("provenance.source_file_sha256 must be recorded.")
    elif source_checksum and provenance_checksum != source_checksum:
        errors.append("provenance.source_file_sha256 must match source.source_file_checksum.")

    documented = _text(provenance.get("chunk_json_sha256"))
    if not documented:
        errors.append("provenance.chunk_json_sha256 must be recorded.")
    else:
        actual = calculate_canonical_json_sha256(payload)
        if documented != actual:
            errors.append(f"provenance.chunk_json_sha256 changed: {actual} (documented {documented}).")

    source_path = _text(source.get("source_file_path"))
    if source_path and not source_path.startswith(("/", "http://", "https://")):
        resolved = ROOT / source_path
        if resolved.is_file() and source_checksum and calculate_file_sha256(resolved) != source_checksum:
            errors.append("source.source_file_checksum does not match the committed source artefact.")

    return errors


def _validate_human_review_gate(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    human_review = payload.get("human_review")
    if not isinstance(human_review, dict):
        return ["human_review must be an object."]

    quote_allowed = any(
        isinstance(chunk, dict) and chunk.get("quote_allowed") is True
        for chunk in _as_list(payload.get("chunks"))
    )
    if not quote_allowed:
        return errors

    if human_review.get("status") != "approved":
        errors.append("Human review must be approved before chunks become quote-allowed exact citation sources.")
    if not _text(human_review.get("reviewer")):
        errors.append("human_review.reviewer must be recorded for quote-allowed chunks.")
    if not _text(human_review.get("reviewed_at")):
        errors.append("human_review.reviewed_at must be recorded for quote-allowed chunks.")
    for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS:
        if human_review.get(field) is not True:
            errors.append(f"human_review.{field} must be true before exact citation use.")
    return errors


def _validate_chunk(
    index: int,
    chunk: dict[str, Any],
    source: dict[str, Any],
    excluded_sections: set[str],
) -> list[str]:
    errors: list[str] = []
    prefix = f"Chunk {index}"

    missing = [field for field in REQUIRED_CHUNK_FIELDS if field not in chunk]
    if missing:
        errors.append(f"{prefix} missing required metadata fields: {missing}")

    text = _text(chunk.get("text"))
    exact_excerpt = _text(chunk.get("exact_excerpt"))
    if not text:
        errors.append(f"{prefix} text must be present.")
    if len(text) > MAX_CHUNK_TEXT_CHARS:
        errors.append(f"{prefix} text exceeds max chunk size of {MAX_CHUNK_TEXT_CHARS} characters.")
    if _text(chunk.get("source_file_checksum")) != _text(source.get("source_file_checksum")):
        errors.append(f"{prefix} source_file_checksum must match the manifest checksum.")

    section_heading = _text(chunk.get("section_heading")).lower()
    if section_heading and section_heading in excluded_sections:
        errors.append(f"{prefix} is from an excluded source section.")

    errors.extend(_validate_reference_labels(prefix, chunk))
    errors.extend(_validate_quote_safety(prefix, chunk, exact_excerpt))
    errors.extend(_validate_boundary_language(prefix, chunk))
    return errors


def _validate_reference_labels(prefix: str, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    official_ref = _text(chunk.get("official_paragraph_reference"))
    paragraph_ref = _text(chunk.get("paragraph_reference"))
    citation_label = _text(chunk.get("citation_label"))
    lower_label = citation_label.lower()
    internal_chunk_id = _text(chunk.get("internal_chunk_id"))
    generated_reference = bool(chunk.get("generated_reference"))
    verified_official_ref = has_verified_official_reference(chunk)

    if official_ref and chunk.get("official_reference_present_in_source") is not True:
        errors.append(f"{prefix} uses an official reference not confirmed as present in the source.")
    if paragraph_ref and not official_ref and OFFICIAL_LOOKING_REFERENCE.fullmatch(paragraph_ref):
        errors.append(f"{prefix} generated paragraph labels cannot look official.")
    if generated_reference and MISLEADING_OFFICIAL_LABEL.search(citation_label):
        errors.append(f"{prefix} generated references must not be exposed as official citation labels.")

    has_clear_internal_id = (
        internal_chunk_id
        and "internal chunk" in lower_label
        and internal_chunk_id in citation_label
    )
    if (
        chunk.get("quote_allowed") is True
        and not verified_official_ref
        and is_official_looking_reference_label(citation_label)
    ):
        errors.append(
            f"{prefix} quote-allowed internal citation labels cannot look like official references."
        )
    if generated_reference and not has_clear_internal_id:
        errors.append(f"{prefix} generated splits must use an internal chunk label.")
    if chunk.get("quote_allowed") is True and not verified_official_ref and not has_clear_internal_id:
        errors.append(f"{prefix} quote-allowed internal chunks need a clear internal chunk label.")

    return errors


def has_verified_official_reference(chunk: dict[str, Any]) -> bool:
    if chunk.get("official_reference_present_in_source") is not True:
        return False
    return any(
        _text(chunk.get(field))
        for field in (
            "official_paragraph_reference",
            "official_regulation_reference",
            "official_section_reference",
            "official_article_reference",
            "official_reference",
            "regulation_number",
        )
    )


def is_official_looking_reference_label(label: str) -> bool:
    return bool(OFFICIAL_LOOKING_REFERENCE_LABEL.search(_text(label)))


def _validate_quote_safety(prefix: str, chunk: dict[str, Any], exact_excerpt: str) -> list[str]:
    errors: list[str] = []
    if chunk.get("quote_allowed") is not True:
        return errors

    if _text(chunk.get("basis_type")) != "exact":
        errors.append(f"{prefix} quote_allowed requires basis_type exact.")
    if chunk.get("source_text_exact") is not True:
        errors.append(f"{prefix} exact citations require exact source text.")
    if not exact_excerpt:
        errors.append(f"{prefix} exact citations require exact_excerpt.")
    quote_basis = _text(chunk.get("quote_basis")).lower()
    if "metadata" in quote_basis:
        errors.append(f"{prefix} metadata cannot be quoteable exact source text.")
    generated_metadata = chunk.get("generated_metadata")
    if isinstance(generated_metadata, dict) and generated_metadata.get("quote_allowed") is True:
        errors.append(f"{prefix} generated metadata cannot be quoteable.")
    return errors


def _validate_boundary_language(prefix: str, chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    positive_text = " ".join(
        _text(chunk.get(field))
        for field in (
            "text",
            "exact_excerpt",
            "citation_label",
            "section_heading",
            "professional_judgement_boundary",
        )
    )
    if _has_unnegated_match(COMPLIANCE_GUARANTEE_CLAIM, positive_text):
        errors.append(f"{prefix} claims a compliance guarantee.")
    if _has_unnegated_match(SCCIF_GRADE_PREDICTION_CLAIM, positive_text):
        errors.append(f"{prefix} claims or enables SCCIF grade prediction.")

    blocked_uses = " ".join(_text(item) for item in _as_list(chunk.get("not_to_be_used_for"))).lower()
    if "compliance" not in blocked_uses:
        errors.append(f"{prefix} must preserve a no-compliance-guarantee boundary.")
    if _text(chunk.get("source_id")) == SCCIF_SOURCE_ID and "grade" not in blocked_uses and "predict" not in blocked_uses:
        errors.append(f"{prefix} SCCIF chunks must preserve grade-prediction prohibition.")
    return errors


def _has_unnegated_match(pattern: re.Pattern[str], text: str) -> bool:
    for match in pattern.finditer(text):
        prefix = text[max(0, match.start() - 24) : match.start()].lower()
        if any(negation in prefix for negation in ("not ", "never ", "no ", "cannot ", "must not ")):
            continue
        return True
    return False


def _chunk_has_mapping(chunk: dict[str, Any], mapping: str) -> bool:
    values = {
        _text(chunk.get("quality_standard")),
        _text(chunk.get("regulation_number")),
        _text(chunk.get("sccif_judgement_area")),
    }
    values.update(_text(item) for item in _as_list(chunk.get("related_regulations")))
    values.update(_text(item) for item in _as_list(chunk.get("related_workflow_domains")))
    values.update(_text(item) for item in _as_list(chunk.get("workflow_domains")))
    return mapping in values


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate an offline ORB source-to-chunk scaffold payload."
    )
    parser.add_argument("payload", nargs="?", type=Path, help="Path to a generated payload JSON file.")
    parser.add_argument(
        "--print-manifest-template",
        action="store_true",
        help="Print the required source manifest template and exit.",
    )
    args = parser.parse_args()

    if args.print_manifest_template:
        print(json.dumps(source_manifest_template(), indent=2, sort_keys=True))
        return 0
    if not args.payload:
        parser.error("payload is required unless --print-manifest-template is used")

    errors = validate_file(args.payload)
    if errors:
        print("ORB source-to-chunk scaffold validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("ORB source-to-chunk scaffold validation passed.")
    print(f"Checksum strategy: {CHECKSUM_STRATEGY}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
