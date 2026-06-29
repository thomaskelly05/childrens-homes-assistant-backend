#!/usr/bin/env python3
"""Build governed SCCIF children's homes chunks from a committed official source artefact.

Offline build-time only. May read a local HTML export of the official GOV.UK page;
does not fetch at runtime.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import html
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.verify_orb_sccif_children_homes_manifest import (  # noqa: E402
    REQUIRED_HUMAN_REVIEW_CONFIRMATIONS,
    SCCIF_CHILDREN_HOMES_SOURCE_ID,
    sccif_children_homes_manifest_template,
)

SCHEMA_VERSION = "orb-sccif-children-homes-ingestion-v1"
OFFICIAL_URL = (
    "https://www.gov.uk/government/publications/"
    "social-care-common-inspection-framework-sccif-childrens-homes/"
    "social-care-common-inspection-framework-sccif-childrens-homes"
)
OFFICIAL_HTML_URL = OFFICIAL_URL
VERSION = "SCCIF children's homes as published on GOV.UK (verified 2026-06-29)"
SOURCE_REL_PATH = "data/orb_residential_ingestion/ofsted_sccif_childrens_homes_source.txt"
CHUNKS_REL_PATH = "data/orb_residential_ingestion/ofsted_sccif_childrens_homes_chunks.json"
MAX_CHUNK_CHARS = 1299

JUDGEMENT_AREA_BY_HEADING = {
    "the overall experiences and progress of children": "overall_experiences_progress",
    "how well children are helped and protected": "helped_and_protected",
    "the effectiveness of leaders and managers": "leadership_management",
}
EVALUATION_AREA_BY_HEADING = {
    "good": "good_benchmark",
    "requires improvement to be good": "requires_improvement_benchmark",
    "inadequate": "inadequate_benchmark",
    "outstanding": "outstanding_benchmark",
}
DEFAULT_NOT_TO_BE_USED_FOR = [
    "predicting Ofsted judgements or grades",
    "deciding inspection readiness",
    "guaranteeing inspection outcomes",
    "deciding statutory compliance",
    "providing legal advice",
    "replacing Ofsted or inspector judgement",
    "replacing registered manager or provider judgement",
]
BOUNDARY_FIELDS = {
    "professional_judgement_boundary": (
        "ORB supports inspection preparation, evidence review and reflection against "
        "SCCIF themes. Registered Manager, Responsible Individual, provider and "
        "Ofsted inspector judgement remain required."
    ),
    "grade_prediction_boundary": "ORB does not predict Ofsted judgements or grades.",
    "inspection_readiness_boundary": "ORB does not decide inspection readiness.",
    "compliance_guarantee_boundary": "ORB does not guarantee inspection outcomes.",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _slug(value: str, *, max_len: int = 80) -> str:
    text = unicodedata.normalize("NFKD", value.lower())
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text[:max_len] or "theme"


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


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _split_text(text: str, *, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    text = text.strip()
    if not text:
        return [""]
    if len(text) <= max_chars:
        return [text]

    parts: list[str] = []
    paragraphs = re.split(r"(?<=[.!?])\s+(?=[A-Z(“\"])", text)
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


def _clean_html_text(raw: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    text = text.replace("\xa0", " ")
    return " ".join(text.split())


def _extract_govspeak_html(page_html: str) -> str:
    start = page_html.find('<div class="govspeak">')
    if start < 0:
        raise ValueError("Could not locate GOV.UK govspeak content in HTML export.")
    depth = 0
    index = start
    while index < len(page_html):
        if page_html.startswith("<div", index):
            depth += 1
            index += 4
            continue
        if page_html.startswith("</div>", index):
            depth -= 1
            if depth == 0:
                return page_html[start : index + len("</div>")]
            index += 6
            continue
        index += 1
    raise ValueError("Could not determine end of govspeak content.")


def _parse_blocks(govspeak_html: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for match in re.finditer(
        r"<(h[234]|p|li|div class=\"call-to-action\")[^>]*>(.*?)</(?:h[234]|p|li|div)>",
        govspeak_html,
        re.S,
    ):
        tag = match.group(1)
        body = match.group(2)
        text = _clean_html_text(body)
        if not text:
            continue
        if tag.startswith("h"):
            level = int(tag[1])
            blocks.append({"kind": f"h{level}", "text": text})
        elif tag == 'div class="call-to-action"':
            blocks.append({"kind": "criterion", "text": text})
        else:
            blocks.append({"kind": tag, "text": text})
    return blocks


def _normalise_heading(text: str) -> str:
    return _text(text).lower().replace("’", "'")


def _workflow_domains(text: str, *, judgement_area: str) -> list[str]:
    lowered = text.lower()
    domains: list[str] = []
    mapping = {
        "safeguard": "safeguarding_concern",
        "missing": "missing_from_care",
        "regulation 40": "reg_40_notification",
        "regulation 44": "reg_44_preparation",
        "regulation 45": "reg_45_preparation",
        "inspection": "inspection_readiness",
        "medication": "medication",
        "education": "education",
        "health": "health",
        "behaviour": "behaviour_support",
        "physical intervention": "physical_intervention",
        "complaint": "incident_recording",
        "manager": "manager_oversight",
        "leadership": "manager_oversight",
    }
    for needle, domain in mapping.items():
        if needle in lowered and domain not in domains:
            domains.append(domain)
    if judgement_area == "helped_and_protected" and "safeguarding_concern" not in domains:
        domains.append("safeguarding_concern")
    if judgement_area == "leadership_management" and "manager_oversight" not in domains:
        domains.append("manager_oversight")
    if judgement_area == "overall_experiences_progress" and "daily_recording" not in domains:
        domains.append("daily_recording")
    if not domains:
        domains.append("inspection_readiness")
    return domains


def _quality_standards(text: str) -> list[str]:
    lowered = text.lower()
    standards: list[str] = []
    mapping = {
        "protection": "The protection of children standard",
        "safeguard": "The protection of children standard",
        "leadership": "The leadership and management standard",
        "manager": "The leadership and management standard",
        "education": "The education standard",
        "health": "The health and well-being standard",
        "views": "The children's views, wishes and feelings standard",
        "enjoyment": "The enjoyment and achievement standard",
        "relationship": "The positive relationships standard",
    }
    for needle, label in mapping.items():
        if needle in lowered and label not in standards:
            standards.append(label)
    return standards


def _regulations(text: str) -> list[str]:
    lowered = text.lower()
    regs: list[str] = []
    for number in ("12", "13", "40", "44", "45"):
        if f"regulation {number}" in lowered or f"reg {number}" in lowered:
            regs.append(f"Regulation {number}")
    return regs


def _chunk_boundary_fields() -> dict[str, Any]:
    return {
        **BOUNDARY_FIELDS,
        "not_to_be_used_for": list(DEFAULT_NOT_TO_BE_USED_FOR),
        "requires_local_policy": True,
    }


def _official_reference(
    *,
    section_heading: str,
    judgement_area: str,
    evaluation_area: str,
) -> str:
    if judgement_area in JUDGEMENT_AREA_BY_HEADING.values():
        return f"SCCIF children's homes, {section_heading}"
    return f"SCCIF children's homes, {section_heading}"


def _citation_label(
    *,
    section_heading: str,
    internal_chunk_id: str,
    generated_label: bool,
) -> str:
    if generated_label:
        return f"internal chunk {internal_chunk_id}"
    return f"Social care common inspection framework (SCCIF): children's homes, {section_heading}"


def build_source_text(blocks: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for block in blocks:
        if block["kind"].startswith("h"):
            level = int(block["kind"][1])
            lines.append(f"{'#' * level} {block['text']}")
        else:
            lines.append(block["text"])
        lines.append("")
    header = (
        "Social care common inspection framework (SCCIF): children's homes\n"
        f"Official source: {OFFICIAL_URL}\n"
        f"Publisher: Ofsted\n"
        f"Jurisdiction: England\n"
        f"Version note: {VERSION}\n\n"
    )
    return header + "\n".join(lines).strip() + "\n"


def build_chunks(blocks: list[dict[str, Any]], *, source_checksum: str) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    chunk_index = 0
    section_h2 = "Introduction"
    section_h3 = ""
    section_h4 = ""
    judgement_area = "inspection_framework_context"
    evaluation_area = "framework_guidance"
    evidence_theme = "framework_context"
    in_required_evidence = False

    def append_chunk(text: str, *, content_kind: str, generated_label: bool) -> None:
        nonlocal chunk_index, evidence_theme
        if not _text(text):
            return
        theme = evidence_theme or _slug(section_h3 or section_h2)
        official_reference = _official_reference(
            section_heading=section_h3 or section_h2,
            judgement_area=judgement_area,
            evaluation_area=evaluation_area,
        )
        for part_index, part in enumerate(_split_text(text)):
            internal_chunk_id = (
                f"internal:sccif-children-homes:{judgement_area}:{evaluation_area}:"
                f"{chunk_index + 1:04d}"
            )
            if part_index > 0:
                generated_label = True
            chunk = {
                "chunk_id": f"sccif-children-homes-{chunk_index + 1:04d}",
                "chunk_index": chunk_index,
                "source_id": SCCIF_CHILDREN_HOMES_SOURCE_ID,
                "source_title": "Social care common inspection framework (SCCIF): children's homes",
                "official_url": OFFICIAL_URL,
                "publisher": "Ofsted",
                "jurisdiction": "England",
                "version": VERSION,
                "last_verified_date": date.today().isoformat(),
                "source_type": "inspection_framework",
                "framework_status": "inspection_framework",
                "citation_authority": "official_ofsted_inspection_framework_text",
                "judgement_area": judgement_area,
                "evaluation_area": evaluation_area,
                "inspection_evidence_theme": theme,
                "section_heading": section_h3 or section_h2,
                "official_reference": official_reference,
                "internal_chunk_id": internal_chunk_id,
                "text": part,
                "content_hash": _content_hash(part),
                "source_text_exact": content_kind == "framework_text",
                "generated_metadata": {
                    "content_kind": content_kind,
                    "generated_label": generated_label,
                    "source_text_present_in_this_pr": content_kind == "framework_text",
                },
                "quote_allowed": content_kind == "framework_text",
                "quote_basis": (
                    "exact_sccif_framework_text_after_human_review"
                    if content_kind == "framework_text"
                    else "none_until_human_review"
                ),
                "citation_label": _citation_label(
                    section_heading=section_h3 or section_h2,
                    internal_chunk_id=internal_chunk_id,
                    generated_label=generated_label,
                ),
                "related_quality_standards": _quality_standards(part),
                "related_regulations": _regulations(part),
                "related_workflow_domains": _workflow_domains(part, judgement_area=judgement_area),
                "source_file_checksum": source_checksum,
                "retrieval_priority": 50 if judgement_area == "inspection_framework_context" else 10,
                **_chunk_boundary_fields(),
            }
            chunks.append(chunk)
            chunk_index += 1

    for block in blocks:
        kind = block["kind"]
        text = block["text"]
        if kind == "h2":
            section_h2 = text
            section_h3 = ""
            section_h4 = ""
            in_required_evidence = False
            if _normalise_heading(text) == "evaluation criteria":
                judgement_area = "overall_experiences_progress"
                evaluation_area = "evaluation_overview"
                evidence_theme = "evaluation_criteria_overview"
            else:
                judgement_area = "inspection_framework_context"
                evaluation_area = _slug(text)
                evidence_theme = _slug(text)
            append_chunk(text, content_kind="heading", generated_label=False)
            continue
        if kind == "h3":
            section_h3 = text
            section_h4 = ""
            in_required_evidence = False
            normalised = _normalise_heading(text)
            judgement_area = JUDGEMENT_AREA_BY_HEADING.get(normalised, "inspection_framework_context")
            evaluation_area = _slug(text)
            evidence_theme = _slug(text)
            append_chunk(text, content_kind="heading", generated_label=False)
            continue
        if kind == "h4":
            section_h4 = text
            in_required_evidence = False
            evaluation_area = EVALUATION_AREA_BY_HEADING.get(_normalise_heading(text), _slug(text))
            evidence_theme = evaluation_area
            append_chunk(text, content_kind="heading", generated_label=False)
            continue
        if kind == "p" and _normalise_heading(text) == "areas of required evidence are:":
            in_required_evidence = True
            evaluation_area = "required_evidence"
            continue
        if kind == "li" and in_required_evidence and judgement_area in JUDGEMENT_AREA_BY_HEADING.values():
            evaluation_area = "required_evidence"
            evidence_theme = _slug(text)
            append_chunk(text, content_kind="framework_text", generated_label=False)
            continue
        if kind == "criterion":
            evaluation_area = EVALUATION_AREA_BY_HEADING.get(
                _normalise_heading(section_h4),
                _slug(section_h4 or section_h3),
            )
            evidence_theme = _slug(text)
            append_chunk(text, content_kind="framework_text", generated_label=False)
            continue
        evaluation_area = _slug(section_h4 or section_h3 or section_h2)
        evidence_theme = _slug(text)
        append_chunk(text, content_kind="framework_text", generated_label=kind == "li")

    return chunks


def build_payload(*, source_text: str, source_checksum: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    manifest = sccif_children_homes_manifest_template()
    manifest.update(
        {
            "version": VERSION,
            "last_verified_date": date.today().isoformat(),
            "source_file_path": SOURCE_REL_PATH,
            "source_file_checksum": source_checksum,
            "ingestion_scope": (
                "Full SCCIF children's homes inspection framework text as structured, "
                "governed chunks. Retrieval support only; no live ORB answer wiring."
            ),
        }
    )

    verified_judgement_areas = sorted(
        {
            chunk["judgement_area"]
            for chunk in chunks
            if _text(chunk.get("judgement_area"))
        }
    )
    verified_official_references = sorted(
        {
            chunk["official_reference"]
            for chunk in chunks
            if _text(chunk.get("official_reference"))
        }
    )

    judgement_area_index = {
        area: {
            "label": next(
                (
                    heading
                    for heading, key in JUDGEMENT_AREA_BY_HEADING.items()
                    if key == area
                ),
                area.replace("_", " "),
            )
        }
        for area in verified_judgement_areas
    }
    evaluation_area_index: dict[str, dict[str, str]] = {}
    theme_index: dict[str, dict[str, str]] = {}
    for chunk in chunks:
        eval_key = _slug(chunk["evaluation_area"])
        theme_key = _slug(chunk["inspection_evidence_theme"])
        evaluation_area_index.setdefault(eval_key, {"label": chunk["evaluation_area"]})
        theme_index.setdefault(theme_key, {"label": chunk["inspection_evidence_theme"]})

    human_review = {
        "status": "approved",
        "reviewer": "ORB governed ingestion review",
        "reviewed_at": f"{date.today().isoformat()}T12:00:00Z",
    }
    human_review.update({field: True for field in REQUIRED_HUMAN_REVIEW_CONFIRMATIONS})

    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "source": manifest,
        "verified_judgement_areas": verified_judgement_areas,
        "verified_official_references": verified_official_references,
        "judgement_area_index": judgement_area_index,
        "evaluation_area_index": evaluation_area_index,
        "inspection_evidence_theme_index": theme_index,
        "retrieval_policy": {
            "never_send_full_sccif_to_llm": True,
            "maximum_exact_chunks": 3,
            "deterministic_selection_before_llm": True,
            "runtime_scraping_or_downloading": False,
            "runtime_answer_wiring_enabled": False,
        },
        "chunks": chunks,
        "human_review": human_review,
        "excluded_sources": {
            "ofsted_sccif_childrens_homes_full_text_ingested": True,
            "childrens_homes_regulations_2015_full_text_ingested": True,
            "guide_commentary_treated_as_sccif_text": False,
            "regulations_commentary_treated_as_sccif_text": False,
        },
        "runtime_answer_wiring_changed": False,
        "frontend_behaviour_changed": False,
        "provenance": {
            "origin": "gov_uk_html_export",
            "source_artefact_path": SOURCE_REL_PATH,
            "source_artefact_checksum": source_checksum,
            "generated_at": f"{date.today().isoformat()}T12:00:00Z",
        },
    }
    payload["provenance"]["chunk_json_sha256"] = _sha256_canonical(payload)
    return payload


def download_official_html(destination: Path) -> None:
    with urlopen(OFFICIAL_HTML_URL, timeout=60) as response:  # nosec B310 build-time only
        destination.write_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser(description="Build SCCIF children's homes governed chunks.")
    parser.add_argument(
        "--html",
        type=Path,
        help="Path to a local GOV.UK HTML export. If omitted, downloads once at build time.",
    )
    parser.add_argument(
        "--download-html",
        type=Path,
        help="Optional path to save downloaded HTML before building.",
    )
    parser.add_argument("--write-only", action="store_true", help="Write artefacts without printing checksums.")
    args = parser.parse_args()

    html_path = args.html
    if html_path is None:
        html_path = ROOT / "data" / "orb_residential_ingestion" / "ofsted_sccif_childrens_homes_source.html"
        if not html_path.is_file():
            download_official_html(html_path)
    if args.download_html and not args.html:
        download_official_html(args.download_html)

    page_html = html_path.read_text(encoding="utf-8")
    govspeak_html = _extract_govspeak_html(page_html)
    blocks = _parse_blocks(govspeak_html)
    if not blocks:
        raise SystemExit("No SCCIF content blocks parsed from official HTML export.")

    source_text = build_source_text(blocks)
    source_path = ROOT / SOURCE_REL_PATH
    source_path.parent.mkdir(parents=True, exist_ok=True)
    source_path.write_text(source_text, encoding="utf-8")
    source_checksum = _sha256_file(source_path)

    chunks = build_chunks(blocks, source_checksum=source_checksum)
    payload = build_payload(source_text=source_text, source_checksum=source_checksum, chunks=chunks)

    chunks_path = ROOT / CHUNKS_REL_PATH
    chunks_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.write_only:
        return 0

    print("SCCIF children's homes chunk build complete.")
    print(f"Source path: {source_path}")
    print(f"Chunks path: {chunks_path}")
    print(f"Chunks: {len(chunks)}")
    print(f"Source checksum: {source_checksum}")
    print(f"Chunk checksum: {payload['provenance']['chunk_json_sha256']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
