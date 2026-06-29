#!/usr/bin/env python3
"""Verify ORB Residential named source sign-off artefacts.

Validates governed sign-off schema, template markers, and completed sign-off
records against current verified source/chunk checksums. Template files are
not valid completed sign-off and must not enable live wiring.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.verify_orb_guide_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_SHA256,
    EXPECTED_SOURCE_TITLE as EXPECTED_GUIDE_SOURCE_TITLE,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_SHA256,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_REGULATIONS_SOURCE_SHA256,
    EXPECTED_SOURCE_TITLE as EXPECTED_REGULATIONS_SOURCE_TITLE,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_regulations_2015_manifest import (  # noqa: E402
    REGULATIONS_2015_SOURCE_ID,
)
from scripts.verify_orb_sccif_children_homes_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_SHA256,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_SCCIF_SOURCE_SHA256,
    EXPECTED_SOURCE_TITLE as EXPECTED_SCCIF_SOURCE_TITLE,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from scripts.verify_orb_sccif_children_homes_manifest import (  # noqa: E402
    SCCIF_CHILDREN_HOMES_SOURCE_ID,
)
from services.orb_residential_guide_ingestion_service import GUIDE_SOURCE_ID  # noqa: E402

SCHEMA_VERSION = "orb-residential-named-source-signoff-v1"
SCHEMA_PATH = ROOT / "schemas" / "orb_residential_named_source_signoff.schema.json"
GOVERNANCE_DIR = ROOT / "data" / "orb_residential_governance"
SIGNOFF_ARTEFACT_PATH = GOVERNANCE_DIR / "named_source_signoffs.json"
SIGNOFF_TEMPLATE_PATH = GOVERNANCE_DIR / "named_source_signoffs.template.json"

SOURCE_ID_TO_TYPE: dict[str, str] = {
    GUIDE_SOURCE_ID: "guide",
    REGULATIONS_2015_SOURCE_ID: "regulations_2015",
    SCCIF_CHILDREN_HOMES_SOURCE_ID: "sccif",
}

SOURCE_TYPE_TO_ID: dict[str, str] = {value: key for key, value in SOURCE_ID_TO_TYPE.items()}

SOURCE_TYPE_TO_TITLE: dict[str, str] = {
    "guide": EXPECTED_GUIDE_SOURCE_TITLE,
    "regulations_2015": EXPECTED_REGULATIONS_SOURCE_TITLE,
    "sccif": EXPECTED_SCCIF_SOURCE_TITLE,
}

SOURCE_CHECKSUM_EXPECTATIONS: dict[str, dict[str, str]] = {
    "guide": {
        "chunk_checksum": EXPECTED_GUIDE_CHUNK_SHA256,
    },
    "regulations_2015": {
        "source_checksum": EXPECTED_REGULATIONS_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_REGULATIONS_CHUNK_SHA256,
    },
    "sccif": {
        "source_checksum": EXPECTED_SCCIF_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_SCCIF_CHUNK_SHA256,
    },
}

REQUIRED_TEXT_FIELDS: tuple[str, ...] = (
    "source_id",
    "source_title",
    "reviewer_name",
    "reviewer_role",
    "reviewer_organisation",
    "review_date",
    "review_scope",
    "signature_attestation",
    "created_at",
)

BASE_BOOLEAN_FIELDS: tuple[str, ...] = (
    "source_checksum_verified",
    "chunk_checksum_verified",
    "source_role_approved",
    "citation_policy_approved",
    "routing_policy_approved",
    "unsafe_output_blockers_approved",
    "boundary_statements_approved",
    "local_policy_limitation_acknowledged",
    "professional_judgement_boundary_acknowledged",
    "no_legal_advice_acknowledged",
    "no_compliance_guarantee_acknowledged",
    "synthetic_review_rejected_as_sufficient",
    "nr_1_controls_confirmed",
    "public_promise_remains_blocked",
    "signed_by_named_human",
)

SCCIF_BOOLEAN_FIELDS: tuple[str, ...] = (
    "no_ofsted_grade_prediction_acknowledged",
    "no_inspection_readiness_decision_acknowledged",
    "no_inspection_outcome_guarantee_acknowledged",
)

PLACEHOLDER_REVIEWER_NAMES: frozenset[str] = frozenset(
    {
        "tbc",
        "tbc — named reviewer required",
        "reviewer",
        "test user",
        "example reviewer",
        "named reviewer",
        "placeholder",
        "template reviewer",
    }
)

SYNTHETIC_REVIEWER_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bsynthetic\b", re.I),
    re.compile(r"\bautomated\b", re.I),
    re.compile(r"\bauto[\s-]?reviewer\b", re.I),
    re.compile(r"\bai reviewer\b", re.I),
    re.compile(r"\bllm\b", re.I),
    re.compile(r"\bbot\b", re.I),
    re.compile(r"\bagent reviewer\b", re.I),
)

TEMPLATE_MARKERS: tuple[str, ...] = (
    "template only",
    "template_only",
    "tbc",
    "not a valid signature attestation",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _current_chunk_checksum(source_type: str) -> str:
    if source_type == "guide":
        return calculate_guide_checksum(load_guide_payload(GUIDE_CHUNKS_PATH))
    if source_type == "regulations_2015":
        return calculate_regulations_checksum(load_regulations_payload(REGULATIONS_CHUNKS_PATH))
    return calculate_sccif_checksum(load_sccif_payload(SCCIF_CHUNKS_PATH))


def required_boolean_fields(source_type: str) -> tuple[str, ...]:
    fields = list(BASE_BOOLEAN_FIELDS)
    if source_type == "sccif":
        fields.extend(SCCIF_BOOLEAN_FIELDS)
    return tuple(fields)


def is_template_payload(payload: dict[str, Any]) -> bool:
    if payload.get("template_only") is True:
        return True
    if payload.get("artefact_kind") == "template_only":
        return True
    if payload.get("not_valid_signoff") is True:
        return True
    if payload.get("must_not_be_used_as_completed_signoff") is True:
        return True
    provenance = payload.get("provenance")
    if isinstance(provenance, dict) and provenance.get("template_only") is True:
        return True
    return False


def is_template_record(record: dict[str, Any]) -> bool:
    provenance = record.get("provenance")
    if isinstance(provenance, dict) and provenance.get("template_only") is True:
        return True
    if record.get("signed_by_named_human") is not True:
        return True
    for marker in TEMPLATE_MARKERS:
        combined = " ".join(
            _text(record.get(field))
            for field in (
                "reviewer_name",
                "signature_attestation",
                "created_at",
                "review_date",
            )
        ).lower()
        if marker in combined:
            return True
    return False


def _reviewer_name_errors(name: str) -> list[str]:
    errors: list[str] = []
    normalised = _text(name)
    if not normalised:
        errors.append("missing reviewer_name")
        return errors
    lowered = normalised.lower()
    if lowered in PLACEHOLDER_REVIEWER_NAMES:
        errors.append(f"placeholder reviewer name rejected: {normalised}")
    for pattern in SYNTHETIC_REVIEWER_PATTERNS:
        if pattern.search(normalised):
            errors.append(f"synthetic reviewer name rejected: {normalised}")
            break
    return errors


def validate_signoff_record(source_type: str, record: dict[str, Any]) -> list[str]:
    """Validate one sign-off record for a known source type."""

    errors: list[str] = []

    if is_template_record(record):
        errors.append("template sign-off record cannot be treated as completed sign-off")

    record_source_type = _text(record.get("source_type"))
    if record_source_type and record_source_type != source_type:
        errors.append(f"signoff source_type mismatch: expected {source_type}")

    source_id = _text(record.get("source_id"))
    expected_source_id = SOURCE_TYPE_TO_ID.get(source_type)
    if not source_id:
        errors.append("missing source_id")
    elif source_id not in SOURCE_ID_TO_TYPE:
        errors.append(f"unknown source_id: {source_id}")
    elif expected_source_id and source_id != expected_source_id:
        errors.append(f"source_id does not match source_type {source_type}")

    expected_title = SOURCE_TYPE_TO_TITLE.get(source_type, "")
    if not _text(record.get("source_title")):
        errors.append("missing source_title")
    elif expected_title and _text(record.get("source_title")) != expected_title:
        errors.append("source_title does not match verified source title")

    for field in REQUIRED_TEXT_FIELDS:
        if field in {"source_id", "source_title"}:
            continue
        if not _text(record.get(field)):
            errors.append(f"missing {field}")

    errors.extend(_reviewer_name_errors(_text(record.get("reviewer_name"))))

    for field in required_boolean_fields(source_type):
        if record.get(field) is not True:
            errors.append(f"missing or false confirmation: {field}")

    if record.get("synthetic_review_rejected_as_sufficient") is not True:
        errors.append("synthetic review must be explicitly rejected as sufficient")

    if record.get("public_promise_remains_blocked") is not True:
        errors.append("public promise must remain blocked unless separately approved")

    if record.get("signed_by_named_human") is not True:
        errors.append("record must be signed_by_named_human")

    expectations = SOURCE_CHECKSUM_EXPECTATIONS[source_type]
    if record.get("chunk_checksum_verified") is True:
        current = _current_chunk_checksum(source_type)
        if current != expectations["chunk_checksum"]:
            errors.append("chunk checksum no longer matches verified artefact")
        declared = _text(record.get("declared_chunk_checksum"))
        if declared and declared != expectations["chunk_checksum"]:
            errors.append("declared_chunk_checksum does not match expected chunk checksum")

    if record.get("source_checksum_verified") is True and "source_checksum" in expectations:
        declared_source = _text(record.get("declared_source_checksum"))
        if declared_source and declared_source != expectations["source_checksum"]:
            errors.append("declared_source_checksum does not match expected source checksum")

    provenance = record.get("provenance")
    if not isinstance(provenance, dict) or not provenance:
        errors.append("missing provenance object")

    return errors


def validate_signoff_artefact(payload: dict[str, Any], *, allow_template: bool = False) -> list[str]:
    errors: list[str] = []

    if _text(payload.get("schema_version")) != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")

    template = is_template_payload(payload)
    if template and not allow_template:
        errors.append("template artefact cannot be treated as completed sign-off")
        if payload.get("template_only") is not True:
            errors.append("template artefact must set template_only: true")
        if payload.get("not_valid_signoff") is not True:
            errors.append("template artefact must set not_valid_signoff: true")
        if payload.get("not_sufficient_for_live_wiring") is not True:
            errors.append("template artefact must set not_sufficient_for_live_wiring: true")
        if payload.get("not_evidence_of_named_review") is not True:
            errors.append("template artefact must set not_evidence_of_named_review: true")

    signoffs = payload.get("signoffs")
    if not isinstance(signoffs, dict):
        errors.append("signoffs must be an object")
        return errors

    seen_source_ids: set[str] = set()
    for key, record in signoffs.items():
        if not isinstance(record, dict):
            errors.append(f"signoff record for {key} must be an object")
            continue
        source_type = _text(record.get("source_type")) or _text(key)
        if source_type not in SOURCE_TYPE_TO_ID:
            errors.append(f"unknown signoff key/source_type: {key}")
            continue
        source_id = _text(record.get("source_id"))
        if source_id:
            if source_id in seen_source_ids:
                errors.append(f"duplicate source_id: {source_id}")
            seen_source_ids.add(source_id)
        errors.extend(
            f"{source_type}: {item}" for item in validate_signoff_record(source_type, record)
        )

    if not template and not allow_template:
        for source_type in SOURCE_TYPE_TO_ID:
            if source_type not in signoffs:
                errors.append(f"missing signoff record for {source_type}")

    return errors


def validate_template_structure(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if _text(payload.get("schema_version")) != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    if payload.get("artefact_kind") != "template_only":
        errors.append("template artefact_kind must be template_only")
    if payload.get("template_only") is not True:
        errors.append("template must set template_only: true")
    if payload.get("not_valid_signoff") is not True:
        errors.append("template must set not_valid_signoff: true")
    if payload.get("not_sufficient_for_live_wiring") is not True:
        errors.append("template must set not_sufficient_for_live_wiring: true")
    if payload.get("not_evidence_of_named_review") is not True:
        errors.append("template must set not_evidence_of_named_review: true")
    if payload.get("must_not_be_used_as_completed_signoff") is not True:
        errors.append("template must set must_not_be_used_as_completed_signoff: true")
    signoffs = payload.get("signoffs")
    if not isinstance(signoffs, dict):
        errors.append("template signoffs must be an object")
        return errors
    for source_type in SOURCE_TYPE_TO_ID:
        if source_type not in signoffs:
            errors.append(f"template missing signoff scaffold for {source_type}")
    return errors


def validate_template_file(path: Path = SIGNOFF_TEMPLATE_PATH) -> list[str]:
    if not path.is_file():
        return [f"template file missing: {path}"]
    payload = json.loads(path.read_text(encoding="utf-8"))
    return validate_template_structure(payload)


def validate_committed_artefact(path: Path = SIGNOFF_ARTEFACT_PATH) -> list[str]:
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    return validate_signoff_artefact(payload, allow_template=False)


def verify_template_only() -> list[str]:
    return validate_template_file()


def verify_committed_if_present() -> list[str]:
    if not SIGNOFF_ARTEFACT_PATH.is_file():
        return []
    return validate_committed_artefact()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--verify-template",
        action="store_true",
        help="Validate the governed template file only.",
    )
    parser.add_argument(
        "--verify-committed",
        action="store_true",
        help="Validate committed named_source_signoffs.json if present.",
    )
    parser.add_argument(
        "--print-schema-path",
        action="store_true",
        help="Print schema path and exit.",
    )
    args = parser.parse_args()

    if args.print_schema_path:
        print(SCHEMA_PATH)
        return 0

    errors: list[str] = []
    if not SCHEMA_PATH.is_file():
        errors.append(f"schema file missing: {SCHEMA_PATH}")

    if args.verify_committed:
        errors.extend(verify_committed_if_present())
    elif args.verify_template or not args.verify_committed:
        errors.extend(verify_template_only())

    if errors:
        print("Named source sign-off verification failed.", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    if SIGNOFF_ARTEFACT_PATH.is_file():
        print("Committed sign-off artefact present and validated.")
    else:
        print("No committed sign-off artefact present (expected for Phase 2i).")
    print("Template verification passed.")
    print(f"Schema: {SCHEMA_PATH}")
    print(f"Template: {SIGNOFF_TEMPLATE_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
