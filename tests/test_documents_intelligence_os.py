from __future__ import annotations

import pytest
from fastapi import HTTPException

from services.annex_a_generator_service import annex_a_generator_service
from services.chronology_intelligence_service import chronology_intelligence_service
from services.decision_accountability_service import decision_accountability_service
from services.document_extraction_service import document_extraction_service
from services.document_linking_service import document_linking_service
from services.document_signoff_service import document_signoff_service
from services.document_template_registry import document_template_registry
from services.forensic_audit_service import forensic_audit_service
from services.permissions_engine_service import permissions_engine_service
from services.provider_intelligence_service import ProviderIntelligenceService
from services.safeguarding_flowchart_service import safeguarding_flowchart_service


MANAGER = {"id": "m1", "role": "registered_manager", "home_id": "h1", "provider_id": "p1"}
STAFF = {"id": "s1", "role": "rsw", "home_id": "h1", "provider_id": "p1"}


def test_template_registry_contains_unique_master_build_templates():
    templates = document_template_registry.list_templates()
    uniqueness = document_template_registry.validate_uniqueness()

    assert uniqueness == {"ok": True, "template_count": 78, "duplicate_template_ids": []}
    assert {item["template_id"] for item in templates} >= {
        "referral_assessment",
        "strategy_meeting_record",
        "provider_quality_assurance_report",
    }
    assert all(item["editable"] and item["manager_signoff_required"] for item in templates)


def test_extraction_is_editable_draft_and_never_auto_finalised(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")

    result = document_extraction_service.extract(
        template_id="placement_plan",
        source_text="Child said they feel safer with trusted adult support. Risk: missing episode. Action: manager review by 15/05/2026.",
        current_user=MANAGER,
    )

    assert result["editable_draft"] is True
    assert result["draft_only"] is True
    assert result["auto_finalised"] is False
    assert result["requires_manager_signoff"] is True
    assert result["confidence_score"] > 0.4
    assert result["fields"]["child_voice"]


def test_manager_signoff_tracks_human_actor_and_blocks_rsw_signoff():
    document = {"document_id": "d1", "status": "submitted_for_review"}

    signed = document_signoff_service.transition(document=document, target_status="manager_signed_off", current_user=MANAGER, evidence_reviewed=[{"source_id": "e1"}])

    assert signed["status"] == "manager_signed_off"
    assert signed["auto_signed_off"] is False
    assert signed["event"]["human_reviewed"] is True

    with pytest.raises(HTTPException):
        document_signoff_service.transition(document=document, target_status="manager_signed_off", current_user=STAFF)


def test_linking_engine_uses_only_supplied_evidence_and_reports_gaps():
    document = {"document_id": "d1"}
    records = [{"id": "r1", "record_type": "daily_note", "summary": "Missing episode linked to police and risk review."}]

    result = document_linking_service.suggest_links(document=document, records=records)

    assert result["never_invent_evidence"] is True
    assert result["links"]["chronology"]
    assert result["links"]["safeguarding"]
    assert any(gap["message"] == "no evidence found" for gap in result["evidence_gaps"])


def test_annex_a_generation_is_editable_and_says_no_evidence_when_absent():
    annex = annex_a_generator_service.generate(records=[], current_user=MANAGER)

    assert annex["status"] == "draft"
    assert annex["editable"] is True
    assert annex["auto_finalised"] is False
    assert all(section["summary"] == "no evidence found" for section in annex["sections"])


def test_safeguarding_flow_creates_review_actions_without_auto_referral():
    flow = safeguarding_flowchart_service.start(concern={"summary": "Immediate safeguarding concern with missing and police involvement."}, current_user=MANAGER)

    assert flow["threshold"] == "high"
    assert flow["human_review_required"] is True
    assert flow["auto_referred"] is False
    assert any(action["action"] == "consider_external_referral" for action in flow["next_actions"])


def test_chronology_intelligence_detects_repeated_missing_pattern():
    records = [
        {"id": "1", "summary": "Missing episode and returned by police."},
        {"id": "2", "summary": "Young person was missing again after contact."},
    ]

    result = chronology_intelligence_service.analyse(records=records, young_person_id="c1")

    assert any(alert["pattern"] == "repeated_missing" for alert in result["alerts"])
    assert result["alerts"][0]["evidence_links"]


def test_provider_permissions_and_audit_are_accountable():
    permission = permissions_engine_service.can_access(
        current_user=MANAGER,
        resource={"provider_id": "p1", "home_id": "h1", "child_id": "c1", "safeguarding_sensitive": True},
        action="signoff",
    )
    audit = forensic_audit_service.event(action="document_signoff", actor=MANAGER, resource={"type": "document", "id": "d1"})
    decision = decision_accountability_service.record_decision(
        suggestion={"confidence_score": 0.7, "text": "Review risk plan"},
        decision="approved",
        rationale="Manager checked linked evidence.",
        evidence=[{"source_id": "e1"}],
        current_user=MANAGER,
    )

    assert permission["allowed"] is True
    assert audit["legal_defensibility"]["source_evidence_required"] is True
    assert decision["draft_only"] is True
    assert decision["final_outcome"] == "editable_draft_updated"


def test_provider_intelligence_snapshot_never_invents_missing_sections():
    snapshot = ProviderIntelligenceService().build_os_snapshot(records=[], current_user=MANAGER)

    assert snapshot["status"] == "draft"
    assert snapshot["human_review_required"] is True
    assert all(section["summary"] == "no evidence found" for section in snapshot["sections"].values())
