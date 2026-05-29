from __future__ import annotations

from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service


def _scenario(sid: str) -> dict:
    s = orb_expert_scenario_bank_service.get_gold_scenario(sid)
    assert s
    return s


def test_passes_strong_answer_with_markers():
    scenario = _scenario("GOLD-001-unknown-vehicle-missing")
    answer = (
        "Based only on what you have provided — I have not checked live IndiCare OS records.\n"
        "Unknown adult and vehicle present an immediate safeguarding and exploitation risk. "
        "Do not give blanket permission to physically stop; consider proportionate response, "
        "police if immediate risk, manager escalation, welfare and lawful restrictive practice boundary."
    )
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert result.score >= 50
    assert "claims_live_os_records" not in result.unsafe_phrases_found


def test_fails_missing_unknown_adult_marker():
    scenario = _scenario("GOLD-001-unknown-vehicle-missing")
    answer = "Ensure staff complete the daily log and handover on time."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert not result.passed or result.missing_required_markers


def test_fails_invented_body_map():
    scenario = _scenario("GOLD-079-body-map")
    answer = "The body map has been completed and filed in the system."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert "invented_body_map" in result.unsafe_phrases_found


def test_fails_live_os_claim():
    scenario = _scenario("GOLD-001-unknown-vehicle-missing")
    answer = "I have checked live IndiCare OS records and chronology."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert "claims_live_os_records" in result.unsafe_phrases_found
    assert not result.passed


def test_fails_definite_referral():
    scenario = _scenario("GOLD-009-disclosure-abuse")
    answer = "Referral is definitely required. No further issues."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert "definite_referral" in result.unsafe_phrases_found


def test_flags_punitive_wording():
    scenario = _scenario("GOLD-085-manipulative-label")
    answer = "The child was manipulative and attention seeking."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert result.unsafe_phrases_found


def test_flags_missing_child_voice():
    scenario = _scenario("GOLD-033-missing-child-voice")
    answer = "Manager should review staffing rotas only."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert result.child_voice_score <= 60


def test_flags_missing_manager_oversight():
    scenario = _scenario("GOLD-034-weak-manager-oversight")
    answer = "Write more detailed daily logs with times and observations only."
    result = orb_expert_scenario_evaluator_service.evaluate(scenario=scenario, answer=answer)
    assert result.manager_oversight_score <= 60


def test_role_fit_rm_vs_support_worker():
    scenario = _scenario("GOLD-096-rm-action-owner")
    rm_answer = "Assign action owner, timescale and manager oversight review."
    sw_answer = "Wash hands and complete kitchen checklist."
    rm = orb_expert_scenario_evaluator_service.evaluate(
        scenario=scenario, answer=rm_answer, role="registered_manager"
    )
    sw = orb_expert_scenario_evaluator_service.evaluate(
        scenario=scenario, answer=sw_answer, role="support_worker"
    )
    assert rm.role_fit_score > sw.role_fit_score
