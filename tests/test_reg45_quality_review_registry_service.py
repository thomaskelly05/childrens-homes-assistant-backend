from __future__ import annotations

from services.reg45_quality_review_registry_service import reg45_quality_review_registry_service
from schemas.reg45_quality_review import Reg45ReviewEvidenceItem


def test_sections_exist():
    sections = reg45_quality_review_registry_service.list_sections()
    assert len(sections) >= 14
    types = {s["section_type"] for s in sections}
    assert "child_voice" in types
    assert "safeguarding_protection" in types
    assert "workforce_leadership" in types


def test_official_sources_exist():
    refs = reg45_quality_review_registry_service.official_source_refs()
    assert len(refs) >= 1


def test_safe_disclaimer_exists():
    disclaimer = reg45_quality_review_registry_service.safe_review_disclaimer()
    assert "not a compliance decision" in disclaimer.lower()
    assert "professional judgement" in disclaimer.lower()


def test_child_voice_maps():
    item = Reg45ReviewEvidenceItem(
        id="t1",
        title="Child voice keywork",
        safe_summary="Wishes and feelings may support review.",
        source_module="child_journey",
        route="/young-people/1",
        section_types=[],
    )
    mapped = reg45_quality_review_registry_service.map_evidence_to_sections(item)
    assert "child_voice" in mapped


def test_safeguarding_maps():
    item = Reg45ReviewEvidenceItem(
        id="t2",
        title="ISN safeguarding alert",
        safe_summary="Safeguarding network metadata — manager review needed.",
        source_module="isn_digest",
        route="/safeguarding",
        safeguarding_review_required=True,
    )
    mapped = reg45_quality_review_registry_service.map_evidence_to_sections(item)
    assert "safeguarding_protection" in mapped


def test_workforce_maps():
    item = Reg45ReviewEvidenceItem(
        id="t3",
        title="Staff supervision route",
        safe_summary="Workforce supervision indicator — no raw notes.",
        source_module="workforce_context",
        route="/staff",
        manager_review_required=True,
    )
    mapped = reg45_quality_review_registry_service.map_evidence_to_sections(item)
    assert "workforce_leadership" in mapped
