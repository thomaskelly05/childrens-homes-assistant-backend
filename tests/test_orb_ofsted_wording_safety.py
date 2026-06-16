"""Tests that risky Ofsted / compliance validation wording stays out of product-facing strings."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

from assistant.evals.orb_ofsted_wording_audit import (  # noqa: E402
    ALLOWLIST_RELATIVE_PATHS,
    BOUNDARY_DISCLAIMER,
    find_risky_product_occurrences,
    scan_repo,
)
from assistant.evals.orb_external_framework_traceability import (  # noqa: E402
    load_external_sources,
    load_rubric_traceability,
)
from assistant.evals.orb_source_coverage_risk_map import build_source_coverage_risk_map  # noqa: E402

TRACEABILITY_DOC = ROOT / "docs" / "orb_quality_framework_traceability.md"
VARIANTS_REPORT = ROOT / "reports" / "orb_residential_variants_1000_report.json"
TRACEABILITY_REPORT = ROOT / "reports" / "orb_residential_variants_1000_traceability_report.json"
RISK_MAP_JSON = ROOT / "reports" / "orb_quality_lab_source_coverage_risk_map.json"
RISK_MAP_MD = ROOT / "reports" / "orb_quality_lab_source_coverage_risk_map.md"
QUALITY_SUMMARY = ROOT / "reports" / "orb_quality_lab_summary.json"


def test_no_risky_ofsted_wording_in_product_strings() -> None:
    risky = find_risky_product_occurrences()
    if risky:
        sample = "\n".join(f"{o.file}:{o.line} — {o.occurrence}: {o.context[:80]}" for o in risky[:15])
        pytest.fail(f"Risky product-facing wording found ({len(risky)}):\n{sample}")


def test_factual_ofsted_sources_preserved_in_registry() -> None:
    sources = load_external_sources()
    blob = json.dumps(sources).lower()
    assert "ofsted" in blob
    assert any(s.get("source_id", "").startswith("ofsted") for s in sources.get("sources") or [])


def test_governance_traceability_doc_has_boundary_wording() -> None:
    text = TRACEABILITY_DOC.read_text(encoding="utf-8").lower()
    assert "must not mark its own homework" in text
    assert "internal quality indicator" in text
    assert "not" in text and "regulatory" in text


def test_rubric_traceability_preserves_ofsted_source_references() -> None:
    rubric = load_rubric_traceability()
    blob = json.dumps(rubric).lower()
    assert "ofsted" in blob
    assert "ofsted approved" not in blob
    assert "compliance guaranteed" not in blob


def test_allowlist_is_explicit_and_small() -> None:
    assert len(ALLOWLIST_RELATIVE_PATHS) <= 15
    for rel in ALLOWLIST_RELATIVE_PATHS:
        assert (ROOT / rel).is_file() or rel.startswith("reports/"), rel


def test_variants1000_traceability_report_exists() -> None:
    if not TRACEABILITY_REPORT.is_file():
        pytest.skip("traceability report not generated yet — run variants1000 baseline")
    payload = json.loads(TRACEABILITY_REPORT.read_text(encoding="utf-8"))
    assert payload.get("scenario_count") == 1000
    trace = payload.get("traceability") or {}
    assert trace.get("rubric_external_coverage_percent") is not None
    assert "internal quality indicator" in str(payload.get("disclaimer", "")).lower()


def test_source_coverage_risk_map_generated() -> None:
    if not RISK_MAP_JSON.is_file():
        pytest.skip("risk map not generated yet — run variants1000 baseline")
    risk_map = json.loads(RISK_MAP_JSON.read_text(encoding="utf-8"))
    assert risk_map.get("scenario_variants_scored") == 1000
    assert risk_map.get("high_risk_domains_needing_source_deepening")
    assert RISK_MAP_MD.is_file()
    md = RISK_MAP_MD.read_text(encoding="utf-8")
    assert "Source Coverage Risk Map" in md


def test_quality_lab_summary_includes_wording_audit() -> None:
    if not QUALITY_SUMMARY.is_file():
        pytest.skip("quality lab summary not generated yet")
    summary = json.loads(QUALITY_SUMMARY.read_text(encoding="utf-8"))
    audit = summary.get("ofsted_wording_audit") or {}
    assert "risky_occurrences_found" in audit
    assert "factual_source_references_kept" in audit
    assert audit.get("status") in {"pass", "review_required"}
    assert BOUNDARY_DISCLAIMER.split(".")[0].lower() in str(summary.get("governance_boundary", "")).lower()


def test_source_coverage_risk_map_flags_known_gaps() -> None:
    risk_map = build_source_coverage_risk_map(scenario_count=1000)
    domains = {d["domain"] for d in risk_map.get("high_risk_domains_needing_source_deepening") or []}
    expected = {
        "restraint_physical_intervention",
        "missing_from_care",
        "medication_recording",
        "online_exploitation",
    }
    assert expected <= domains


def test_prohibited_compliance_claims_not_in_product_copy() -> None:
    audit = scan_repo(product_only=True)
    blob = " ".join(o.context for o in audit.occurrences).lower()
    for phrase in ("compliance guaranteed", "guarantees compliance", "regulator approved", "regulator endorsed"):
        assert phrase not in blob, f"Prohibited phrase in product scan: {phrase}"
