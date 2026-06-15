"""ORB Residential external framework traceability — source registry and coverage helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
QUALITY_DIR = ROOT / "quality"

SOURCES_PATH = QUALITY_DIR / "orb_external_framework_sources.json"
RUBRIC_TRACEABILITY_PATH = QUALITY_DIR / "orb_quality_rubric_traceability.json"
UNSAFE_FLAG_TRACEABILITY_PATH = QUALITY_DIR / "orb_unsafe_flag_traceability.json"
SCENARIO_EXPECTATION_PATH = QUALITY_DIR / "orb_scenario_expectation_traceability.json"
REVIEWER_PACK_PATH = QUALITY_DIR / "orb_external_reviewer_pack.json"

VALID_RELIABILITY_LEVELS = frozenset(
    {"statutory", "regulator", "professional", "practice-informed", "internal"}
)
VALID_EVIDENCE_STRENGTHS = frozenset({"high", "medium", "emerging", "internal_only"})
VALID_SOURCE_HIERARCHY = ("statutory", "regulator", "professional", "practice-informed", "internal")

PROHIBITED_CLAIM_PATTERNS = (
    "ofsted approved",
    "ofsted endorsement",
    "compliance guaranteed",
    "compliance guarantee",
    "regulator validated",
    "professionally validated",
    "safeguarding decision made by orb",
)

APPROVED_CLAIM_PHRASES = (
    "source-mapped internal quality framework",
    "aligned to recognised statutory, regulatory and professional sources where applicable",
    "internal quality indicator, not a regulatory judgement",
    "supports professional reflection and safer recording",
    "adults remain accountable for decisions, escalation and final records",
)


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_external_sources() -> dict[str, Any]:
    return _load_json(SOURCES_PATH)


def load_rubric_traceability() -> dict[str, Any]:
    return _load_json(RUBRIC_TRACEABILITY_PATH)


def load_unsafe_flag_traceability() -> dict[str, Any]:
    return _load_json(UNSAFE_FLAG_TRACEABILITY_PATH)


def load_scenario_expectation_traceability() -> dict[str, Any]:
    return _load_json(SCENARIO_EXPECTATION_PATH)


def load_external_reviewer_pack() -> dict[str, Any]:
    return _load_json(REVIEWER_PACK_PATH)


def source_index() -> dict[str, dict[str, Any]]:
    payload = load_external_sources()
    return {s["source_id"]: s for s in payload.get("sources") or []}


def compute_traceability_summary() -> dict[str, Any]:
    """Compute coverage statistics for Quality Lab reports."""
    from assistant.evals.orb_residential_quality_rubric import BINARY_FLAGS, RUBRIC_CATEGORIES

    rubric_map = load_rubric_traceability()
    unsafe_map = load_unsafe_flag_traceability()
    scenario_map = load_scenario_expectation_traceability()
    sources = load_external_sources()

    categories = rubric_map.get("categories") or []
    rubric_by_name = {c["rubric_category"]: c for c in categories}

    externally_mapped = 0
    internal_only = 0
    strength_counts: dict[str, int] = {}

    for cat in RUBRIC_CATEGORIES:
        entry = rubric_by_name.get(cat)
        if not entry:
            continue
        strength = str(entry.get("evidence_strength") or "internal_only")
        strength_counts[strength] = strength_counts.get(strength, 0) + 1
        ext_ids = entry.get("external_source_ids") or []
        if ext_ids:
            externally_mapped += 1
        else:
            internal_only += 1

    total_categories = len(RUBRIC_CATEGORIES)
    rubric_coverage_pct = round((externally_mapped / total_categories) * 100, 1) if total_categories else 0.0

    flags = unsafe_map.get("flags") or []
    unsafe_with_external = sum(
        1
        for f in flags
        if any(
            source_index().get(sid, {}).get("reliability_level") != "internal"
            for sid in (f.get("source_basis") or [])
        )
    )
    unsafe_total = len(flags)

    req_elements = scenario_map.get("required_element_mappings") or []
    proh_elements = scenario_map.get("prohibited_element_mappings") or []
    families = scenario_map.get("scenario_family_mappings") or []

    scenario_req_mapped = sum(1 for e in req_elements if e.get("external_source_ids"))
    scenario_proh_mapped = sum(1 for e in proh_elements if e.get("external_source_ids"))
    families_mapped = sum(1 for f in families if f.get("external_source_ids"))

    return {
        "framework_claim": rubric_map.get("framework_claim", "Source-mapped internal quality framework"),
        "traceability_disclaimer": rubric_map.get(
            "disclaimer",
            "Internal quality indicator, not a regulatory judgement.",
        ),
        "source_count": len(sources.get("sources") or []),
        "source_hierarchy": list(sources.get("source_hierarchy") or VALID_SOURCE_HIERARCHY),
        "rubric_categories_total": total_categories,
        "rubric_categories_externally_mapped": externally_mapped,
        "rubric_categories_internal_only": internal_only,
        "rubric_external_coverage_percent": rubric_coverage_pct,
        "evidence_strength_summary": strength_counts,
        "unsafe_flags_total": unsafe_total,
        "unsafe_flags_with_external_basis": unsafe_with_external,
        "scenario_required_elements_mapped": scenario_req_mapped,
        "scenario_required_elements_total": len(req_elements),
        "scenario_prohibited_elements_mapped": scenario_proh_mapped,
        "scenario_prohibited_elements_total": len(proh_elements),
        "scenario_families_mapped": families_mapped,
        "scenario_families_total": len(families),
        "approved_claims": list(APPROVED_CLAIM_PHRASES),
        "prohibited_claims": list(sources.get("prohibited_claims") or []),
    }


def build_traceability_report_section() -> dict[str, Any]:
    """Section payload for Quality Lab JSON/Markdown reports."""
    summary = compute_traceability_summary()
    rubric_map = load_rubric_traceability()

    internal_only_categories = [
        c["rubric_category"]
        for c in (rubric_map.get("categories") or [])
        if not (c.get("external_source_ids") or [])
    ]

    return {
        **summary,
        "internal_only_categories": internal_only_categories,
        "warning": (
            "Scores are internal quality indicators aligned to recognised sources where mapped. "
            "They are not regulatory determinations, inspection predictions, or professional validation. "
            "Adults remain accountable for decisions, escalation and final records."
        ),
    }
