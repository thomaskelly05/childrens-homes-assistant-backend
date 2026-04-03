from __future__ import annotations

from assistant.mode_detector import detect_mode
from assistant.safeguarding import (
    assess_safeguarding_level,
    detect_patterns,
    detect_safeguarding_patterns,
)


# =========================================================
# MODE DETECTOR TESTS
# =========================================================

def test_detect_mode_defaults_to_practical_for_empty_message():
    assert detect_mode("") == "practical"
    assert detect_mode("   ") == "practical"


def test_detect_mode_handover_from_direct_request():
    result = detect_mode("Please write a handover for the next shift.")
    assert result == "handover"


def test_detect_mode_incident_summary_from_direct_request():
    result = detect_mode("Please draft an incident report from this information.")
    assert result == "incident_summary"


def test_detect_mode_chronology_from_direct_request():
    result = detect_mode("Please create a chronology from these events.")
    assert result == "chronology"


def test_detect_mode_rewrite_from_direct_request():
    result = detect_mode("Please rewrite this in a more professional way.")
    assert result == "rewrite"


def test_detect_mode_factual_for_regulation_question():
    result = detect_mode("What do the children's homes regulations say about supervision frequency?")
    assert result == "factual"


def test_detect_mode_handover_from_keyword_match():
    result = detect_mode("What should I hand over to the next shift?")
    assert result == "handover"


def test_detect_mode_recording_from_keyword_match():
    result = detect_mode("Can you help me write this as a factual record?")
    assert result == "recording"


def test_detect_mode_incident_summary_from_keyword_match():
    result = detect_mode("Please summarise the incident for me.")
    assert result == "incident_summary"


def test_detect_mode_chronology_from_keyword_match():
    result = detect_mode("Put this in a chronology and sequence of events.")
    assert result == "chronology"


def test_detect_mode_support_planning_from_keyword_match():
    result = detect_mode("Help me build a support plan for this child.")
    assert result == "support_planning"


def test_detect_mode_manager_review_from_keyword_match():
    result = detect_mode("Audit this and tell me what Ofsted would think.")
    assert result == "manager_review"


def test_detect_mode_reflective_from_keyword_match():
    result = detect_mode("I am not sure I handled this well and want to reflect on it.")
    assert result == "reflective"


def test_detect_mode_priority_order_breaks_ties():
    # This contains signals for both factual and rewrite
    result = detect_mode("Can you improve this policy wording and tell me the regulation behind it?")
    assert result in {
        "factual",
        "rewrite",
    }


def test_detect_mode_practical_when_no_known_keywords():
    result = detect_mode("The young person was unsettled after tea and I need some help.")
    assert result == "practical"


def test_detect_mode_rewrite_regex_beats_other_matches():
    result = detect_mode("Please reword and improve this handover.")
    assert result == "rewrite"


# =========================================================
# SAFEGUARDING LEVEL TESTS
# =========================================================

def test_assess_safeguarding_level_defaults_to_normal_for_empty_message():
    assert assess_safeguarding_level("") == "normal"
    assert assess_safeguarding_level("   ") == "normal"


def test_assess_safeguarding_level_urgent_for_not_breathing():
    result = assess_safeguarding_level("The young person is not breathing.")
    assert result == "urgent"


def test_assess_safeguarding_level_urgent_for_unconscious():
    result = assess_safeguarding_level("The child is unconscious and staff called an ambulance.")
    assert result == "urgent"


def test_assess_safeguarding_level_urgent_for_severe_bleeding():
    result = assess_safeguarding_level("They are bleeding heavily after hurting themselves.")
    assert result == "urgent"


def test_assess_safeguarding_level_heightened_for_self_harm():
    result = assess_safeguarding_level("The young person has been self harming.")
    assert result == "heightened"


def test_assess_safeguarding_level_heightened_for_missing_from_home():
    result = assess_safeguarding_level("The child has gone missing from home.")
    assert result == "heightened"


def test_assess_safeguarding_level_heightened_for_staff_allegation():
    result = assess_safeguarding_level("The child said staff hurt them.")
    assert result == "heightened"


def test_assess_safeguarding_level_heightened_for_exploitation():
    result = assess_safeguarding_level("There are concerns about criminal exploitation and county lines.")
    assert result == "heightened"


def test_assess_safeguarding_level_watchful_for_bruise():
    result = assess_safeguarding_level("The young person has an unexplained bruise.")
    assert result == "watchful"


def test_assess_safeguarding_level_watchful_for_distress():
    result = assess_safeguarding_level("The child has been tearful, withdrawn and upset all evening.")
    assert result == "watchful"


def test_assess_safeguarding_level_normal_for_non_safeguarding_text():
    result = assess_safeguarding_level("Please help me improve this handover wording.")
    assert result == "normal"


def test_assess_safeguarding_level_can_use_history():
    history = [
        {"message": "The child disclosed something upsetting yesterday."},
        {"message": "Staff are worried there may be a safeguarding concern."},
    ]
    result = assess_safeguarding_level("I need help writing this up.", history=history)
    assert result in {"watchful", "heightened", "urgent"}


def test_assess_safeguarding_level_urgent_beats_heightened():
    result = assess_safeguarding_level(
        "The child is suicidal, not breathing, and staff have called an ambulance."
    )
    assert result == "urgent"


# =========================================================
# PATTERN DETECTION TESTS
# =========================================================

def test_detect_safeguarding_patterns_returns_empty_for_no_text():
    assert detect_safeguarding_patterns([]) == []
    assert detect_safeguarding_patterns(["", "   "]) == []


def test_detect_safeguarding_patterns_finds_aggression_theme():
    results = detect_safeguarding_patterns(
        [
            "The young person hit staff and kicked the door.",
            "There was more aggression today and threats towards peers.",
        ]
    )

    themes = [item["theme"] for item in results]
    assert "aggression" in themes


def test_detect_safeguarding_patterns_finds_missing_theme():
    results = detect_safeguarding_patterns(
        [
            "The child ran away from home yesterday.",
            "Another missing from home episode happened this week.",
        ]
    )

    themes = [item["theme"] for item in results]
    assert "missing_from_home" in themes


def test_detect_safeguarding_patterns_finds_self_harm_theme():
    results = detect_safeguarding_patterns(
        [
            "The young person has been cutting.",
            "There is repeated self-harm language in recent notes.",
        ]
    )

    themes = [item["theme"] for item in results]
    assert "self_harm" in themes


def test_detect_safeguarding_patterns_finds_emotional_distress_theme():
    results = detect_safeguarding_patterns(
        [
            "The child appeared distressed and withdrawn.",
            "They were tearful and anxious after contact.",
        ]
    )

    themes = [item["theme"] for item in results]
    assert "emotional_distress" in themes


def test_detect_safeguarding_patterns_sorts_highest_count_first():
    results = detect_safeguarding_patterns(
        [
            "The child was distressed and tearful.",
            "They remained distressed and anxious.",
            "There was one bruise noted on the arm.",
        ]
    )

    assert isinstance(results, list)
    if len(results) >= 2:
        assert results[0]["count"] >= results[1]["count"]


def test_detect_patterns_backwards_compatibility_alias():
    results = detect_patterns(
        [
            "The child was distressed and tearful.",
            "The child remained distressed and withdrawn.",
        ]
    )

    assert isinstance(results, list)
    assert any(item["theme"] == "emotional_distress" for item in results)


# =========================================================
# REAL-WORLD SAFETY REGRESSION TESTS
# =========================================================

def test_real_world_case_medical_emergency_is_urgent():
    message = (
        "A young person collapsed in the bathroom, is not breathing properly, "
        "and staff have called an ambulance."
    )
    assert assess_safeguarding_level(message) == "urgent"


def test_real_world_case_missing_child_is_heightened():
    message = (
        "The young person absconded after school and is currently missing from home."
    )
    assert assess_safeguarding_level(message) == "heightened"


def test_real_world_case_unexplained_injury_is_watchful_or_higher():
    message = (
        "Staff noticed an unexplained mark and bruise on the young person's upper arm."
    )
    assert assess_safeguarding_level(message) in {"watchful", "heightened", "urgent"}


def test_real_world_case_recording_request_detects_recording_mode():
    message = (
        "Can you help me write this as a factual record for the daily log?"
    )
    assert detect_mode(message) == "recording"


def test_real_world_case_manager_audit_detects_manager_review():
    message = (
        "Please audit this incident and tell me what a manager would want followed up."
    )
    assert detect_mode(message) == "manager_review"
