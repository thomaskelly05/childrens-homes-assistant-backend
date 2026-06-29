#!/usr/bin/env python3
"""Verify the committed ORB Residential SCCIF children's homes chunk artefact.

Offline only. Validates source artefact checksum, chunk checksum, indexing,
citation safety, human review, boundaries, and that Guide/Regulations/runtime
wiring remain unchanged.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.verify_orb_guide_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (  # noqa: E402
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_manifest import (  # noqa: E402
    SCCIF_CHILDREN_HOMES_SOURCE_ID,
    validate_sccif_children_homes_chunk,
    validate_sccif_children_homes_manifest,
    validate_sccif_children_homes_payload,
)
from services.orb_residential_sccif_ingestion_service import (  # noqa: E402
    MAX_SCCIF_CHUNKS_PER_RETRIEVAL,
    SCCIF_CHUNKS_PATH,
    SCCIF_SOURCE_PATH,
)

SCHEMA_VERSION = "orb-sccif-children-homes-ingestion-v1"
EXPECTED_SOURCE_TITLE = "Social care common inspection framework (SCCIF): children's homes"
EXPECTED_OFFICIAL_URL = (
    "https://www.gov.uk/government/publications/"
    "social-care-common-inspection-framework-sccif-childrens-homes/"
    "social-care-common-inspection-framework-sccif-childrens-homes"
)
EXPECTED_PUBLISHER = "Ofsted"
EXPECTED_VERSION = "SCCIF children's homes as published on GOV.UK (verified 2026-06-29)"
EXPECTED_SOURCE_FILE_SHA256 = "ae8f14adc73641033f7334891882d63a15ceefacf4a0222de43792470e31f313"
EXPECTED_CHUNK_JSON_SHA256 = "3fa492dd96361db84a30f1e2eba222be7615e41a74b07bc0a9f04841158a57cd"
EXPECTED_CHUNK_COUNT = 951
MAX_CHUNK_TEXT_CHARS_EXCLUSIVE = 1300

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "source",
    "verified_judgement_areas",
    "verified_official_references",
    "judgement_area_index",
    "evaluation_area_index",
    "inspection_evidence_theme_index",
    "retrieval_policy",
    "chunks",
    "human_review",
    "excluded_sources",
    "provenance",
    "runtime_answer_wiring_changed",
    "frontend_behaviour_changed",
}
REQUIRED_RETRIEVAL_POLICY = {
    "never_send_full_sccif_to_llm": True,
    "maximum_exact_chunks": 3,
    "deterministic_selection_before_llm": True,
    "runtime_scraping_or_downloading": False,
    "runtime_answer_wiring_enabled": False,
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def load_payload(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError("SCCIF chunk artefact must contain a JSON object.")
    return payload


def canonical_payload_for_checksum(payload: dict[str, Any]) -> dict[str, Any]:
    canonical = copy.deepcopy(payload)
    provenance = canonical.get("provenance")
    if isinstance(provenance, dict):
        provenance.pop("chunk_json_sha256", None)
        provenance.pop("generated_at", None)
    return canonical


def calculate_checksum(payload: dict[str, Any]) -> str:
    encoded = json.dumps(
        canonical_payload_for_checksum(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def collect_errors(payload: dict[str, Any], *, source_path: Path = SCCIF_SOURCE_PATH) -> list[str]:
    errors: list[str] = []
    errors.extend(_validate_top_level(payload))
    errors.extend(_validate_source(payload))
    errors.extend(_validate_source_artefact(payload, source_path=source_path))
    errors.extend(_validate_checksum(payload))
    errors.extend(_validate_retrieval_policy(payload))
    errors.extend(_validate_excluded_sources(payload))
    errors.extend(_validate_runtime_flags(payload))
    errors.extend(_validate_indexes(payload))
    errors.extend(validate_sccif_children_homes_payload(payload))
    chunks = payload.get("chunks")
    if not isinstance(chunks, list):
        return errors + ["chunks must be a list."]
    verified_areas = {str(item) for item in (payload.get("verified_judgement_areas") or [])}
    verified_references = {str(item) for item in (payload.get("verified_official_references") or [])}
    errors.extend(_validate_chunk_inventory(chunks, verified_areas=verified_areas, verified_references=verified_references))
    errors.extend(_validate_guide_unchanged())
    errors.extend(_validate_regulations_unchanged())
    return errors


def verify_file(path: Path = SCCIF_CHUNKS_PATH) -> list[str]:
    if not path.is_file():
        return [f"SCCIF chunk artefact does not exist: {path}"]
    try:
        payload = load_payload(path)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return [f"SCCIF chunk artefact could not be loaded: {exc}"]
    return collect_errors(payload)


def _validate_top_level(payload: dict[str, Any]) -> list[str]:
    missing = REQUIRED_TOP_LEVEL_KEYS - set(payload)
    if missing:
        return [f"Missing top-level keys: {sorted(missing)}"]
    if payload.get("schema_version") != SCHEMA_VERSION:
        return [f"schema_version must be {SCHEMA_VERSION!r}."]
    return []


def _validate_source(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    source = payload.get("source")
    if not isinstance(source, dict):
        return ["source must be an object."]
    errors.extend(validate_sccif_children_homes_manifest(source))
    expected_values = {
        "source_id": SCCIF_CHILDREN_HOMES_SOURCE_ID,
        "source_title": EXPECTED_SOURCE_TITLE,
        "official_url": EXPECTED_OFFICIAL_URL,
        "publisher": EXPECTED_PUBLISHER,
        "version": EXPECTED_VERSION,
        "source_file_checksum": EXPECTED_SOURCE_FILE_SHA256,
        "source_file_path": "data/orb_residential_ingestion/ofsted_sccif_childrens_homes_source.txt",
    }
    for field, expected in expected_values.items():
        if source.get(field) != expected:
            errors.append(f"source.{field} must be {expected!r}.")
    if not _text(source.get("last_verified_date")):
        errors.append("source.last_verified_date must be present.")
    return errors


def _validate_source_artefact(payload: dict[str, Any], *, source_path: Path) -> list[str]:
    errors: list[str] = []
    if not source_path.is_file():
        return [f"SCCIF source artefact does not exist: {source_path}"]
    actual = _sha256_file(source_path)
    documented = _text(payload.get("source", {}).get("source_file_checksum"))
    if actual != EXPECTED_SOURCE_FILE_SHA256:
        errors.append(
            f"Source artefact checksum mismatch: {actual} (expected {EXPECTED_SOURCE_FILE_SHA256})."
        )
    if documented != EXPECTED_SOURCE_FILE_SHA256:
        errors.append("Documented source checksum does not match the expected Phase 2d checksum.")
    return errors


def _validate_checksum(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    provenance = payload.get("provenance")
    if not isinstance(provenance, dict):
        return ["provenance must be an object."]
    documented = provenance.get("chunk_json_sha256")
    if documented != EXPECTED_CHUNK_JSON_SHA256:
        errors.append("Documented chunk checksum does not match the expected Phase 2d checksum.")
    actual = calculate_checksum(payload)
    if actual != EXPECTED_CHUNK_JSON_SHA256:
        errors.append(
            f"Calculated chunk checksum changed: {actual} (expected {EXPECTED_CHUNK_JSON_SHA256})."
        )
    return errors


def _validate_retrieval_policy(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    policy = payload.get("retrieval_policy")
    if not isinstance(policy, dict):
        return ["retrieval_policy must be an object."]
    for field, expected in REQUIRED_RETRIEVAL_POLICY.items():
        if policy.get(field) != expected:
            errors.append(f"retrieval_policy.{field} must be {expected!r}.")
    if int(policy.get("maximum_exact_chunks", 0)) > MAX_SCCIF_CHUNKS_PER_RETRIEVAL:
        errors.append("retrieval_policy.maximum_exact_chunks exceeds the approved cap.")
    return errors


def _validate_excluded_sources(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    excluded = payload.get("excluded_sources")
    if not isinstance(excluded, dict):
        return ["excluded_sources must be an object."]
    if excluded.get("ofsted_sccif_childrens_homes_full_text_ingested") is not True:
        errors.append("SCCIF full-text ingestion flag must be true after Phase 2d.")
    if excluded.get("guide_commentary_treated_as_sccif_text") is not False:
        errors.append("Guide commentary must not be treated as SCCIF source text.")
    if excluded.get("regulations_commentary_treated_as_sccif_text") is not False:
        errors.append("Regulations commentary must not be treated as SCCIF source text.")
    return errors


def _validate_runtime_flags(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if payload.get("runtime_answer_wiring_changed") is not False:
        errors.append("runtime_answer_wiring_changed must remain false.")
    if payload.get("frontend_behaviour_changed") is not False:
        errors.append("frontend_behaviour_changed must remain false.")
    return errors


def _validate_indexes(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    judgement_index = payload.get("judgement_area_index")
    if not isinstance(judgement_index, dict) or not judgement_index:
        errors.append("judgement_area_index must be populated.")
    evaluation_index = payload.get("evaluation_area_index")
    if not isinstance(evaluation_index, dict) or not evaluation_index:
        errors.append("evaluation_area_index must be populated.")
    theme_index = payload.get("inspection_evidence_theme_index")
    if not isinstance(theme_index, dict) or not theme_index:
        errors.append("inspection_evidence_theme_index must be populated.")
    verified = set(payload.get("verified_judgement_areas") or [])
    if verified != set(judgement_index or {}):
        errors.append("verified_judgement_areas must match judgement_area_index keys.")
    return errors


def _validate_chunk_inventory(
    chunks: list[Any],
    *,
    verified_areas: set[str],
    verified_references: set[str],
) -> list[str]:
    errors: list[str] = []
    if len(chunks) != EXPECTED_CHUNK_COUNT:
        errors.append(f"Chunk count must be {EXPECTED_CHUNK_COUNT}, found {len(chunks)}.")
    for index, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            errors.append(f"Chunk {index} must be an object.")
            continue
        text = _text(chunk.get("text"))
        if len(text) >= MAX_CHUNK_TEXT_CHARS_EXCLUSIVE:
            errors.append(
                f"Chunk {index} text length {len(text)} exceeds accepted limit "
                f"(< {MAX_CHUNK_TEXT_CHARS_EXCLUSIVE})."
            )
        if chunk.get("quote_allowed") is True and not text:
            errors.append(f"Chunk {index} is quote-allowed but has no exact source text.")
        chunk_errors = validate_sccif_children_homes_chunk(
            chunk,
            verified_judgement_areas=verified_areas,
            verified_official_references=verified_references,
        )
        errors.extend(f"Chunk {index}: {error}" for error in chunk_errors)
    return errors


def _validate_guide_unchanged() -> list[str]:
    errors: list[str] = []
    if not GUIDE_CHUNKS_PATH.is_file():
        return ["Guide chunk artefact is missing."]
    guide_payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    if len(guide_payload.get("chunks") or []) != 371:
        errors.append("Guide chunk count changed.")
    if calculate_guide_checksum(guide_payload) != EXPECTED_GUIDE_CHUNK_JSON_SHA256:
        errors.append("Guide chunk checksum changed.")
    return errors


def _validate_regulations_unchanged() -> list[str]:
    errors: list[str] = []
    if not REGULATIONS_CHUNKS_PATH.is_file():
        return ["Regulations chunk artefact is missing."]
    regulations_payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    if len(regulations_payload.get("chunks") or []) != 100:
        errors.append("Regulations chunk count changed.")
    if calculate_regulations_checksum(regulations_payload) != EXPECTED_REGULATIONS_CHUNK_JSON_SHA256:
        errors.append("Regulations chunk checksum changed.")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify SCCIF children's homes governed chunks.")
    parser.add_argument(
        "path",
        nargs="?",
        type=Path,
        default=SCCIF_CHUNKS_PATH,
        help="Path to ofsted_sccif_childrens_homes_chunks.json.",
    )
    args = parser.parse_args()

    errors = verify_file(args.path)
    if errors:
        print("SCCIF children's homes chunk verification failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    payload = load_payload(args.path)
    print("SCCIF children's homes chunk verification passed.")
    print(f"Path: {args.path}")
    print(f"Chunks: {len(payload['chunks'])}")
    print(f"Source checksum: {EXPECTED_SOURCE_FILE_SHA256}")
    print(f"Chunk checksum: {calculate_checksum(payload)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
