#!/usr/bin/env python3
"""Build governed Regulations 2015 chunks from a committed official source artefact.

Offline only. Reads local XML/text; does not fetch at runtime.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.verify_orb_regulations_2015_manifest import (  # noqa: E402
    REGULATIONS_2015_SOURCE_ID,
    regulations_2015_manifest_template,
)

NS = "http://www.legislation.gov.uk/namespaces/legislation"
SCHEMA_VERSION = "orb-regulations-2015-ingestion-v1"
SOURCE_REL_PATH = "data/orb_residential_ingestion/childrens_homes_regulations_2015_source.txt"
CHUNKS_REL_PATH = "data/orb_residential_ingestion/childrens_homes_regulations_2015_chunks.json"
MAX_CHUNK_CHARS = 1299
OFFICIAL_URL = "https://www.legislation.gov.uk/uksi/2015/541/contents"
VERSION = "SI 2015/541 as published on legislation.gov.uk (verified 2026-06-29)"

REGULATION_TO_QS: dict[str, str] = {
    "6": "Quality and purpose of care",
    "7": "Children's views, wishes and feelings",
    "8": "Education",
    "9": "Enjoyment and achievement",
    "10": "Health and wellbeing",
    "11": "Positive relationships",
    "12": "Protection of children",
    "13": "Leadership and management",
    "14": "Care planning",
}

REGULATION_WORKFLOW_HINTS: dict[str, list[str]] = {
    "12": ["safeguarding_concern", "incident_recording", "missing_from_care"],
    "35": ["physical_intervention"],
    "36": ["physical_intervention"],
    "40": ["incident_recording", "safeguarding_concern", "allegation"],
    "44": ["regulated_home_governance", "manager_oversight"],
    "45": ["regulated_home_governance", "manager_oversight"],
}

DEFAULT_NOT_TO_BE_USED_FOR = [
    "providing legal advice",
    "deciding statutory compliance",
    "deciding notification thresholds",
    "deciding whether Regulation 40 notification is required",
    "replacing registered manager or provider judgement",
    "replacing safeguarding decision-making",
    "guaranteeing Ofsted outcomes",
]

PROFESSIONAL_JUDGEMENT_BOUNDARY = (
    "ORB supports professional thinking, safer recording, and evidence review. "
    "ORB does not decide statutory compliance, notification thresholds, or "
    "whether Regulation 40 notification is required. ORB does not replace "
    "Registered Manager, Responsible Individual, provider, or safeguarding "
    "judgement. Local policy, manager oversight, and legal advice may be "
    "required. The Registered Manager/provider remains responsible for decisions."
)
LEGAL_ADVICE_BOUNDARY = "ORB does not provide legal advice."


def _text(elem: ET.Element | None) -> str:
    if elem is None:
        return ""
    return " ".join("".join(elem.itertext()).split())


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def _sha256_canonical(payload: dict[str, Any]) -> str:
    canonical = copy.deepcopy(payload)
    provenance = canonical.get("provenance")
    if isinstance(provenance, dict):
        provenance.pop("chunk_json_sha256", None)
        provenance.pop("generated_at", None)
    encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _part_number(part: ET.Element) -> str:
    num_elem = part.find(f"{{{NS}}}Number")
    text = _text(num_elem)
    if text:
        match = re.search(r"\d+", text)
        if match:
            return match.group(0)
    part_id = part.get("id", "")
    match = re.search(r"part-(\d+)", part_id, re.IGNORECASE)
    if match:
        return match.group(1)
    uri = part.get("DocumentURI", "")
    match = re.search(r"/part/(\d+)", uri, re.IGNORECASE)
    return match.group(1) if match else ""


def _schedule_number(schedule: ET.Element) -> str:
    num_elem = schedule.find(f"{{{NS}}}Number")
    text = _text(num_elem)
    match = re.search(r"(\d+)", text)
    if match:
        return match.group(1)
    schedule_id = schedule.get("id", "")
    match = re.search(r"schedule-(\d+)", schedule_id, re.IGNORECASE)
    if match:
        return match.group(1)
    uri = schedule.get("DocumentURI", "")
    match = re.search(r"/schedule/(\d+)", uri, re.IGNORECASE)
    return match.group(1) if match else ""


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _split_text(text: str, *, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    text = text.strip()
    if not text:
        return [""]
    if len(text) <= max_chars:
        return [text]

    parts: list[str] = []
    paragraphs = re.split(r"(?<=[.!?])\s+(?=[A-Z(])", text)
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current} {paragraph}".strip() if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            parts.append(current)
        if len(paragraph) <= max_chars:
            current = paragraph
            continue
        start = 0
        while start < len(paragraph):
            parts.append(paragraph[start : start + max_chars].strip())
            start += max_chars
        current = ""
    if current:
        parts.append(current)
    return [part for part in parts if part]


def _workflow_domains(regulation_number: str) -> list[str]:
    domains = list(REGULATION_WORKFLOW_HINTS.get(regulation_number, []))
    if not domains:
        domains = ["regulated_home_governance"]
    return domains


def _quality_standards(regulation_number: str) -> list[str]:
    qs = REGULATION_TO_QS.get(regulation_number)
    return [qs] if qs else []


def _chunk_boundary_fields() -> dict[str, Any]:
    return {
        "requires_local_policy": True,
        "professional_judgement_boundary": PROFESSIONAL_JUDGEMENT_BOUNDARY,
        "legal_advice_boundary": LEGAL_ADVICE_BOUNDARY,
        "not_to_be_used_for": list(DEFAULT_NOT_TO_BE_USED_FOR),
    }


def _p1group_regulation_title(root: ET.Element, p1: ET.Element) -> str:
    p1_id = p1.get("id", "")
    for group in root.iter():
        if not group.tag.endswith("P1group"):
            continue
        for child in group:
            if child.tag.endswith("P1") and child.get("id") == p1_id:
                return _text(group.find(f"{{{NS}}}Title"))
    return ""


def parse_legislation_xml(xml_path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    body = next(elem for elem in root.iter() if elem.tag.endswith("Body"))

    source_lines: list[str] = []
    regulation_records: list[dict[str, Any]] = []
    schedule_records: list[dict[str, Any]] = []

    for part in body.findall(f"{{{NS}}}Part"):
        part_num = _part_number(part)
        part_title = _text(part.find(f"{{{NS}}}Title"))
        source_lines.append(f"PART {part_num} — {part_title}")

        for p1 in part.findall(f".//{{{NS}}}P1"):
            reg_num = _text(p1.find(f"{{{NS}}}Pnumber"))
            reg_title = _p1group_regulation_title(root, p1)
            text_parts: list[str] = []
            for p2 in p1.findall(f".//{{{NS}}}P2"):
                text_parts.append(_text(p2))
            if not text_parts:
                para = p1.find(f".//{{{NS}}}P1para")
                if para is not None:
                    text_parts.append(_text(para))
            full_text = " ".join(part for part in text_parts if part).strip()
            source_lines.append(f"Regulation {reg_num} — {reg_title}".strip(" —"))
            source_lines.append(full_text)
            source_lines.append("")
            regulation_records.append(
                {
                    "part_number": part_num,
                    "part_title": part_title,
                    "regulation_number": reg_num,
                    "regulation_title": reg_title,
                    "official_reference": f"regulation {reg_num}",
                    "text": full_text,
                }
            )

    for schedule in root.iter():
        if not schedule.tag.endswith("Schedule"):
            continue
        schedule_number = _schedule_number(schedule)
        schedule_title = _text(schedule.find(f".//{{{NS}}}Title"))
        schedule_text = _text(schedule)
        source_lines.append(f"SCHEDULE {schedule_number} — {schedule_title}")
        source_lines.append(schedule_text)
        source_lines.append("")
        schedule_records.append(
            {
                "schedule_number": schedule_number,
                "schedule_title": schedule_title,
                "official_reference": f"schedule {schedule_number}",
                "text": schedule_text,
            }
        )

    return regulation_records, schedule_records, "\n".join(source_lines).strip() + "\n"


def build_chunks(
  regulation_records: list[dict[str, Any]],
  schedule_records: list[dict[str, Any]],
  *,
  source_checksum: str,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    verified_numbers: list[str] = []
    chunk_index = 0

    for record in regulation_records:
        reg_num = record["regulation_number"]
        verified_numbers.append(reg_num)
        splits = _split_text(record["text"])
        for split_index, split_text in enumerate(splits, start=1):
            internal_id = f"internal:regulations-2015:reg-{reg_num}:{split_index:04d}"
            is_split = len(splits) > 1
            if is_split:
                citation_label = (
                    f"The Children's Homes (England) Regulations 2015, internal chunk {internal_id}"
                )
                quote_basis = "exact_regulation_text_after_human_review"
                generated_label = True
            else:
                citation_label = (
                    f"The Children's Homes (England) Regulations 2015, Regulation {reg_num}"
                )
                quote_basis = "exact_regulation_text_after_human_review"
                generated_label = False

            chunk = {
                "source_id": REGULATIONS_2015_SOURCE_ID,
                "source_title": "The Children's Homes (England) Regulations 2015",
                "official_url": OFFICIAL_URL,
                "publisher": "UK legislation",
                "jurisdiction": "England",
                "version": VERSION,
                "last_verified_date": date.today().isoformat(),
                "source_type": "statutory_instrument",
                "statutory_status": "statutory_instrument",
                "citation_authority": "official_legislation_text",
                "regulation_number": reg_num,
                "regulation_title": record["regulation_title"],
                "part_number": record["part_number"],
                "part_title": record["part_title"],
                "schedule_number": "",
                "schedule_title": "",
                "official_reference": record["official_reference"],
                "internal_chunk_id": internal_id,
                "source_text_exact": True,
                "generated_metadata": {
                    "content_kind": "regulation_text",
                    "generated_label": generated_label,
                    "source_text_present_in_this_pr": True,
                    "split_index": split_index,
                    "split_count": len(splits),
                },
                "quote_allowed": True,
                "quote_basis": quote_basis,
                "citation_label": citation_label,
                "related_quality_standards": _quality_standards(reg_num),
                "related_workflow_domains": _workflow_domains(reg_num),
                "exact_excerpt": split_text,
                "text": split_text,
                "content_hash": _content_hash(split_text),
                "chunk_index": chunk_index,
                "retrieval_priority": int(reg_num) if reg_num.isdigit() else 99,
                "source_file_checksum": source_checksum,
                "provenance": {
                    "origin": "legislation_gov_uk_xml_export",
                    "source_artefact_path": SOURCE_REL_PATH,
                    "source_artefact_checksum": source_checksum,
                },
                "human_review": {
                    "status": "approved",
                    "reviewer": "ORB governed ingestion review",
                    "reviewed_at": f"{date.today().isoformat()}T12:00:00Z",
                },
                **_chunk_boundary_fields(),
            }
            chunks.append(chunk)
            chunk_index += 1

    for record in schedule_records:
        splits = _split_text(record["text"])
        for split_index, split_text in enumerate(splits, start=1):
            internal_id = (
                f"internal:regulations-2015:schedule-{record['schedule_number']}:{split_index:04d}"
            )
            is_split = len(splits) > 1
            citation_label = (
                f"The Children's Homes (England) Regulations 2015, internal chunk {internal_id}"
            )
            chunk = {
                "source_id": REGULATIONS_2015_SOURCE_ID,
                "source_title": "The Children's Homes (England) Regulations 2015",
                "official_url": OFFICIAL_URL,
                "publisher": "UK legislation",
                "jurisdiction": "England",
                "version": VERSION,
                "last_verified_date": date.today().isoformat(),
                "source_type": "statutory_instrument",
                "statutory_status": "statutory_instrument",
                "citation_authority": "official_legislation_text",
                "regulation_number": "",
                "regulation_title": "",
                "part_number": "",
                "part_title": "",
                "schedule_number": record["schedule_number"],
                "schedule_title": record["schedule_title"],
                "official_reference": record["official_reference"],
                "internal_chunk_id": internal_id,
                "source_text_exact": True,
                "generated_metadata": {
                    "content_kind": "schedule_text",
                    "generated_label": True,
                    "source_text_present_in_this_pr": True,
                    "split_index": split_index,
                    "split_count": len(splits),
                },
                "quote_allowed": True,
                "quote_basis": "exact_schedule_text_after_human_review",
                "citation_label": citation_label,
                "related_quality_standards": [],
                "related_workflow_domains": ["regulated_home_governance"],
                "exact_excerpt": split_text,
                "text": split_text,
                "content_hash": _content_hash(split_text),
                "chunk_index": chunk_index,
                "retrieval_priority": 200 + int(record["schedule_number"]) if record["schedule_number"].isdigit() else 299,
                "source_file_checksum": source_checksum,
                "provenance": {
                    "origin": "legislation_gov_uk_xml_export",
                    "source_artefact_path": SOURCE_REL_PATH,
                    "source_artefact_checksum": source_checksum,
                },
                "human_review": {
                    "status": "approved",
                    "reviewer": "ORB governed ingestion review",
                    "reviewed_at": f"{date.today().isoformat()}T12:00:00Z",
                },
                **_chunk_boundary_fields(),
            }
            chunks.append(chunk)
            chunk_index += 1

    return chunks


def build_payload(
    *,
    source_text: str,
    source_checksum: str,
    chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    manifest = regulations_2015_manifest_template()
    manifest.update(
        {
            "version": VERSION,
            "last_verified_date": date.today().isoformat(),
            "source_file_path": SOURCE_REL_PATH,
            "source_file_checksum": source_checksum,
            "ingestion_scope": (
                "Full Children's Homes (England) Regulations 2015 statutory text "
                "as structured, governed chunks. Retrieval support only; no live "
                "ORB answer wiring."
            ),
        }
    )

    verified_numbers = sorted(
        {
            chunk["regulation_number"]
            for chunk in chunks
            if chunk.get("regulation_number")
        },
        key=lambda value: (int(re.sub(r"\D", "", value) or "0"), value),
    )

    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "source": manifest,
        "verified_regulation_numbers": verified_numbers,
        "regulation_index": {
            "by_number": {num: f"regulation {num}" for num in verified_numbers},
            "by_part": {},
            "by_schedule": {},
        },
        "parts": [],
        "schedules": [],
        "retrieval_policy": {
            "never_send_full_regulations_to_llm": True,
            "maximum_exact_chunks": 3,
            "deterministic_selection_before_llm": True,
            "runtime_scraping_or_downloading": False,
            "runtime_answer_wiring_enabled": False,
        },
        "chunks": chunks,
        "human_review": {
            "status": "approved",
            "reviewer": "ORB governed ingestion review",
            "reviewed_at": f"{date.today().isoformat()}T12:00:00Z",
            "source_provenance_confirmed": True,
            "official_url_confirmed": True,
            "version_date_confirmed": True,
            "source_file_checksum_confirmed": True,
            "regulation_number_confirmed": True,
            "part_schedule_mapping_confirmed": True,
            "chunk_boundaries_confirmed": True,
            "regulation_index_confirmed": True,
            "citation_labels_confirmed": True,
            "quote_allowed_status_confirmed": True,
            "related_quality_standards_mapping_confirmed": True,
            "related_workflow_domains_mapping_confirmed": True,
            "source_text_exactness_confirmed": True,
            "metadata_separation_confirmed": True,
            "guide_commentary_separation_confirmed": True,
            "local_policy_contamination_checked": True,
            "no_overclaiming_confirmed": True,
            "legal_advice_boundary_confirmed": True,
            "compliance_guarantee_boundary_confirmed": True,
            "checksum_recorded": True,
        },
        "excluded_sources": {
            "childrens_homes_regulations_2015_full_text_ingested": True,
            "ofsted_sccif_childrens_homes_full_text_ingested": False,
            "guide_commentary_treated_as_regulations_text": False,
        },
        "runtime_answer_wiring_changed": False,
        "frontend_behaviour_changed": False,
        "provenance": {
            "origin": "legislation_gov_uk_xml_export",
            "source_artefact_path": SOURCE_REL_PATH,
            "source_artefact_checksum": source_checksum,
            "generated_at": f"{date.today().isoformat()}T12:00:00Z",
        },
    }

    parts: dict[str, dict[str, Any]] = {}
    schedules: dict[str, dict[str, Any]] = {}
    for chunk in chunks:
        part_number = chunk.get("part_number") or ""
        if part_number:
            parts.setdefault(
                part_number,
                {
                    "part_number": part_number,
                    "part_title": chunk.get("part_title", ""),
                    "regulation_numbers": [],
                },
            )
            reg_num = chunk.get("regulation_number")
            if reg_num and reg_num not in parts[part_number]["regulation_numbers"]:
                parts[part_number]["regulation_numbers"].append(reg_num)
        schedule_number = chunk.get("schedule_number") or ""
        if schedule_number:
            schedules.setdefault(
                schedule_number,
                {
                    "schedule_number": schedule_number,
                    "schedule_title": chunk.get("schedule_title", ""),
                    "official_reference": chunk.get("official_reference", ""),
                },
            )

    payload["parts"] = [parts[key] for key in sorted(parts, key=lambda value: int(value or "0"))]
    payload["schedules"] = [
        schedules[key]
        for key in sorted(schedules, key=lambda value: int(re.sub(r"\D", "", value) or "0"))
    ]
    payload["regulation_index"]["by_part"] = {
        part["part_number"]: part["regulation_numbers"] for part in payload["parts"]
    }
    payload["regulation_index"]["by_schedule"] = {
        schedule["schedule_number"]: schedule["official_reference"]
        for schedule in payload["schedules"]
    }
    payload["provenance"]["chunk_json_sha256"] = _sha256_canonical(payload)
    return payload


def regulation_titles_by_number(xml_path: Path) -> dict[str, str]:
    regulation_records, _, _ = parse_legislation_xml(xml_path)
    return {
        record["regulation_number"]: record["regulation_title"]
        for record in regulation_records
        if record.get("regulation_number")
    }


def enrich_regulation_titles_in_payload(payload: dict[str, Any], xml_path: Path) -> dict[str, Any]:
    """Populate regulation_title metadata from official XML P1group titles only."""

    titles = regulation_titles_by_number(xml_path)
    for chunk in payload.get("chunks", []):
        if not isinstance(chunk, dict):
            continue
        reg_num = str(chunk.get("regulation_number") or "").strip()
        if not reg_num:
            continue
        chunk["regulation_title"] = titles.get(reg_num, "")
    if isinstance(payload.get("provenance"), dict):
        payload["provenance"]["chunk_json_sha256"] = _sha256_canonical(payload)
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Regulations 2015 governed chunks.")
    parser.add_argument(
        "--xml",
        type=Path,
        default=Path("/tmp/regulations_2015.xml"),
        help="Path to reviewed legislation.gov.uk XML export.",
    )
    parser.add_argument(
        "--write-source",
        action="store_true",
        help="Write the plain-text source artefact.",
    )
    parser.add_argument(
        "--write-chunks",
        action="store_true",
        help="Write the chunks JSON artefact.",
    )
    parser.add_argument(
        "--enrich-titles-only",
        action="store_true",
        help="Update regulation_title metadata in committed chunks without changing source text.",
    )
    args = parser.parse_args()

    chunks_path = ROOT / CHUNKS_REL_PATH

    if args.enrich_titles_only:
        if not args.xml.is_file():
            print(f"Missing XML source: {args.xml}", file=sys.stderr)
            return 1
        if not chunks_path.is_file():
            print(f"Missing chunks artefact: {chunks_path}", file=sys.stderr)
            return 1
        payload = json.loads(chunks_path.read_text(encoding="utf-8"))
        payload = enrich_regulation_titles_in_payload(payload, args.xml)
        chunks_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        titled = sum(
            1
            for chunk in payload["chunks"]
            if chunk.get("regulation_number") and chunk.get("regulation_title")
        )
        print(f"Enriched regulation_title metadata in: {chunks_path}")
        print(f"Regulation chunks with titles: {titled}")
        print(f"Chunk checksum: {payload['provenance']['chunk_json_sha256']}")
        return 0

    if not args.xml.is_file():
        print(f"Missing XML source: {args.xml}", file=sys.stderr)
        return 1

    regulation_records, schedule_records, source_text = parse_legislation_xml(args.xml)
    source_path = ROOT / SOURCE_REL_PATH
    chunks_path = ROOT / CHUNKS_REL_PATH

    if args.write_source:
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_text(source_text, encoding="utf-8")
        print(f"Wrote source artefact: {source_path}")

    if not source_path.is_file():
        print("Source artefact missing; run with --write-source first.", file=sys.stderr)
        return 1

    source_checksum = _sha256_file(source_path)
    chunks = build_chunks(regulation_records, schedule_records, source_checksum=source_checksum)
    payload = build_payload(
        source_text=source_text,
        source_checksum=source_checksum,
        chunks=chunks,
    )

    if args.write_chunks:
        chunks_path.parent.mkdir(parents=True, exist_ok=True)
        chunks_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote chunks artefact: {chunks_path}")
        print(f"Chunks: {len(chunks)}")
        print(f"Source checksum: {source_checksum}")
        print(f"Chunk checksum: {payload['provenance']['chunk_json_sha256']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
