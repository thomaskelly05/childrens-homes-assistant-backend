"""Tests for therapeutic final-answer guard, repair and explainability."""

from __future__ import annotations

from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_brain_visibility_service import sanitize_orb_brain_metadata_for_user
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_final_answer_contract_validator_service import validate_final_answer_contract
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from services.orb_therapeutic_language_contract_service import (
    apply_deterministic_therapeutic_repairs,
    build_convert_to_recording_scaffold,
    find_judgemental_phrases,
)
from services.orb_universal_answer_contract_map_service import sanitize_final_answer
from services.orb_universal_response_contract_service import orb_universal_response_contract_service


JUDGEMENTAL_DAILY = "He was attention seeking and naughty all evening after contact."
SAFEGUARDING_INCIDENT = (
    "The young person disclosed sexual abuse. Staff notified the manager immediately. "
    "Police and social worker were contacted. Injury was not observed but harm was taken seriously."
)
AUTISM_REFUSAL = (
    "The young person found it difficult to attend school due to sensory overwhelm. "
    "Staff remained curious about triggers and supported regulation with a quiet space."
)
ATTENTION_SEEKING_PROMPT = (
    "Convert this to recording wording: Jamie was attention seeking all night and refused to listen."
)
BAD_SCAFFOLD = (
    "Jamie displayed behaviours that appeared to seek attention and refused to listen throughout the night."
)


def test_judgemental_phrases_fail_validation():
    result = validate_final_answer_contract(
        JUDGEMENTAL_DAILY,
        contract_family="daily_record",
    )
    assert result["passed"] is False
    assert result["therapeutic_validation"]["judgemental_phrases"]
    assert result["repair_reason"] == "therapeutic_language"


def test_judgemental_phrases_repaired_deterministically():
    repaired, meta = repair_and_validate_final_answer(
        JUDGEMENTAL_DAILY,
        contract_family="daily_record",
        message="Convert to recording wording",
    )
    assert meta["answer_repaired"] is True
    assert meta.get("repair_reason") == "therapeutic_language"
    assert "attention seeking" not in repaired.lower()
    assert "naughty" not in repaired.lower()


def test_seek_attention_wording_forbidden():
    phrases = find_judgemental_phrases("behaviours that appeared to seek attention")
    assert "seek_attention" in phrases or "appeared_to_seek_attention" in phrases
    repaired, _ = apply_deterministic_therapeutic_repairs(BAD_SCAFFOLD)
    assert "seek attention" not in repaired.lower()
    assert "refused to listen" not in repaired.lower()


def test_convert_to_recording_scaffold_uses_observable_behaviour():
    scaffold = build_convert_to_recording_scaffold(ATTENTION_SEEKING_PROMPT)
    recording_section = scaffold.split("Recording wording scaffold:")[1].split("Include:")[0].lower()
    assert "jamie" in recording_section
    assert "observed to" in recording_section
    assert "staff remained curious" in recording_section
    assert "seek attention" not in recording_section
    assert "attention seeking" not in recording_section
    assert "refused to listen" not in recording_section


def test_convert_to_recording_deterministic_path_avoids_openai():
    det = orb_execution_policy_service.try_deterministic_answer(ATTENTION_SEEKING_PROMPT)
    assert det is not None
    assert det.get("no_llm") is True
    assert "seek attention" not in det["answer"].lower()


def test_safeguarding_language_not_softened():
    result = validate_final_answer_contract(
        SAFEGUARDING_INCIDENT,
        contract_family="abuse_disclosure",
    )
    assert "sexual" in SAFEGUARDING_INCIDENT.lower()
    assert result["therapeutic_validation"]["safeguarding_clarity_preserved"] is True


def test_autism_prompt_avoids_defiance_framing():
    result = validate_final_answer_contract(
        AUTISM_REFUSAL,
        contract_family="daily_record",
    )
    assert "defiant" not in AUTISM_REFUSAL.lower()
    assert result["therapeutic_validation"]["passed"] is True


def test_sanitize_final_answer_applies_therapeutic_repairs():
    sanitized = sanitize_final_answer("He kicked off and was manipulative.")
    assert "kicked off" not in sanitized.lower()
    assert "manipulative" not in sanitized.lower()


def test_incident_canonical_includes_co_regulation_and_repair():
    from services.orb_final_answer_repair_service import CANONICAL_QA_ANSWERS

    answer = CANONICAL_QA_ANSWERS["incident_record"]
    lowered = answer.lower()
    assert "de-escalation" in lowered or "staff" in lowered
    assert "repair" in lowered


def test_missing_return_avoids_blame_wording():
    from services.orb_final_answer_repair_service import CANONICAL_QA_ANSWERS

    answer = CANONICAL_QA_ANSWERS["missing_return_record"]
    assert "blame" not in answer.lower() or "do not accuse" in answer.lower()
    assert "welfare" in answer.lower()
    assert "lado" not in answer.lower() or "only" in answer.lower()


def test_normal_users_cannot_see_repair_telemetry():
    context = {
        "answer_repaired": True,
        "repair_reason": "therapeutic_language",
        "final_answer_repair_applied": True,
        "execution_policy": "deterministic_only",
    }
    staff_view = sanitize_orb_brain_metadata_for_user(context, {"role": "staff"})
    assert "repair_reason" not in staff_view
    assert "execution_policy" not in staff_view
    admin_view = sanitize_orb_brain_metadata_for_user(context, {"role": "founder"})
    assert admin_view.get("repair_reason") == "therapeutic_language"


def test_public_explainability_includes_therapeutic_labels():
    labels = orb_universal_response_contract_service.public_considerations_for(
        contract_family="daily_record",
        active_brains=["therapeutic_language_brain", "recording_quality_brain"],
    )
    assert "Therapeutic language" in labels
    assert "Child-centred recording" in labels
    assert "active_brains" not in " ".join(labels)


def test_finalize_standalone_records_therapeutic_repair_telemetry():
    judgemental_answer = "He was attention seeking on shift."
    packet = {"version": "test", "expert_depth": "residential_standard"}
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer=judgemental_answer,
        prompt_text="Help me write a daily note",
        message="Help me write a daily note",
        record_learning=False,
        apply_gate_fixes=False,
    )
    assert "attention seeking" not in answer.lower()
    assert meta.get("answer_repaired") is True
    assert meta.get("repair_reason") == "therapeutic_language"


def test_simple_replacement_avoids_openai():
    repaired, applied = apply_deterministic_therapeutic_repairs("She was being difficult and kicked off.")
    assert applied
    policy = orb_execution_policy_service.resolve("Help me write a daily note")
    assert policy.openai_allowed is False
