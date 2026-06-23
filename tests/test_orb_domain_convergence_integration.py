"""ORB domain convergence integration — orchestrator wiring and surface parity."""

from __future__ import annotations

import json

import pytest

from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_dictate_edit_service import edit_dictate_document
from services.orb_dictate_service import prepare_write_document
from services.orb_unified_brain_gateway import orb_unified_brain_gateway
from services.orb_voice_respond_service import VOICE_FAST_LIMITATIONS, generate_voice_response
from schemas.orb_dictate import OrbDictateEditRequest, OrbDictatePrepareWriteRequest


def _decision(message: str, **kwargs):
    return orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB", **kwargs)


def test_domain_convergence_in_orchestrator_metadata():
    decision = _decision("Help me record this daily incident for the young person.")
    meta = orb_brain_convergence_orchestrator_service.convergence_metadata(decision)
    assert meta.get("domain_convergence")
    assert isinstance(meta.get("active_final_domains"), list)
    assert isinstance(meta.get("public_source_chips"), list)
    assert isinstance(meta.get("source_anchors"), list)


def test_child_story_activates_for_record_incident_dictate_write():
    for message, feature in (
        ("Write this daily record with child voice.", "dictate"),
        ("Incident report — young person returned from missing.", "dictate"),
        ("Prepare incident record body.", "write"),
    ):
        decision = _decision(message, feature=feature, note_type="incident_record")
        assert "child_story" in decision.active_final_domains


def test_send_activates_for_autism_send_sensory_prompts():
    decision = _decision(
        "Young person with autism had a sensory overload during transition. EHCP reasonable adjustments."
    )
    assert "send_communication" in decision.active_final_domains
    anchors = " ".join(decision.source_anchors).lower()
    assert "send" in anchors or any("send" in chip.get("label", "").lower() for chip in decision.public_source_chips)


def test_rights_activates_for_advocacy_complaint_voice_prompts():
    decision = _decision("The child made a complaint and wants advocacy support for their voice.")
    assert "rights_corporate_parenting" in decision.active_final_domains


def test_health_activates_for_camhs_self_harm_wellbeing_prompts():
    decision = _decision("CAMHS referral discussed after self-harm presentation and low mood.")
    assert "health_wellbeing" in decision.active_final_domains


def test_multi_agency_activates_for_missing_safeguarding_allegation_prompts():
    decision = _decision("Missing from care returned — safeguarding allegation against staff reported to LADO.")
    assert "multi_agency" in decision.active_final_domains
    assert decision.scenario_types


def test_source_chips_returned_without_extra_llm_calls():
    decision = _decision("Safeguarding missing child returned — multi-agency strategy meeting.")
    chips = orb_brain_convergence_orchestrator_service.convergence_source_chips_as_sources(decision)
    assert chips
    for chip in chips:
        assert chip.get("label")
        assert chip.get("precision") == "source_family_anchor"
        assert chip.get("type") == "source_family"


def test_debug_metadata_excludes_raw_prompt_and_message_content():
    message = "John Smith DOB 01/01/2010 — safeguarding concern john.smith@example.com"
    payload = orb_brain_convergence_orchestrator_service.build_debug_payload(message)
    serialised = json.dumps(payload).lower()
    assert "john.smith@example.com" not in serialised
    assert "raw_prompt" not in serialised
    assert "system_prompt" not in serialised
    assert payload.get("domain_convergence")


def test_voice_fast_path_skips_convergence_but_documents_limitations(monkeypatch):
    class FastGateway:
        text = "What happened just before things escalated?"

    monkeypatch.setattr(
        "services.orb_voice_respond_service.governed_draft_text",
        lambda **kwargs: FastGateway(),
    )
    result = generate_voice_response(
        message="I just want to talk through how the shift felt today.",
        mode="just_talk",
        session_memory={},
    )
    assert result["brainTier"] == "voice_fast"
    assert result["voiceFastLimitations"] == VOICE_FAST_LIMITATIONS
    assert result.get("publicSourceChips") == []


def test_voice_specialist_path_includes_convergence_metadata(monkeypatch):
    captured: dict = {}

    class SpecialistGateway:
        text = "Who was involved and what did adults do to keep everyone safe?"

    def _governed(**kwargs):
        captured.update(kwargs.get("metadata") or {})
        return SpecialistGateway()

    monkeypatch.setattr("services.orb_voice_respond_service.governed_draft_text", _governed)
    result = generate_voice_response(
        message="There was bullying between two residents in the home.",
        mode="incident_reflection",
        session_memory={},
    )
    assert result["brainTier"] == "voice_specialist"
    assert captured.get("brain_convergence") is True
    assert result.get("activeFinalDomains")
    assert isinstance(result.get("publicSourceChips"), list)


def test_prepare_write_uses_unified_gateway_brain_context():
    result = prepare_write_document(
        OrbDictatePrepareWriteRequest(
            note_type="daily_record",
            transcript="Young person settled after tea.",
            professional_note="Calm evening.",
        )
    )
    meta = result.brain_metadata or {}
    assert meta.get("unified_brain_gateway")
    assert meta.get("brain_decision_used_for_generation") is True
    convergence = meta.get("brain_convergence") or {}
    assert convergence.get("active_final_domains") is not None


def test_edit_dictate_uses_unified_gateway(monkeypatch):
    def _edit(**kwargs):
        return json.dumps(
            {
                "revised_text": "Revised factual note.",
                "change_summary": ["Applied therapeutic rewrite"],
                "warnings": [],
                "suggested_actions": [],
            }
        ), {
            "gateway_version": "orb-unified-brain-gateway-v1",
            "brain_metadata": {
                "unified_brain_gateway": "orb-unified-brain-gateway-v1",
                "brain_decision_used_for_generation": True,
                "brain_convergence": {"active_final_domains": ["child_story"]},
            },
        }

    monkeypatch.setattr(orb_unified_brain_gateway, "edit_dictate_draft", _edit)
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="Young person kicked off after tea.",
            note_type="daily_record",
            mode="therapeutic_rewrite",
        )
    )
    meta = result.brain_metadata or {}
    assert meta.get("unified_brain_gateway")
    assert meta.get("brain_decision_used_for_generation") is True
