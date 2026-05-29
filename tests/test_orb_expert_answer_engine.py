from __future__ import annotations

from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_human_practice_brain_service import orb_human_practice_brain_service
from services.orb_source_registry_service import orb_source_registry_service


def test_missing_car_vape_cash_multi_family():
    msg = (
        "A child returned from missing, got out of a car, had money and a vape. "
        "Staff said they would not grass."
    )
    c = orb_expert_answer_engine_service.classify_scenario(msg)
    assert c["primary_family"] in ("missing_from_care", "unknown_adult_vehicle")
    secondary = c["secondary_families"]
    assert "missing_from_care" in [c["primary_family"]] + secondary
    assert "unknown_adult_vehicle" in secondary or "cse_concern" in secondary
    assert c["should_use_expert_engine"]


def test_restraint_arm_hurts_injury():
    msg = "We used restraint and held them. Their arm hurts — do we need a body map?"
    c = orb_expert_answer_engine_service.classify_scenario(msg)
    assert c["primary_family"] in ("physical_intervention", "restraint_injury_complaint")
    assert "restraint_injury_complaint" in [c["primary_family"]] + c["secondary_families"]


def test_poor_record_no_further_issues():
    msg = "The incident record says no further issues but the child was manipulative and attention seeking."
    c = orb_expert_answer_engine_service.classify_scenario(msg)
    families = [c["primary_family"]] + c["secondary_families"]
    assert "record_no_further_issues" in families or "opinion_based_record" in families


def test_level3_diploma_nvq():
    msg = "I'm on Level 3 diploma — how do I write a reflective account for this restraint criteria?"
    c = orb_expert_answer_engine_service.classify_scenario(msg)
    assert c["primary_family"] == "nvq_reflective_restraint"
    assert c["output_mode"] == "nvq_evidence_mapping"


def test_reg44_governance():
    msg = "I'm preparing for a Reg 44 visitor report — what triangulation should I show?"
    c = orb_expert_answer_engine_service.classify_scenario(msg)
    assert c["primary_family"] in ("reg44_triangulation", "reg44_action_not_closed")
    assert c["output_mode"] == "reg44_questions"


def test_support_worker_role_guidance():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        "Child missing overnight — what do I record?",
        profile_role="residential_support_worker",
    )
    assert packet["active"]
    assert "what to do now" in packet["answer_shape"].lower() or "record" in packet["role_guidance"].lower()


def test_rm_role_oversight_guidance():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        "Repeated restraint this week — what is my oversight?",
        profile_role="registered_manager",
    )
    assert packet["active"]
    assert "oversight" in packet["role_guidance"].lower() or "Oversight" in packet["role_guidance"]


def test_reg44_role_triangulation():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        "Reg 44 visit next week — reviewing the home before my visit, what triangulation should I ask?",
        profile_role="reg_44_visitor",
    )
    assert packet["active"]
    assert "triangulation" in packet["role_guidance"].lower() or "child voice" in packet["role_guidance"].lower()


def test_nvq_assessor_authenticity():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        "Learner reflective account on missing — is evidence authentic?",
        profile_role="nvq_assessor",
    )
    assert packet["active"]
    assert "authenticity" in packet["role_guidance"].lower() or "evidence" in packet["role_guidance"].lower()


def test_source_anchors_exist_in_registry():
    msg = "Child missing with unknown adult in a car"
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(msg)
    anchors = packet.get("source_anchors") or []
    assert anchors
    for item in anchors:
        sid = item.get("source_id")
        assert sid
        assert orb_source_registry_service.get_source(sid)


def test_self_check_missing_unknown_adult():
    msg = "Missing from care — unknown adult in a car with money"
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(msg)
    answer = "Complete the daily log and hand over on time."
    check = orb_expert_answer_engine_service.evaluate_answer_light(packet, answer)
    assert any("unknown" in w.lower() or "vehicle" in w.lower() for w in check.get("warnings", []))


def test_self_check_invented_body_map():
    msg = "Restraint yesterday — child's arm hurts"
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(msg)
    answer = "The body map has been completed and filed."
    check = orb_expert_answer_engine_service.evaluate_answer_light(packet, answer)
    assert "invented_body_map" in check.get("critical", []) or any(
        "invented_body_map" in w for w in check.get("warnings", [])
    )


def test_fast_greeting_skips_expert_packet():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet("hello")
    assert not packet.get("active")


def test_human_practice_brain_role_block_used_in_packet():
    packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        "Safeguarding concern after missing",
        profile_role="rm",
    )
    expected = orb_human_practice_brain_service.build_role_shaping_block("registered_manager")
    assert packet.get("role_guidance") == expected
