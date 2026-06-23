"""ORB Live RM polish pass — residential language, medication refusal, communicate pack."""

from __future__ import annotations

from assistant.knowledge.adult_identity_language import (
    is_low_risk_daily_recording,
    replace_clunky_placeholders,
    sanitize_residential_answer_polish,
    strip_disproportionate_safety_opening,
)
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
    is_medication_refusal_prompt,
    sanitize_medication_error_wording,
)
from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service
from services.orb_final_answer_repair_service import (
    repair_and_validate_final_answer,
    repair_communicate_support_pack,
)
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_therapeutic_language_contract_service import build_safe_residential_scenario_scaffold
from services.orb_universal_answer_contract_map_service import detect_contract_family

COMMUNICATE_PACK_PROMPT = (
    "Create a communication support pack to explain to a young person with autism "
    "that contact has changed."
)
MEDICATION_REFUSAL_PROMPT = "A young person refused medication. What should we consider?"
MEDICATION_ERROR_PROMPT = "We made a medication error and gave the wrong dose — what should staff record?"
REFUSED_BREAKFAST_PROMPT = "Help me record a daily note — young person refused breakfast and had a difficult morning."
SCHOOL_DSL_PROMPT = "The school DSL asked for chronology after an exclusion — what should we share?"
ALLEGATION_PROMPT = "A child says a staff member touched them inappropriately last night."


def test_allegation_answer_has_no_default_dsl_after_polish():
    raw = "Notify the DSL immediately and preserve exact words."
    polished = sanitize_residential_answer_polish(raw, source_text=ALLEGATION_PROMPT)
    assert not find_inappropriate_dsl_reference(polished, source_text=ALLEGATION_PROMPT)


def test_school_dsl_allowed_in_education_context():
    raw = "Share chronology with the school DSL under local partnership arrangements."
    assert not find_inappropriate_dsl_reference(raw, source_text=SCHOOL_DSL_PROMPT)


def test_medication_refusal_sanitizer_removes_error_framing():
    raw = (
        "Record on the MAR and review the handover system so the error is not repeated. "
        "This may be a medication error."
    )
    cleaned = sanitize_medication_error_wording(raw, source_text=MEDICATION_REFUSAL_PROMPT)
    assert not find_inappropriate_medication_error_reference(cleaned, source_text=MEDICATION_REFUSAL_PROMPT)


def test_medication_error_prompt_keeps_error_closer():
    closer = orb_grounded_answer_style_service._topic_closer("medication", message=MEDICATION_ERROR_PROMPT)
    assert closer is not None
    assert "error is not repeated" in closer.lower()


def test_medication_refusal_prompt_gets_refusal_closer():
    assert is_medication_refusal_prompt(MEDICATION_REFUSAL_PROMPT)
    closer = orb_grounded_answer_style_service._topic_closer("medication", message=MEDICATION_REFUSAL_PROMPT)
    assert closer is not None
    assert "do not coerce" in closer.lower()
    assert "error is not repeated" not in closer.lower()


def test_refused_breakfast_is_low_risk_daily_recording():
    assert is_low_risk_daily_recording(REFUSED_BREAKFAST_PROMPT)


def test_refused_breakfast_scaffold_starts_with_recording_not_emergency_safety():
    scaffold = build_safe_residential_scenario_scaffold(REFUSED_BREAKFAST_PROMPT)
    opening = scaffold.splitlines()[0].lower()
    assert "check everyone" not in opening
    assert "what happened" in opening or "record" in opening


def test_strip_disproportionate_safety_opening_for_daily_record():
    raw = "First, check everyone is safe.\n\nRecord what happened at breakfast."
    cleaned = strip_disproportionate_safety_opening(raw, source_text=REFUSED_BREAKFAST_PROMPT)
    assert "check everyone" not in cleaned.lower()
    assert "breakfast" in cleaned.lower()


def test_clunky_placeholders_replaced():
    raw = "[Young Person's Name] told [Staff Names]: [Direct quote if available]"
    cleaned = replace_clunky_placeholders(raw)
    assert "[Young Person" not in cleaned
    assert "[Staff Names]" not in cleaned
    assert "the young person" in cleaned
    assert "staff" in cleaned
    assert "exact words where known" in cleaned


def test_communicate_support_pack_prompt_routes_contract_family():
    assert detect_contract_family(COMMUNICATE_PACK_PROMPT) == "communicate_support_pack"


def test_communicate_support_pack_returns_actual_sections():
    answer = repair_communicate_support_pack("", message=COMMUNICATE_PACK_PROMPT)
    for heading in (
        "## Easy-read explanation",
        "## Visual card suggestions",
        "## Staff delivery guidance",
        "## Reflect and record prompts",
        "## Reflective record starter",
        "## Safety boundaries",
    ):
        assert heading in answer
    assert "you could create a pack" not in answer.lower()


def test_communicate_support_pack_repair_preserves_source_chips():
    answer, meta = repair_and_validate_final_answer(
        "You could create a communication support pack with simple words.",
        contract_family="communicate_support_pack",
        message=COMMUNICATE_PACK_PROMPT,
    )
    assert "## Easy-read explanation" in answer
    assert meta.get("selected_contract") is None or meta.get("final_answer_validation_passed") is not None
    assert "contact" in answer.lower()


def test_generic_residential_endings_stripped():
    raw = "Staff offered toast. By following these guidelines, this approach ensures a comprehensive account."
    cleaned = sanitize_residential_answer_polish(raw, source_text=REFUSED_BREAKFAST_PROMPT)
    assert "by following these guidelines" not in cleaned.lower()
    assert "comprehensive account" not in cleaned.lower()
