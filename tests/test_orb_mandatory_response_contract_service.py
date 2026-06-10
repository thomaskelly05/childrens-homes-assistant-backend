"""Tests for mandatory ORB response contracts and LADO routing."""

from __future__ import annotations

from services.orb_mandatory_response_contract_service import (
    MANDATORY_CONTRACTS,
    find_inappropriate_lado_reference,
    lado_appropriate_for_prompt,
    orb_mandatory_response_contract_service,
)


MISSING_RETURN_PROMPT = (
    "A young person has come back from missing for three days and smells of cannabis. What do I do?"
)
ALLEGATION_PROMPT = "A child says a staff member touched them inappropriately last night."
EXPLOITATION_PROMPT = "I am worried a young person is being exploited by older peers outside the home."


def test_missing_return_contract_excludes_default_lado():
    spec = MANDATORY_CONTRACTS["missing_return_substance_risk"]
    sections = " ".join(spec["mandatory_sections"]).lower()
    assert "lado only" in sections or "adult in a position of trust" in sections
    assert "immediate welfare" in sections
    assert "social worker" in sections or "placing authority" in sections


def test_lado_not_appropriate_for_missing_return_cannabis():
    assert lado_appropriate_for_prompt(MISSING_RETURN_PROMPT) is False


def test_lado_appropriate_for_staff_allegation():
    assert lado_appropriate_for_prompt(ALLEGATION_PROMPT) is True


def test_inappropriate_lado_in_missing_return_answer():
    answer = "Notify manager and consider LADO for exploitation risk."
    assert find_inappropriate_lado_reference(answer, MISSING_RETURN_PROMPT) is True


def test_lado_allowed_in_allegation_answer():
    answer = "Notify manager and LADO / designated officer under local procedure."
    assert find_inappropriate_lado_reference(answer, ALLEGATION_PROMPT) is False


def test_exploitation_answer_without_lado_is_valid():
    answer = (
        "Contact police and social worker. Record chronology. Manager oversight. "
        "Contextual safeguarding review."
    )
    assert find_inappropriate_lado_reference(answer, EXPLOITATION_PROMPT) is False


def test_allegation_contract_requires_lado_markers():
    validation = orb_mandatory_response_contract_service.validate_answer_markers(
        "Child safety first. Do not investigate. Notify manager and LADO / designated officer. Record exact words.",
        ["allegation_against_staff"],
        source_message=ALLEGATION_PROMPT,
    )
    assert validation["passed"] is True


def test_missing_return_marker_validation_flags_inappropriate_lado():
    validation = orb_mandatory_response_contract_service.validate_answer_markers(
        "Welfare check done. Missing procedure followed. LADO notified for cannabis smell.",
        ["missing_return_substance_risk"],
        source_message=MISSING_RETURN_PROMPT,
    )
    assert validation["passed"] is False
    result = validation["scenario_results"][0]
    assert result.get("inappropriate_lado") is True
