#!/usr/bin/env python3
"""Validate the ORB SCCIF children's homes ingestion-prep scaffold.

This verifier is intentionally source-specific and offline. It validates the
manifest and future chunk metadata contract for the Ofsted Social Care Common
Inspection Framework (SCCIF): children's homes without fetching, parsing,
ingesting, publishing, or wiring SCCIF into live ORB answers.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

SCCIF_CHILDREN_HOMES_SOURCE_ID = "ofsted_sccif_childrens_homes"
SCHEMA_VERSION = "orb-sccif-children-homes-ingestion-prep-v1"
OFFICIAL_URL_PREFIX = (
    "https://www.gov.uk/government/publications/"
    "social-care-common-inspection-framework-sccif-childrens-homes"
)
CHECKSUM_RE = re.compile(r"^[a-f0-9]{64}$")
OFFICIAL_SCCIF_LABEL_RE = re.compile(
    r"\b(?:sccif|social care common inspection framework)\b.{0,80}\b(?:section|part|paragraph|para\.?)\s*\d+",
    re.IGNORECASE,
)
OFFICIAL_SCCIF_JUDGEMENT_LABEL_RE = re.compile(
    r"\b(?:overall experiences and progress|helped and protected|effectiveness of leaders and managers|"
    r"how well children are helped and protected)\b",
    re.IGNORECASE,
)
OFFICIAL_SCCIF_EVALUATION_LABEL_RE = re.compile(
    r"\b(?:evaluation area|evaluation criterion|evaluation criteria)\b",
    re.IGNORECASE,
)
COMPLIANCE_GUARANTEE_CLAIM_RE = re.compile(
    r"\b(?:guarantees?|guaranteed|guaranteeing|ensures?|ensured|ensuring)\s+"
    r"(?:statutory\s+|legal\s+|sccif\s+)?compliance\b",
    re.IGNORECASE,
)
UNSAFE_BOUNDARY_CLAIMS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(
            r"\borb\s+predicts?\b.{0,80}\b(?:ofsted\s+)?(?:judgements?|outcomes?|grades?)\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB predicts Ofsted judgements, outcomes, or grades.",
    ),
    (
        re.compile(
            r"\borb\s+guarantees?\b.{0,80}\b(?:inspection\s+outcomes?|ofsted\s+outcomes?|ofsted\s+judgements?)\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB guarantees inspection or Ofsted outcomes.",
    ),
    (
        re.compile(
            r"\borb\s+decides?\b.{0,80}\b(?:home\s+is\s+)?inspection\s+ready\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB decides inspection readiness.",
    ),
    (
        re.compile(
            r"\borb\s+confirms?\b.{0,80}\b(?:evidence\s+)?meets?\s+(?:outstanding|good|requires improvement|inadequate)\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB confirms evidence meets an Ofsted grade.",
    ),
    (
        re.compile(
            r"\borb\s+determines?\b.{0,80}\b(?:home|provider)\b.{0,80}\b(?:is\s+)?good\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB determines the home is good.",
    ),
    (
        re.compile(
            r"\borb\s+grades?\b.{0,80}\b(?:home|provider)\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB grades the home or provider.",
    ),
    (
        re.compile(
            r"\borb\s+decides?\b.{0,80}\bsccif\s+compliance\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB decides SCCIF compliance.",
    ),
    (
        re.compile(
            r"\borb\s+replaces?\b.{0,80}\b(?:ofsted|inspector)\b.{0,80}\bjudgement\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB replaces Ofsted or inspector judgement.",
    ),
    (
        re.compile(
            r"\borb\s+replaces?\b.{0,80}\b(?:registered\s+manager|responsible\s+individual|provider)\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB replaces Registered Manager, Responsible Individual, or provider judgement.",
    ),
    (
        re.compile(
            r"\borb\s+guarantees?\b.{0,80}\bcompliance\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB guarantees compliance.",
    ),
    (
        re.compile(
            r"\borb\s+decides?\b.{0,80}\b(?:statutory|legal)\s+compliance\b",
            re.IGNORECASE,
        ),
        "SCCIF chunks must not say ORB decides statutory or legal compliance.",
    ),
)

REQUIRED_MANIFEST_FIELDS: tuple[str, ...] = (
    "source_id",
    "source_title",
    "official_url",
    "publisher",
    "jurisdiction",
    "version",
    "last_verified_date",
    "source_file_path",
    "source_file_checksum",
    "framework_status",
    "citation_authority",
    "ingestion_scope",
    "excluded_sections",
    "requires_human_review",
    "allowed_quote_basis",
    "professional_judgement_boundary",
    "not_to_be_used_for",
    "judgement_area_index_required",
    "evaluation_area_index_required",
    "inspection_evidence_theme_index_required",
    "grade_prediction_blocked",
    "compliance_guarantee_blocked",
)

LIST_MANIFEST_FIELDS = {
    "excluded_sections",
    "allowed_quote_basis",
    "not_to_be_used_for",
}
TRUE_MANIFEST_FIELDS = {
    "requires_human_review",
    "judgement_area_index_required",
    "evaluation_area_index_required",
    "inspection_evidence_theme_index_required",
    "grade_prediction_blocked",
    "compliance_guarantee_blocked",
}

REQUIRED_CHUNK_FIELDS: tuple[str, ...] = (
    "judgement_area",
    "evaluation_area",
    "inspection_evidence_theme",
    "section_heading",
    "official_reference",
    "internal_chunk_id",
    "source_text_exact",
    "generated_metadata",
    "quote_allowed",
    "quote_basis",
    "citation_label",
    "related_quality_standards",
    "related_regulations",
    "related_workflow_domains",
    "requires_local_policy",
    "professional_judgement_boundary",
    "grade_prediction_boundary",
    "compliance_guarantee_boundary",
    "not_to_be_used_for",
)

LIST_CHUNK_FIELDS = {
    "related_quality_standards",
    "related_regulations",
    "related_workflow_domains",
    "not_to_be_used_for",
}

ALLOWED_CONTENT_KINDS = {
    "framework_text",
    "heading",
    "generated_metadata",
    "guide_commentary_reference",
    "regulations_commentary_reference",
}
QUOTEABLE_CONTENT_KINDS = {"framework_text"}
ALLOWED_QUOTE_BASIS = {
    "exact_sccif_framework_text_after_human_review",
    "none_until_human_review",
}
KNOWN_JUDGEMENT_AREAS = {
    "overall_experiences_progress",
    "helped_and_protected",
    "leadership_management",
}
REQUIRED_HUMAN_REVIEW_CONFIRMATIONS: tuple[str, ...] = (
    "source_provenance_confirmed",
    "official_url_confirmed",
    "version_date_confirmed",
    "source_file_checksum_confirmed",
    "judgement_area_mapping_confirmed",
    "evaluation_area_mapping_confirmed",
    "inspection_evidence_theme_mapping_confirmed",
    "chunk_boundaries_confirmed",
    "citation_labels_confirmed",
    "quote_allowed_status_confirmed",
    "related_quality_standards_mapping_confirmed",
    "related_regulations_mapping_confirmed",
    "related_workflow_domains_mapping_confirmed",
    "source_text_exactness_confirmed",
    "metadata_separation_confirmed",
    "guide_commentary_separation_confirmed",
    "regulations_commentary_separation_confirmed",
    "local_policy_contamination_checked",
    "no_overclaiming_confirmed",
    "grade_prediction_boundary_confirmed",
    "compliance_guarantee_boundary_confirmed",
    "checksum_recorded",
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


def sccif_children_homes_manifest_schema() -> dict[str, dict[str, Any]]:
    return _schema_for(REQUIRED_MANIFEST_FIELDS, LIST_MANIFEST_FIELDS, TRUE_MANIFEST_FIELDS)


def sccif_children_homes_chunk_schema() -> dict[str, dict[str, Any]]:
    return _schema_for(REQUIRED_CHUNK_FIELDS, LIST_CHUNK_FIELDS)


def sccif_children_homes_manifest_template() -> dict[str, Any]:
    return {
        "source_id": SCCIF_CHILDREN_HOMES_SOURCE_ID,
        "source_title": "Social care common inspection framework (SCCIF): children's homes",
        "official_url": OFFICIAL_URL_PREFIX,
        "publisher": "Ofsted",
        "jurisdiction": "England",
        "version": "",
        "last_verified_date": "",
        "source_file_path": "",
        "source_file_checksum": "",
        "framework_status": "inspection_framework",
        "citation_authority": "official_ofsted_inspection_framework_text",
        "ingestion_scope": (
            "Future SCCIF children's homes ingestion only; no source text ingested by "
            "this scaffold."
        ),
        "excluded_sections": [],
        "requires_human_review": True,
        "allowed_quote_basis": sorted(ALLOWED_QUOTE_BASIS),
        "professional_judgement_boundary": (
            "ORB supports evidence review and inspection preparation; Ofsted, Registered "
            "Manager, Responsible Individual and provider judgement remain required."
        ),
        "not_to_be_used_for": [
            "predicting Ofsted judgements or grades",
            "deciding inspection readiness",
            "guaranteeing inspection outcomes",
            "deciding statutory compliance",
            "replacing Ofsted or inspector judgement",
            "replacing registered manager or provider judgement",
        ],
        "judgement_area_index_required": True,
        "evaluation_area_index_required": True,
        "inspection_evidence_theme_index_required": True,
        "grade_prediction_blocked": True,
        "compliance_guarantee_blocked": True,
    }


def validate_sccif_children_homes_manifest(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return ["SCCIF children's homes manifest must be an object."]

    missing = [field for field in REQUIRED_MANIFEST_FIELDS if field not in manifest]
    if missing:
        errors.append(f"SCCIF children's homes manifest missing fields: {missing}")

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
                errors.append(
                    f"source.{field} must be true for SCCIF children's homes ingestion prep."
                )
            continue
        if not _text(value):
            errors.append(f"source.{field} must be present.")

    if _text(manifest.get("source_id")) != SCCIF_CHILDREN_HOMES_SOURCE_ID:
        errors.append(f"source.source_id must be {SCCIF_CHILDREN_HOMES_SOURCE_ID!r}.")
    if not _text(manifest.get("official_url")).startswith(OFFICIAL_URL_PREFIX):
        errors.append(
            "source.official_url must be the official gov.uk SCCIF children's homes URL."
        )
    if _text(manifest.get("publisher")).lower() != "ofsted":
        errors.append("source.publisher must identify Ofsted as the official publisher.")
    if _text(manifest.get("jurisdiction")).lower() != "england":
        errors.append("source.jurisdiction must be England.")
    if _text(manifest.get("source_file_path")).startswith(("http://", "https://")):
        errors.append(
            "source.source_file_path must be a committed local artefact path, not a runtime URL."
        )
    checksum = _text(manifest.get("source_file_checksum")).lower()
    if checksum and not CHECKSUM_RE.fullmatch(checksum):
        errors.append("source.source_file_checksum must be a 64-character sha256 hex digest.")
    allowed_quote_basis = set(_as_list(manifest.get("allowed_quote_basis")))
    if not allowed_quote_basis <= ALLOWED_QUOTE_BASIS:
        errors.append("source.allowed_quote_basis includes unapproved quote bases.")
    if any("metadata" in _text(item).lower() for item in allowed_quote_basis):
        errors.append("source.allowed_quote_basis cannot allow generated metadata as exact source text.")

    errors.extend(_validate_manifest_boundaries(manifest))
    if manifest.get("ofsted_sccif_childrens_homes_full_text_ingested") is True:
        errors.append("SCCIF source text must not be ingested by this prep scaffold.")
    return errors


def validate_sccif_children_homes_chunk(
    chunk: dict[str, Any],
    *,
    verified_judgement_areas: set[str] | None = None,
    verified_official_references: set[str] | None = None,
) -> list[str]:
    errors: list[str] = []
    if not isinstance(chunk, dict):
        return ["SCCIF children's homes chunk must be an object."]

    missing = [field for field in REQUIRED_CHUNK_FIELDS if field not in chunk]
    if missing:
        errors.append(f"SCCIF children's homes chunk missing fields: {missing}")

    for field in LIST_CHUNK_FIELDS:
        if field in chunk and not isinstance(chunk.get(field), list):
            errors.append(f"chunk.{field} must be a list.")
    if "generated_metadata" in chunk and not isinstance(chunk.get("generated_metadata"), dict):
        errors.append("chunk.generated_metadata must be an object.")

    metadata = chunk.get("generated_metadata") if isinstance(chunk.get("generated_metadata"), dict) else {}
    content_kind = _text(metadata.get("content_kind") or chunk.get("content_kind"))
    if not content_kind:
        errors.append(
            "chunk.generated_metadata.content_kind must distinguish framework text, "
            "headings, metadata, or Guide/Regulations commentary."
        )
    elif content_kind not in ALLOWED_CONTENT_KINDS:
        errors.append(
            "chunk.generated_metadata.content_kind is not approved for SCCIF children's homes prep."
        )

    judgement_area = normalise_judgement_area(chunk.get("judgement_area"))
    verified_areas = {normalise_judgement_area(item) for item in (verified_judgement_areas or set())}
    verified_areas.discard("")
    verified_references = {
        _text(item).lower() for item in (verified_official_references or set()) if _text(item)
    }

    if content_kind == "framework_text":
        if not judgement_area:
            errors.append("SCCIF framework_text chunks require judgement_area.")
        elif verified_areas and judgement_area not in verified_areas:
            errors.append("chunk.judgement_area must be present in the verified judgement area index.")
        if not _text(chunk.get("evaluation_area")):
            errors.append("SCCIF framework_text chunks require evaluation_area.")
        if not _text(chunk.get("inspection_evidence_theme")):
            errors.append("SCCIF framework_text chunks require inspection_evidence_theme.")
        if not _text(chunk.get("official_reference")):
            errors.append("SCCIF framework_text chunks require official_reference.")
    if content_kind == "guide_commentary_reference" and chunk.get("treat_as_sccif_ingestion") is True:
        errors.append("Embedded Guide references must not be treated as SCCIF ingestion.")
    if content_kind == "regulations_commentary_reference" and chunk.get("treat_as_sccif_ingestion") is True:
        errors.append("Embedded Regulations references must not be treated as SCCIF ingestion.")

    has_verified_official_reference = (
        bool(_text(chunk.get("official_reference")))
        and _text(chunk.get("official_reference")).lower() in verified_references
    )
    has_verified_judgement_area = bool(judgement_area and judgement_area in verified_areas)
    errors.extend(
        _validate_sccif_citation_label(
            chunk,
            has_verified_official_reference=has_verified_official_reference,
            has_verified_judgement_area=has_verified_judgement_area,
        )
    )
    errors.extend(_validate_chunk_quote_safety(chunk, content_kind))
    errors.extend(_validate_chunk_boundaries(chunk))
    return errors


def validate_sccif_children_homes_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["SCCIF children's homes prep payload must be an object."]

    manifest = payload.get("source")
    if not isinstance(manifest, dict):
        return ["payload.source must be a SCCIF children's homes manifest object."]
    errors.extend(validate_sccif_children_homes_manifest(manifest))

    excluded = payload.get("excluded_sources") or {}
    if not isinstance(excluded, dict):
        errors.append("payload.excluded_sources must be an object.")
    else:
        if excluded.get("ofsted_sccif_childrens_homes_full_text_ingested") is not False:
            errors.append("SCCIF full-text ingestion flag must remain false.")

    chunks = payload.get("chunks", [])
    if not isinstance(chunks, list):
        return errors + ["payload.chunks must be a list."]

    if chunks:
        errors.extend(_validate_required_indexes(payload, manifest))

    verified_areas = {
        normalise_judgement_area(item)
        for item in _as_list(payload.get("verified_judgement_areas"))
    }
    verified_areas.discard("")
    verified_references = {
        _text(item) for item in _as_list(payload.get("verified_official_references"))
    }
    quote_allowed_present = False
    for index, chunk in enumerate(chunks):
        chunk_errors = validate_sccif_children_homes_chunk(
            chunk,
            verified_judgement_areas=verified_areas,
            verified_official_references=verified_references,
        )
        errors.extend(f"Chunk {index}: {error}" for error in chunk_errors)
        quote_allowed_present = quote_allowed_present or (
            isinstance(chunk, dict) and chunk.get("quote_allowed") is True
        )

    if quote_allowed_present:
        errors.extend(_validate_human_review(payload.get("human_review")))
    if payload.get("runtime_answer_wiring_changed") is True:
        errors.append("Runtime ORB answer wiring must not change in SCCIF children's homes prep.")
    if payload.get("frontend_behaviour_changed") is True:
        errors.append("Frontend behaviour must not change in SCCIF children's homes prep.")
    return errors


def _validate_required_indexes(payload: dict[str, Any], manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if manifest.get("judgement_area_index_required") is True:
        judgement_index = payload.get("judgement_area_index")
        if not isinstance(judgement_index, dict) or not judgement_index:
            errors.append("judgement_area_index must be populated when indexing is required.")
    if manifest.get("evaluation_area_index_required") is True:
        evaluation_index = payload.get("evaluation_area_index")
        if not isinstance(evaluation_index, dict) or not evaluation_index:
            errors.append("evaluation_area_index must be populated when indexing is required.")
    if manifest.get("inspection_evidence_theme_index_required") is True:
        theme_index = payload.get("inspection_evidence_theme_index")
        if not isinstance(theme_index, dict) or not theme_index:
            errors.append(
                "inspection_evidence_theme_index must be populated when indexing is required."
            )
    return errors


def normalise_judgement_area(value: Any) -> str:
    text = _text(value).lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "overall_experiences_and_progress": "overall_experiences_progress",
        "help_and_protection": "helped_and_protected",
        "how_well_children_are_helped_and_protected": "helped_and_protected",
        "effectiveness_of_leaders_and_managers": "leadership_management",
    }
    return aliases.get(text, text)


def _validate_manifest_boundaries(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    blocked = " ".join(_text(item) for item in _as_list(manifest.get("not_to_be_used_for"))).lower()
    required_fragments = {
        "predict": "source.not_to_be_used_for must block Ofsted grade or judgement prediction.",
        "inspection readiness": "source.not_to_be_used_for must block inspection readiness decisions.",
        "outcome": "source.not_to_be_used_for must block inspection outcome guarantees.",
        "compliance": "source.not_to_be_used_for must block statutory compliance decisions or guarantees.",
        "ofsted": "source.not_to_be_used_for must block replacing Ofsted judgement.",
        "judgement": "source.not_to_be_used_for must preserve registered manager/provider judgement.",
    }
    for fragment, message in required_fragments.items():
        if fragment not in blocked:
            errors.append(message)
    judgement_boundary = _text(manifest.get("professional_judgement_boundary"))
    if not _preserves_professional_responsibility(judgement_boundary):
        errors.append("source.professional_judgement_boundary must preserve professional judgement.")
    return errors


def _validate_sccif_citation_label(
    chunk: dict[str, Any],
    *,
    has_verified_official_reference: bool,
    has_verified_judgement_area: bool,
) -> list[str]:
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

    official_label_present = bool(
        OFFICIAL_SCCIF_LABEL_RE.search(label)
        or OFFICIAL_SCCIF_JUDGEMENT_LABEL_RE.search(label)
        or OFFICIAL_SCCIF_EVALUATION_LABEL_RE.search(label)
    )
    if official_label_present and not (has_verified_official_reference or has_verified_judgement_area):
        errors.append(
            "Official SCCIF citation labels require a verified official_reference or judgement_area."
        )
    if generated_label and official_label_present:
        errors.append("Generated citation labels must not look like official SCCIF labels.")
    if generated_label and not clear_internal_label:
        errors.append("Generated/internal splits must use a clear internal chunk label.")
    if chunk.get("quote_allowed") is True and not (
        has_verified_official_reference or has_verified_judgement_area or clear_internal_label
    ):
        errors.append("Quote-allowed internal chunks require a clear internal chunk label.")
    return errors


def _validate_chunk_quote_safety(chunk: dict[str, Any], content_kind: str) -> list[str]:
    errors: list[str] = []
    if chunk.get("quote_allowed") is not True:
        return errors

    if content_kind not in QUOTEABLE_CONTENT_KINDS:
        errors.append("Only exact SCCIF framework text may be quote-allowed.")
    if chunk.get("source_text_exact") is not True:
        errors.append("Exact citations require exact SCCIF source text.")
    if _text(chunk.get("quote_basis")) not in ALLOWED_QUOTE_BASIS - {"none_until_human_review"}:
        errors.append("chunk.quote_basis must be exact SCCIF framework text after human review.")
    if "metadata" in _text(chunk.get("quote_basis")).lower():
        errors.append("Metadata cannot be cited as exact SCCIF source text.")

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
            "grade_prediction_boundary",
            "compliance_guarantee_boundary",
        )
    )
    for pattern, message in UNSAFE_BOUNDARY_CLAIMS:
        if _has_unnegated_match(pattern, text_to_check):
            errors.append(message)
    if _has_unnegated_match(COMPLIANCE_GUARANTEE_CLAIM_RE, text_to_check):
        errors.append("SCCIF chunks must not claim compliance is guaranteed.")

    blocked = " ".join(_text(item) for item in _as_list(chunk.get("not_to_be_used_for"))).lower()
    if "predict" not in blocked and "grade" not in blocked:
        errors.append("chunk.not_to_be_used_for must block Ofsted grade prediction.")
    if "inspection readiness" not in blocked:
        errors.append("chunk.not_to_be_used_for must block inspection readiness decisions.")
    if "outcome" not in blocked and "guarantee" not in blocked:
        errors.append("chunk.not_to_be_used_for must block inspection outcome guarantees.")
    if "compliance" not in blocked:
        errors.append("chunk.not_to_be_used_for must block compliance guarantees or decisions.")
    if not _preserves_professional_responsibility(chunk.get("professional_judgement_boundary")):
        errors.append("chunk.professional_judgement_boundary must preserve professional judgement.")
    grade_boundary = _text(chunk.get("grade_prediction_boundary")).lower()
    if "does not predict" not in grade_boundary and "not predict" not in grade_boundary:
        errors.append("chunk.grade_prediction_boundary must state that ORB does not predict Ofsted judgements.")
    compliance_boundary = _text(chunk.get("compliance_guarantee_boundary")).lower()
    if "does not guarantee" not in compliance_boundary and "not guarantee" not in compliance_boundary:
        errors.append("chunk.compliance_guarantee_boundary must state that ORB does not guarantee outcomes.")
    return errors


def _validate_human_review(human_review: Any) -> list[str]:
    if not isinstance(human_review, dict):
        return [
            "human_review must be recorded before quote-allowed SCCIF children's homes chunks are accepted."
        ]
    errors: list[str] = []
    if human_review.get("status") != "approved":
        errors.append(
            "Human review must be approved before exact SCCIF children's homes citations are allowed."
        )
    if not _text(human_review.get("reviewer")):
        errors.append(
            "human_review.reviewer must be recorded for exact SCCIF children's homes citations."
        )
    if not _text(human_review.get("reviewed_at")):
        errors.append(
            "human_review.reviewed_at must be recorded for exact SCCIF children's homes citations."
        )
    for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS:
        if human_review.get(field) is not True:
            errors.append(f"human_review.{field} must be true before exact SCCIF children's homes citations.")
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
                "does not ",
                "do not ",
                "must not ",
            )
        ):
            continue
        return True
    return False


def _preserves_professional_responsibility(value: Any) -> bool:
    text = _text(value).lower()
    return "judgement" in text or "responsible for decision" in text


def validate_file(path: Path) -> list[str]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"SCCIF children's homes prep payload could not be loaded: {exc}"]
    return validate_sccif_children_homes_payload(payload)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate an offline SCCIF children's homes ingestion-prep payload."
    )
    parser.add_argument("payload", nargs="?", type=Path)
    parser.add_argument("--print-manifest-template", action="store_true")
    parser.add_argument("--print-manifest-schema", action="store_true")
    parser.add_argument("--print-chunk-schema", action="store_true")
    args = parser.parse_args()

    if args.print_manifest_template:
        print(json.dumps(sccif_children_homes_manifest_template(), indent=2, sort_keys=True))
        return 0
    if args.print_manifest_schema:
        print(json.dumps(sccif_children_homes_manifest_schema(), indent=2, sort_keys=True))
        return 0
    if args.print_chunk_schema:
        print(json.dumps(sccif_children_homes_chunk_schema(), indent=2, sort_keys=True))
        return 0
    if not args.payload:
        parser.error("payload is required unless a print option is used")

    errors = validate_file(args.payload)
    if errors:
        print("SCCIF children's homes validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("SCCIF children's homes ingestion-prep validation passed.")
    print("Validated manifest/prep payload only; no SCCIF source text ingestion asserted.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
