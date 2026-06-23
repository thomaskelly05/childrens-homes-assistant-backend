"""ORB final visible wording blocker fix — adult language, daily record shape, placeholders."""

from __future__ import annotations

import re

from assistant.knowledge.adult_identity_language import (
    apply_adult_identity_language,
    fix_broken_adult_heading_wording,
    reshape_routine_daily_record_chat_answer,
    sanitize_visible_final_answer,
    strip_self_harm_generic_fillers,
    user_requested_blank_template,
)
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
)
from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from services.orb_instant_first_lines_service import (
    instant_first_lines_for_message,
    merge_instant_lines_with_answer,
    strip_duplicate_instant_prefix,
)
from services.orb_provider_user_answer_service import sanitize_user_visible_provider_answer

BREAKFAST_DAILY_PROMPT = (
    "Help me write a daily record — calm breakfast, chose toast, watched TV before handover."
)
SELF_HARM_PROMPT = "Young person disclosed self-harm and said they want to die."
MEDICATION_REFUSAL_PROMPT = "A young person refused medication. What should we consider?"
COMMUNICATE_HOSPITAL_PROMPT = "Create a communication support pack for a hospital visit tomorrow."
SCHOOL_DSL_PROMPT = "The school DSL asked for chronology after an exclusion — what should we share?"


def test_no_how_the_adult_responded_after_identity_pass():
    raw = "Start with what happened, how staff responded, and what happened next."
    cleaned = apply_adult_identity_language(raw)
    assert "how The adult responded" not in cleaned
    assert "how staff responded" in cleaned.lower()


def test_no_specific_the_adult_interactions():
    raw = "Record specific staff interactions and how staff responded."
    broken = apply_adult_identity_language(raw.replace("staff interactions", "staff interactions").replace("staff responded", "staff responded"))
    broken = broken.replace("staff interactions", "the adult interactions").replace("how staff", "how The adult")
    fixed = fix_broken_adult_heading_wording(
        "Include specific the adult interactions and how The adult responded."
    )
    assert "specific the adult interactions" not in fixed
    assert "specific staff interactions" in fixed


def test_no_the_adult_present_or_actions_headings():
    raw = "## The adult Present\n## The adult Actions\nChild chose toast."
    fixed = fix_broken_adult_heading_wording(raw)
    assert "The adult Present" not in fixed
    assert "The adult Actions" not in fixed
    assert "Staff present" in fixed
    assert "Staff response" in fixed


def test_routine_daily_record_strips_form_template():
    form_like = """
Daily Record: [Date]
Young Person: [Name]
staff present: [Names of staff present]
Manager Review: [Manager's name]

The young person was calm.
"""
    reshaped = reshape_routine_daily_record_chat_answer(form_like, source_text=BREAKFAST_DAILY_PROMPT)
    lower = reshaped.lower()
    assert "daily record: [date]" not in lower
    assert "young person: [name]" not in lower
    assert "manager review" not in lower
    assert "here is a simple daily record draft" in lower
    assert "before saving" in lower
    assert "chose toast" in lower or "calm during breakfast" in lower


def test_routine_daily_record_keeps_blank_template_when_asked():
    prompt = "Give me a blank template for a daily record form to complete."
    assert user_requested_blank_template(prompt)
    form = "Daily Record: [Date]\nYoung Person: [Name]"
    assert "Daily Record: [Date]" in reshape_routine_daily_record_chat_answer(form, source_text=prompt)


def test_normal_chat_strips_default_placeholders():
    raw = (
        "Support [Name] during handover. Staff present: [Names of staff present]. "
        "Record at [Time] on [Date]."
    )
    cleaned = sanitize_visible_final_answer(raw, source_text="How should staff support a calm handover?")
    assert "[Name]" not in cleaned
    assert "[Date]" not in cleaned
    assert "[Time]" not in cleaned
    assert "[Names of staff present]" not in cleaned


def test_self_harm_keeps_safety_strips_generic_ending():
    raw = (
        "Stay with the young person. Inform the manager/on-call and follow the home's self-harm procedure. "
        "Record exact words. Call 999 if immediate risk remains. "
        "Always prioritise the young person's mental health and wellbeing in all circumstances."
    )
    cleaned = strip_self_harm_generic_fillers(raw, source_text=SELF_HARM_PROMPT)
    lower = cleaned.lower()
    assert "manager/on-call" in lower
    assert "exact words" in lower
    assert "always prioritise" not in lower


def test_medication_refusal_still_avoids_medication_error():
    raw = "Document the refusal. Consider whether this is a medication error."
    cleaned = sanitize_visible_final_answer(raw, source_text=MEDICATION_REFUSAL_PROMPT)
    assert not find_inappropriate_medication_error_reference(cleaned, source_text=MEDICATION_REFUSAL_PROMPT)


def test_allegation_no_default_dsl_outside_education():
    raw = "Notify the DSL immediately and preserve exact words."
    cleaned = sanitize_visible_final_answer(
        raw,
        source_text="A child says a staff member touched them inappropriately last night.",
    )
    assert not find_inappropriate_dsl_reference(cleaned, source_text="A child says a staff member touched them inappropriately last night.")
    assert not find_inappropriate_dsl_reference(
        sanitize_visible_final_answer(raw, source_text=SCHOOL_DSL_PROMPT),
        source_text=SCHOOL_DSL_PROMPT,
    )


def test_communicate_hospital_pack_still_topic_accurate():
    pack = orb_communicate_support_pack_service.build_support_pack_from_message(COMMUNICATE_HOSPITAL_PROMPT)
    formatted = orb_communicate_support_pack_service.format_support_pack_for_chat(pack)
    lower = formatted.lower()
    assert pack.intent == "hospital_appointment"
    assert "tomorrow you are going to hospital" in lower
    assert "contact with someone important" not in lower


def test_prelude_still_once_after_merge():
    prelude = instant_first_lines_for_message(BREAKFAST_DAILY_PROMPT).text
    body = f"{prelude}\n\nHere is a simple daily record draft:\nThe young person chose toast."
    merged = merge_instant_lines_with_answer(instant_lines=prelude, full_answer=strip_duplicate_instant_prefix(body, prelude))
    assert merged.lower().count("i'm treating this as a daily recording question") == 1


def test_repair_path_applies_visible_sanitizer():
    polluted = (
        "Daily Record: [Date]\nYoung Person: [Name]\n"
        "Include specific the adult interactions and how The adult responded."
    )
    answer, meta = repair_and_validate_final_answer(
        polluted,
        contract_family="daily_record",
        message=BREAKFAST_DAILY_PROMPT,
    )
    lower = answer.lower()
    assert "specific the adult interactions" not in lower
    assert "how the adult responded" not in lower
    assert meta.get("final_answer_validation_passed") is not None


def test_provider_polish_applies_visible_sanitizer():
    raw = "how The adult responded during breakfast. [Child's Name] chose toast."
    polished, issue = sanitize_user_visible_provider_answer(
        raw,
        provider="openai",
        source_text=BREAKFAST_DAILY_PROMPT,
    )
    assert issue is None
    assert "how The adult responded" not in polished
    assert "[Child's Name]" not in polished


def test_answer_preservation_for_clean_strong_answer():
    strong = (
        "Stay with the young person if there is immediate risk. "
        "Inform the manager/on-call and follow the home safeguarding procedure. "
        "Record exact words and observable facts."
    )
    cleaned = sanitize_visible_final_answer(strong, source_text=SELF_HARM_PROMPT)
    assert re.sub(r"\s+", " ", cleaned).strip() == re.sub(r"\s+", " ", strong).strip()
