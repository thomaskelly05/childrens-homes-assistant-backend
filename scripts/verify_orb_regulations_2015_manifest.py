#!/usr/bin/env python3
"""Validate the ORB Regulations 2015 ingestion-prep scaffold.

This verifier is intentionally source-specific and offline. It validates the
manifest and future chunk metadata contract for The Children's Homes (England)
Regulations 2015 without fetching, parsing, ingesting, publishing, or wiring
the Regulations into live ORB answers.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

REGULATIONS_2015_SOURCE_ID = "childrens_homes_regulations_2015"
SCHEMA_VERSION = "orb-regulations-2015-ingestion-prep-v1"
OFFICIAL_URL_PREFIX = "https://www.legislation.gov.uk/uksi/2015/541"
CHECKSUM_RE = re.compile(r"^[a-f0-9]{64}$")
REGULATION_NUMBER_RE = re.compile(r"^\d+[A-Z]?$", re.IGNORECASE)
OFFICIAL_REGULATION_LABEL_RE = re.compile(
    r"\b(?:regulation|reg\.?)\s*\d+[A-Z]?(?:\(\d+\))*\b",
    re.IGNORECASE,
)
LEGAL_ADVICE_CLAIM_RE = re.compile(
    r"\b(?:legal advice|legally advises?|legal opinion|definitive legal view)\b",
    re.IGNORECASE,
)
COMPLIANCE_GUARANTEE_CLAIM_RE = re.compile(
    r"\b(?:guarantees?|guaranteed|guaranteeing|ensures?|ensured|ensuring)\s+"
    r"(?:statutory\s+|legal\s+)?compliance\b",
    re.IGNORECASE,
)

REQUIRED_MANIFEST_FIELDS: tuple[str, ...] = (
    "source_id",
    "source_title",
    "official_source_identity",
    "official_url",
    "publisher",
    "jurisdiction",
    "version",
    "last_verified_date",
    "source_file_path",
    "source_file_checksum",
    "statutory_status",
    "citation_authority",
    "ingestion_scope",
    "excluded_sections",
    "requires_human_review",
    "allowed_quote_basis",
    "professional_judgement_boundary",
    "not_to_be_used_for",
    "regulation_index_required",
    "part_index_required",
    "schedule_index_required",
    "legal_advice_boundary",
    "compliance_guarantee_blocked",
)

LIST_MANIFEST_FIELDS = {
    "excluded_sections",
    "allowed_quote_basis",
    "not_to_be_used_for",
}
TRUE_MANIFEST_FIELDS = {
    "requires_human_review",
    "regulation_index_required",
    "part_index_required",
    "schedule_index_required",
    "compliance_guarantee_blocked",
}

REQUIRED_CHUNK_FIELDS: tuple[str, ...] = (
    "regulation_number",
    "regulation_title",
    "part_number",
    "part_title",
    "schedule_number",
    "schedule_title",
    "official_reference",
    "internal_chunk_id",
    "source_text_exact",
    "generated_metadata",
    "quote_allowed",
    "quote_basis",
    "citation_label",
    "related_quality_standards",
    "related_workflow_domains",
    "requires_local_policy",
    "professional_judgement_boundary",
    "legal_advice_boundary",
    "not_to_be_used_for",
)

LIST_CHUNK_FIELDS = {
    "related_quality_standards",
    "related_workflow_domains",
    "not_to_be_used_for",
}

ALLOWED_CONTENT_KINDS = {
    "regulation_text",
    "heading",
    "schedule_text",
    "generated_metadata",
    "guide_commentary_reference",
}
QUOTEABLE_CONTENT_KINDS = {"regulation_text", "schedule_text"}
ALLOWED_QUOTE_BASIS = {
    "exact_regulation_text_after_human_review",
    "exact_schedule_text_after_human_review",
    "none_until_human_review",
}
REQUIRED_HUMAN_REVIEW_CONFIRMATIONS: tuple[str, ...] = (
    "official_source_identity_confirmed",
    "official_url_confirmed",
    "version_date_confirmed",
    "source_file_checksum_confirmed",
    "regulation_index_confirmed",
    "part_schedule_index_confirmed",
    "citation_labels_confirmed",
    "source_text_exactness_confirmed",
    "metadata_separation_confirmed",
    "guide_commentary_separation_confirmed",
    "legal_advice_boundary_confirmed",
    "compliance_guarantee_boundary_confirmed",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _schema_for(
    fields: tuple[str, ...],
    list_fields: set[str],
    true_fields: set[str] | None = None,
) -> dict[str, dict[str, Any]]:
    true_fields = true_fields or set()
    schema: dict[str, dict[str, Any]] = {}
    for field in fields:
        if field in list_fields:
            field_type = "list"
        elif field in true_fields:
            field_type = "boolean"
        else:
            field_type = "string"
        schema[field] = {"required": True, "type": field_type}
    return schema


def regulations_2015_manifest_schema() -> dict[str, dict[str, Any]]:
    return _schema_for(REQUIRED_MANIFEST_FIELDS, LIST_MANIFEST_FIELDS, TRUE_MANIFEST_FIELDS)


def regulation_chunk_schema() -> dict[str, dict[str, Any]]:
    return _schema_for(REQUIRED_CHUNK_FIELDS, LIST_CHUNK_FIELDS)


def regulations_2015_manifest_template() -> dict[str, Any]:
    return {
        "source_id": REGULATIONS_2015_SOURCE_ID,
        "source_title": "The Children's Homes (England) Regulations 2015",
        "official_source_identity": "UK legislation official statutory instrument record",
        "official_url": OFFICIAL_URL_PREFIX + "/contents",
        "publisher": "UK legislation",
        "jurisdiction": "England",
        "version": "",
        "last_verified_date": "",
        "source_file_path": "",
        "source_file_checksum": "",
        "statutory_status": "statutory_instrument",
        "citation_authority": "official_legislation_text",
        "ingestion_scope": (
            "Future Regulations 2015 ingestion only; no source text ingested by "
            "this scaffold."
        ),
        "excluded_sections": [],
        "requires_human_review": True,
        "allowed_quote_basis": sorted(ALLOWED_QUOTE_BASIS),
        "professional_judgement_boundary": (
            "ORB supports professional thinking and recording; registered manager and "
            "provider judgement remains required."
        ),
        "not_to_be_used_for": [
            "providing legal advice",
            "deciding statutory compliance",
            "deciding notification thresholds",
            "replacing registered manager or provider judgement",
            "guaranteeing Ofsted outcomes",
        ],
        "regulation_index_required": True,
        "part_index_required": True,
        "schedule_index_required": True,
        "legal_advice_boundary": "ORB cannot provide legal advice.",
        "compliance_guarantee_blocked": True,
    }


def validate_regulations_2015_manifest(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["Regulations 2015 manifest must be an object."]

    missing = [field for field in REQUIRED_MANIFEST_FIELDS if field not in manifest]
    if missing:
        errors.append(f"Regulations 2015 manifest missing fields: {missing}")

    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in manifest:
            continue
        value = manifest.get(field)
        if field in LIST_MANIFEST_FIELDS:
            if not isinstance(value, list):
                errors.append(f"source.{field} must be a list.")
            elif not value and field in {"allowed_quote_basis", "not_to_be_used_for"}:
                errors.append(f"source.{field} must not be empty.")
            continue
        if field in TRUE_MANIFEST_FIELDS:
            if value is not True:
                errors.append(f"source.{field} must be true for Regulations 2015 ingestion prep.")
            continue
        if not _text(value):
            errors.append(f"source.{field} must be present.")

    if _text(manifest.get("source_id")) != REGULATIONS_2015_SOURCE_ID:
        errors.append(f"source.source_id must be {REGULATIONS_2015_SOURCE_ID!r}.")
    if not _text(manifest.get("official_url")).startswith(OFFICIAL_URL_PREFIX):
        errors.append("source.official_url must be the official legislation.gov.uk 2015/541 URL.")
    if _text(manifest.get("publisher")).lower() not in {"uk legislation", "legislation.gov.uk"}:
        errors.append("source.publisher must identify the official legislation publisher.")
    if _text(manifest.get("jurisdiction")).lower() != "england":
        errors.append("source.jurisdiction must be England.")
    if _text(manifest.get("source_file_path")).startswith(("http://", "https://")):
        errors.append("source.source_file_path must be a committed local artefact path, not a runtime URL.")
    checksum = _text(manifest.get("source_file_checksum")).lower()
    if checksum and not CHECKSUM_RE.fullmatch(checksum):
        errors.append("source.source_file_checksum must be a 64-character sha256 hex digest.")
    allowed_quote_basis = set(_as_list(manifest.get("allowed_quote_basis")))
    if not allowed_quote_basis <= ALLOWED_QUOTE_BASIS:
        errors.append("source.allowed_quote_basis includes unapproved quote bases.")
    if any("metadata" in _text(item).lower() for item in allowed_quote_basis):
        errors.append("source.allowed_quote_basis cannot allow generated metadata as exact source text.")

    errors.extend(_validate_manifest_boundaries(manifest))
    if manifest.get("regulations_2015_full_text_ingested") is True:
        errors.append("Regulations 2015 source text must not be ingested by this prep scaffold.")
    if manifest.get("sccif_full_text_ingested") is True:
        errors.append("SCCIF must not be ingested by this Regulations 2015 prep scaffold.")
    return errors


def validate_regulations_2015_chunk(
    chunk: dict[str, Any],
    *,
    verified_regulation_numbers: set[str] | None = None,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(chunk, dict):
        return ["Regulations 2015 chunk must be an object."]

    missing = [field for field in REQUIRED_CHUNK_FIELDS if field not in chunk]
    if missing:
        errors.append(f"Regulations 2015 chunk missing fields: {missing}")

    for field in LIST_CHUNK_FIELDS:
        if field in chunk and not isinstance(chunk.get(field), list):
            errors.append(f"chunk.{field} must be a list.")
    if "generated_metadata" in chunk and not isinstance(chunk.get("generated_metadata"), dict):
        errors.append("chunk.generated_metadata must be an object.")

    metadata = chunk.get("generated_metadata") if isinstance(chunk.get("generated_metadata"), dict) else {}
    content_kind = _text(metadata.get("content_kind") or chunk.get("content_kind"))
    if not content_kind:
        errors.append(
            "chunk.generated_metadata.content_kind must distinguish regulation text, "
            "headings, schedules, metadata, or Guide commentary."
        )
    elif content_kind not in ALLOWED_CONTENT_KINDS:
        errors.append(
            "chunk.generated_metadata.content_kind is not approved for Regulations 2015 prep."
        )

    regulation_number = normalise_regulation_number(chunk.get("regulation_number"))
    if content_kind == "regulation_text":
        if not regulation_number:
            errors.append("Regulations 2015 regulation_text chunks require regulation_number.")
        elif not REGULATION_NUMBER_RE.fullmatch(regulation_number):
            errors.append("chunk.regulation_number must be a regulation number, not generated prose.")
        if not _text(chunk.get("official_reference")):
            errors.append("Regulations 2015 regulation_text chunks require official_reference.")
    if content_kind == "schedule_text" and not _text(chunk.get("schedule_number")):
        errors.append("Regulations 2015 schedule_text chunks require schedule_number.")
    if content_kind == "guide_commentary_reference" and chunk.get("treat_as_regulations_ingestion") is True:
        errors.append("Embedded Guide references must not be treated as Regulations 2015 ingestion.")

    verified_numbers = {normalise_regulation_number(item) for item in (verified_regulation_numbers or set())}
    verified_numbers.discard("")
    official_reference = _text(chunk.get("official_reference"))
    has_verified_regulation = bool(regulation_number and regulation_number in verified_numbers and official_reference)
    errors.extend(_validate_regulation_citation_label(chunk, has_verified_regulation))
    errors.extend(_validate_chunk_quote_safety(chunk, content_kind))
    errors.extend(_validate_chunk_boundaries(chunk))
    return errors


def validate_regulations_2015_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["Regulations 2015 prep payload must be an object."]

    manifest = payload.get("source")
    if not isinstance(manifest, dict):
        return ["payload.source must be a Regulations 2015 manifest object."]
    errors.extend(validate_regulations_2015_manifest(manifest))

    excluded = payload.get("excluded_sources") or {}
    if not isinstance(excluded, dict):
        errors.append("payload.excluded_sources must be an object.")
    else:
        if excluded.get("childrens_homes_regulations_2015_full_text_ingested") is not False:
            errors.append("Regulations 2015 full-text ingestion flag must remain false.")
        if excluded.get("ofsted_sccif_childrens_homes_full_text_ingested") is not False:
            errors.append("SCCIF full-text ingestion flag must remain false.")

    chunks = payload.get("chunks", [])
    if not isinstance(chunks, list):
        return errors + ["payload.chunks must be a list."]
    verified_numbers = {
        normalise_regulation_number(item)
        for item in _as_list(payload.get("verified_regulation_numbers"))
    }
    verified_numbers.discard("")
    quote_allowed_present = False
    for index, chunk in enumerate(chunks):
        chunk_errors = validate_regulations_2015_chunk(
            chunk,
            verified_regulation_numbers=verified_numbers,
        )
        errors.extend(f"Chunk {index}: {error}" for error in chunk_errors)
        quote_allowed_present = quote_allowed_present or (
            isinstance(chunk, dict) and chunk.get("quote_allowed") is True
        )

    if quote_allowed_present:
        errors.extend(_validate_human_review(payload.get("human_review")))
    if payload.get("runtime_answer_wiring_changed") is True:
        errors.append("Runtime ORB answer wiring must not change in Regulations 2015 prep.")
    if payload.get("frontend_behaviour_changed") is True:
        errors.append("Frontend behaviour must not change in Regulations 2015 prep.")
    return errors


def normalise_regulation_number(value: Any) -> str:
    text = _text(value)
    return re.sub(r"^(?:regulation|reg\.?)\s*", "", text, flags=re.IGNORECASE).strip()


def _validate_manifest_boundaries(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    blocked = " ".join(_text(item) for item in _as_list(manifest.get("not_to_be_used_for"))).lower()
    required_fragments = {
        "legal advice": "source.not_to_be_used_for must block legal advice.",
        "compliance": "source.not_to_be_used_for must block statutory compliance decisions or guarantees.",
        "notification": "source.not_to_be_used_for must block notification-threshold decisions.",
        "judgement": "source.not_to_be_used_for must preserve registered manager/provider judgement.",
        "ofsted": "source.not_to_be_used_for must block Ofsted outcome guarantees.",
    }
    for fragment, message in required_fragments.items():
        if fragment not in blocked:
            errors.append(message)
    legal_boundary = _text(manifest.get("legal_advice_boundary")).lower()
    if "cannot provide legal advice" not in legal_boundary and "not legal advice" not in legal_boundary:
        errors.append("source.legal_advice_boundary must state that ORB cannot provide legal advice.")
    judgement_boundary = _text(manifest.get("professional_judgement_boundary")).lower()
    if "judgement" not in judgement_boundary:
        errors.append("source.professional_judgement_boundary must preserve professional judgement.")
    return errors


def _validate_regulation_citation_label(chunk: dict[str, Any], has_verified_regulation: bool) -> list[str]:
    errors: list[str] = []
    label = _text(chunk.get("citation_label"))
    metadata = chunk.get("generated_metadata") if isinstance(chunk.get("generated_metadata"), dict) else {}
    generated_label = bool(metadata.get("generated_label") or chunk.get("generated_reference"))
    internal_chunk_id = _text(chunk.get("internal_chunk_id"))
    clear_internal_label = (
        internal_chunk_id.startswith("internal:")
        and "internal chunk" in label.lower()
        and internal_chunk_id in label
    )

    if OFFICIAL_REGULATION_LABEL_RE.search(label) and not has_verified_regulation:
        errors.append("Official regulation citation labels require a verified regulation_number and official_reference.")
    if generated_label and OFFICIAL_REGULATION_LABEL_RE.search(label):
        errors.append("Generated citation labels must not look like official Regulation labels.")
    if generated_label and not clear_internal_label:
        errors.append("Generated/internal splits must use a clear internal chunk label.")
    if chunk.get("quote_allowed") is True and not has_verified_regulation and not clear_internal_label:
        errors.append("Quote-allowed internal chunks require a clear internal chunk label.")
    return errors


def _validate_chunk_quote_safety(chunk: dict[str, Any], content_kind: str) -> list[str]:
    errors: list[str] = []
    if chunk.get("quote_allowed") is not True:
        return errors

    if content_kind not in QUOTEABLE_CONTENT_KINDS:
        errors.append("Only exact regulation or schedule text may be quote-allowed.")
    if chunk.get("source_text_exact") is not True:
        errors.append("Exact citations require exact Regulation source text.")
    if _text(chunk.get("quote_basis")) not in ALLOWED_QUOTE_BASIS - {"none_until_human_review"}:
        errors.append("chunk.quote_basis must be exact Regulation or Schedule text after human review.")
    if "metadata" in _text(chunk.get("quote_basis")).lower():
        errors.append("Metadata cannot be cited as exact Regulation source text.")

    metadata = chunk.get("generated_metadata") if isinstance(chunk.get("generated_metadata"), dict) else {}
    if metadata.get("quote_allowed") is True:
        errors.append("Generated metadata cannot be quote-allowed.")
    return errors


def _validate_chunk_boundaries(chunk: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    text_to_check = " ".join(
        _text(chunk.get(field))
        for field in (
            "citation_label",
            "professional_judgement_boundary",
            "legal_advice_boundary",
        )
    )
    if _has_unnegated_match(LEGAL_ADVICE_CLAIM_RE, text_to_check):
        errors.append("Regulations 2015 chunks must not present ORB as giving legal advice.")
    if _has_unnegated_match(COMPLIANCE_GUARANTEE_CLAIM_RE, text_to_check):
        errors.append("Regulations 2015 chunks must not claim compliance is guaranteed.")

    blocked = " ".join(_text(item) for item in _as_list(chunk.get("not_to_be_used_for"))).lower()
    if "legal advice" not in blocked:
        errors.append("chunk.not_to_be_used_for must block legal advice.")
    if "compliance" not in blocked:
        errors.append("chunk.not_to_be_used_for must block compliance guarantees or decisions.")
    if "notification" not in blocked:
        errors.append("chunk.not_to_be_used_for must block notification-threshold decisions.")
    if "judgement" not in _text(chunk.get("professional_judgement_boundary")).lower():
        errors.append("chunk.professional_judgement_boundary must preserve professional judgement.")
    legal_boundary = _text(chunk.get("legal_advice_boundary")).lower()
    if "cannot provide legal advice" not in legal_boundary and "not legal advice" not in legal_boundary:
        errors.append("chunk.legal_advice_boundary must state that ORB cannot provide legal advice.")
    return errors


def _validate_human_review(human_review: Any) -> list[str]:
    if not isinstance(human_review, dict):
        return ["human_review must be recorded before quote-allowed Regulations 2015 chunks are accepted."]
    errors: list[str] = []
    if human_review.get("status") != "approved":
        errors.append("Human review must be approved before exact Regulations 2015 citations are allowed.")
    if not _text(human_review.get("reviewer")):
        errors.append("human_review.reviewer must be recorded for exact Regulations 2015 citations.")
    if not _text(human_review.get("reviewed_at")):
        errors.append("human_review.reviewed_at must be recorded for exact Regulations 2015 citations.")
    for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS:
        if human_review.get(field) is not True:
            errors.append(f"human_review.{field} must be true before exact Regulations 2015 citations.")
    return errors


def _has_unnegated_match(pattern: re.Pattern[str], text: str) -> bool:
    for match in pattern.finditer(text):
        prefix = text[max(0, match.start() - 32) : match.start()].lower()
        if any(
            negation in prefix
            for negation in (
                "not ",
                "never ",
                "no ",
                "cannot ",
                "cannot provide ",
                "does not provide ",
                "do not provide ",
                "must not ",
                "must not provide ",
            )
        ):
            continue
        return True
    return False


def validate_file(path: Path) -> list[str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"Regulations 2015 prep payload could not be loaded: {exc}"]
    return validate_regulations_2015_payload(payload)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate an offline Regulations 2015 ingestion-prep payload."
    )
    parser.add_argument("payload", nargs="?", type=Path)
    parser.add_argument("--print-manifest-template", action="store_true")
    parser.add_argument("--print-manifest-schema", action="store_true")
    parser.add_argument("--print-chunk-schema", action="store_true")
    args = parser.parse_args()

    if args.print_manifest_template:
        print(json.dumps(regulations_2015_manifest_template(), indent=2, sort_keys=True))
        return 0
    if args.print_manifest_schema:
        print(json.dumps(regulations_2015_manifest_schema(), indent=2, sort_keys=True))
        return 0
    if args.print_chunk_schema:
        print(json.dumps(regulation_chunk_schema(), indent=2, sort_keys=True))
        return 0
    if not args.payload:
        parser.error("payload is required unless a print option is used")

    errors = validate_file(args.payload)
    if errors:
        print("Regulations 2015 ingestion-prep validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Regulations 2015 ingestion-prep validation passed.")
    print("No Regulations 2015 source text was ingested by this verifier.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
