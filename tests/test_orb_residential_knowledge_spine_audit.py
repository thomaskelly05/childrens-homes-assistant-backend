"""ORB Residential Knowledge Spine Audit — non-invasive guard tests.

Standalone ORB only. Does not ingest sources or change runtime behaviour.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from services.orb_residential_knowledge_spine_audit_service import (
    REQUIRED_CORE_SOURCE_IDS,
    REQUIRED_CORE_SOURCES,
    SCCIF_JUDGEMENT_AREAS,
    NINE_QUALITY_STANDARDS,
    orb_residential_knowledge_spine_audit_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_trusted_sources_registry() -> dict:
    path = REPO_ROOT / "assistant" / "knowledge" / "trusted_sources_registry.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _load_quality_standards_brain() -> dict:
    path = REPO_ROOT / "assistant" / "knowledge" / "orb_quality_standards_brain.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_audit_doc_exists():
    path = REPO_ROOT / "docs" / "audits" / "orb-residential-knowledge-spine-audit.md"
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "Knowledge Spine" in content
    assert "NR-1" in content
    assert "full text" in content.lower()


def test_required_core_sources_in_trusted_registry():
    registry = _load_trusted_sources_registry()
    registry_ids = {s["source_id"] for s in registry["sources"]}
    assert REQUIRED_CORE_SOURCE_IDS <= registry_ids


def test_required_source_metadata_has_title_url_type_status():
    registry = _load_trusted_sources_registry()
    by_id = {s["source_id"]: s for s in registry["sources"]}
    for source_id in REQUIRED_CORE_SOURCE_IDS:
        entry = by_id[source_id]
        assert entry.get("title")
        assert entry.get("url")
        assert entry.get("source_type")
        assert entry.get("trust_tier") == "gold"
        assert entry.get("last_checked")


def test_three_core_sources_not_full_text_ingested():
    """Documents governance: full_text_allowed is false until deliberate ingest."""
    registry = _load_trusted_sources_registry()
    by_id = {s["source_id"]: s for s in registry["sources"]}
    for source_id in REQUIRED_CORE_SOURCE_IDS:
        assert by_id[source_id].get("full_text_allowed") is False


def test_quality_standards_map_has_nine_standards():
    brain = _load_quality_standards_brain()
    assert len(brain["standards"]) == 9
    assert len(NINE_QUALITY_STANDARDS) == 9
    brain_ids = {s["standard_id"] for s in brain["standards"]}
    audit_ids = {s["id"] for s in NINE_QUALITY_STANDARDS}
    assert brain_ids == audit_ids


def test_sccif_judgement_map_has_three_areas():
    source = (REPO_ROOT / "services" / "sccif_alignment_registry_service.py").read_text(encoding="utf-8")
    assert "overall_experiences_progress" in source
    assert "helped_and_protected" in source
    assert "leadership_management" in source
    assert len(SCCIF_JUDGEMENT_AREAS) == 3


def test_regulation_quote_registry_covers_key_regs():
    source = (REPO_ROOT / "assistant" / "regulation_quote_registry.py").read_text(encoding="utf-8")
    for reg in ("reg12", "reg13", "reg14", "reg40", "reg44", "reg45"):
        assert f'"{reg}"' in source
    assert "legislation.gov.uk/uksi/2015/541" in source


def test_citation_policy_modules_exist():
    for module in (
        "services/orb_citation_service.py",
        "services/orb_exact_citation_service.py",
        "assistant/citation_enforcer.py",
    ):
        assert (REPO_ROOT / module).is_file()


def test_answer_policy_distinguishes_source_types_and_boundaries():
    operating = (REPO_ROOT / "assistant" / "knowledge" / "orb_operating_brain.py").read_text(encoding="utf-8")
    operating_lower = operating.lower()
    assert "give legal certainty" in operating_lower
    assert "make final safeguarding decisions" in operating_lower
    assert "check the provider policy" in operating_lower

    sccif = (REPO_ROOT / "services" / "sccif_alignment_registry_service.py").read_text(encoding="utf-8")
    assert "not a compliance decision" in sccif.lower() or "not a compliance" in sccif.lower()
    assert "professional judgement" in sccif.lower()

    citation = (REPO_ROOT / "services" / "orb_citation_service.py").read_text(encoding="utf-8")
    assert "basis_type" in citation


def test_regulatory_answers_must_not_claim_guaranteed_compliance():
    operating = (REPO_ROOT / "assistant" / "knowledge" / "orb_operating_brain.py").read_text(encoding="utf-8")
    must_not = operating.lower()
    assert "legal certainty" in must_not
    sccif = (REPO_ROOT / "services" / "sccif_alignment_registry_service.py").read_text(encoding="utf-8")
    assert "predict" in sccif.lower() or "grade" in sccif.lower()


def test_safeguarding_preserves_professional_judgement_escalation():
    operating = (REPO_ROOT / "assistant" / "knowledge" / "orb_operating_brain.py").read_text(encoding="utf-8")
    assert "safeguarding" in operating.lower()
    assert "professional judgement" in operating.lower() or "provider policy" in operating.lower()

    reg_quotes = (REPO_ROOT / "assistant" / "regulation_quote_registry.py").read_text(encoding="utf-8")
    assert "must not guess" in reg_quotes.lower() or "without enough facts" in reg_quotes.lower()


def test_summary_seeds_exist_for_guide_and_sccif():
    qs_seed = REPO_ROOT / "data" / "orb_knowledge_seed" / "quality_standards_overview.md"
    sccif_seed = REPO_ROOT / "data" / "orb_knowledge_seed" / "ofsted_sccif_overview.md"
    assert qs_seed.is_file()
    assert sccif_seed.is_file()
    assert "not a substitute" in sccif_seed.read_text(encoding="utf-8").lower()


def test_audit_service_reports_no_full_text_ingest():
    service = orb_residential_knowledge_spine_audit_service
    assert service.sources_present_as_full_text() == []
    assert len(service.sources_present_as_summary()) == 3
    assert service.can_cite_sources() is True
    assert service.has_quality_standards_mapping() is True
    assert service.has_sccif_mapping() is True
    assert service.has_answer_policy() is True


def test_knowledge_spine_gaps_documented():
    gaps = orb_residential_knowledge_spine_audit_service.gaps()
    gap_ids = {g["gap"] for g in gaps}
    assert "full_text_ingestion" in gap_ids
    assert "regulations_2015_no_seed" in gap_ids


def test_proposed_spine_design_references_existing_modules():
    design = orb_residential_knowledge_spine_audit_service.proposed_spine_design()
    assert "trusted_sources_registry" in design["source_registry"]["existing_module"]
    assert "orb_document_ingestion_service" in design["chunking_strategy"]["existing_module"]
    assert "orb_knowledge_retrieval_service" in design["retrieval_strategy"]["existing_module"]


def test_retrieval_service_references_regulatory_packs():
    source = (REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py").read_text(encoding="utf-8")
    assert "ofsted_sccif" in source
    assert "childrens_homes_regulations" in source or "quality_standards" in source


def test_core_sources_in_official_guidance_curated():
    curated = json.loads(
        (REPO_ROOT / "data" / "orb_official_guidance_curated.json").read_text(encoding="utf-8")
    )
    titles = " ".join(item["title"].lower() for item in curated)
    assert "regulations 2015" in titles or "children's homes regulations" in titles
    assert "quality standards" in titles
    assert "sccif" in titles


def test_workflow_domains_mapped():
    domains = orb_residential_knowledge_spine_audit_service.workflow_domains()
    domain_names = {d["domain"] for d in domains}
    assert "reg_44_preparation" in domain_names
    assert "reg_45_preparation" in domain_names
    assert "safeguarding_reflection" in domain_names
