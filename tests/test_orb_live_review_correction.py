"""ORB Residential live human-review correction pass — adult identity, headings, therapeutic wording."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from assistant.evals.orb_high_risk_scaffold import build_child_centred_scaffold, build_quality_lab_scaffold
from assistant.knowledge.adult_identity_language import (
    apply_adult_identity_language,
    build_adult_identity_prompt_block,
    contains_generic_staff_with_initials,
    count_content_sections,
    extract_supplied_adult_initials,
    has_safeguarding_cue,
    headings_for_record_context,
    is_daily_record_request,
    is_incident_record_request,
    is_record_generation_request,
    is_self_commentary_paragraph,
    normalize_duplicate_daily_record_headings,
    repair_record_sentence_boundaries,
    sanitize_childrens_home_terminology,
    sanitize_live_record_output,
    sanitize_observation_interpretation_language,
    strip_child_quote_interpretation,
    strip_end_of_record_artefacts,
    strip_interpretive_feelings_phrases,
    strip_invented_emotional_impact,
    strip_outcome_interpretation,
    strip_redundant_next_steps_in_daily_record,
    strip_repeated_observed_outcome,
    strip_trailing_markdown_artefacts,
    strip_trailing_self_commentary,
    strip_unnecessary_follow_up_section,
    strip_unsupported_timeline_expansion,
    user_explicitly_requests_explanation,
    user_provided_dsl_term,
    user_requested_end_marker,
)
from assistant.knowledge.orb_residential_principles import CANONICAL_PRINCIPLES, validate_principle_alignment
from assistant.prompts import _build_output_discipline_block, _build_recording_excellence_block
from services.orb_therapeutic_language_contract_service import (
    build_therapeutic_language_contract_block,
    is_self_commentary_paragraph as service_self_commentary,
)

DAILY_RECORD_PROMPT = (
    "Create a daily record from the following rough notes. Keep it factual, warm, child-centred "
    "and suitable for a children's home record.\n\n"
    "Child A came back from school quieter than usual. They went straight to their room and did not want dinner. "
    "Staff gave them space and checked in later. Child A said, 'I'm just annoyed about school.' "
    "Staff offered toast and sat nearby while Child A watched TV. Child A ate toast and appeared calmer before bedtime. "
    "Staff handed over that tomorrow's shift should check in gently about school if Child A wants to talk."
)

DAILY_RECORD_WITH_INITIALS = (
    "Create a daily record. Adult TK gave Child A space. Adult JS checked in later. "
    "Child A said they were annoyed about school and appeared calmer before bedtime."
)

INCIDENT_PROMPT = "Create an incident reflection from these notes: Child A became distressed after contact."

SELF_COMMENTARY_BAD = (
    "Daily Record\n\nChild A appeared quieter after school.\n\n"
    "This record maintains a factual, child-centred approach and uses therapeutic language throughout."
)

SELF_COMMENTARY_GOOD = "Daily Record\n\nChild A appeared quieter after school."

EXPLANATION_REQUEST = "Why is this daily record wording better than my rough notes?"

MANUAL_REGRESSION_DAILY_RECORD_PROMPT = (
    "Create a daily record. Keep it factual, warm, therapeutic, child-centred and suitable for a children's home record.\n\n"
    "Child A came back quieter after school. Adult TK gave Child A space. Adult JS checked in later. "
    "Child A said, \"I'm just annoyed about school.\" Adult JS offered toast and sat nearby while Child A watched TV. "
    "Child A ate the toast and appeared calmer before bedtime. Adult TK handed over that tomorrow's adults should "
    "check in gently about school if Child A wishes to talk."
)


@pytest.fixture
def framework() -> dict:
    path = Path("assistant/knowledge/orb_recording_framework.json")
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture
def daily_scenario() -> dict:
    return {
        "scenario_id": "live_review_daily",
        "title": "Daily record after difficult school day",
        "record_type": "daily_record",
        "scenario_family": "daily_care",
        "input": (
            "Child A came back from school quieter than usual. They went straight to their room and did not want dinner. "
            "Staff gave them space and checked in later. Child A said, 'I'm just annoyed about school.' "
            "Staff offered toast and sat nearby while Child A watched TV. Child A ate toast and appeared calmer before bedtime."
        ),
    }


def test_canonical_principles_include_live_review_discipline():
    assert "adult_identity" in CANONICAL_PRINCIPLES
    assert "childrens_home_safeguarding_terminology" in CANONICAL_PRINCIPLES
    assert "daily_record_proportionality" in CANONICAL_PRINCIPLES
    assert "daily_record_output_discipline" in CANONICAL_PRINCIPLES
    assert "record_only_output" in CANONICAL_PRINCIPLES
    assert "child_voice_discipline" in CANONICAL_PRINCIPLES
    assert "emotional_impact_discipline" in CANONICAL_PRINCIPLES
    assert "outcome_interpretation_discipline" in CANONICAL_PRINCIPLES
    assert "duplicate_heading_discipline" in CANONICAL_PRINCIPLES
    assert "repeated_outcome_discipline" in CANONICAL_PRINCIPLES
    assert "end_of_record_discipline" in CANONICAL_PRINCIPLES
    assert "daily_record_simplification" in CANONICAL_PRINCIPLES
    assert "record_heading_discipline" in CANONICAL_PRINCIPLES
    assert "self_commentary" in CANONICAL_PRINCIPLES
    assert "do not default to 'staff'" in CANONICAL_PRINCIPLES["adult_identity"].lower()
    assert "dsl" in CANONICAL_PRINCIPLES["childrens_home_safeguarding_terminology"].lower()


def test_framework_wording_discipline_includes_adult_identity_and_headings(framework: dict):
    bullets = " ".join(framework["residential_recording_structure"]["wording_discipline"]).lower()
    assert "do not default to 'staff'" in bullets
    assert "do not default to dsl" in bullets
    assert "staff on duty" in bullets
    assert "safeguarding note" in bullets
    assert "incident summary" in bullets
    assert "self-assessment" in bullets or "self-commentary" in bullets.replace(" ", "-")
    assert "appeared calmer" in bullets


def test_daily_record_framework_headings_not_incident_summary(framework: dict):
    daily = next(row for row in framework["record_types"] if row["id"] == "daily_record")
    headings = " ".join(daily["final_document_headings"]).lower()
    assert "daily record" in headings
    assert "adult response" in headings
    assert "incident summary" not in headings


def test_prompt_blocks_include_adult_identity_and_no_self_commentary():
    recording = _build_recording_excellence_block().lower()
    output = _build_output_discipline_block().lower()
    adult_block = build_adult_identity_prompt_block().lower()
    assert "do not default to" in recording and "staff" in recording
    assert "do not default to dsl" in recording
    assert "staff on duty" in recording
    assert "self-assessment" in output or "self-commentary" in output.replace(" ", "-")
    assert "adult tk" in adult_block
    assert "incident summary" in adult_block
    assert "children's home safeguarding" in adult_block or "childrens home safeguarding" in adult_block.replace("'", "")


def test_therapeutic_contract_daily_headings_use_daily_record_discipline():
    daily_block = build_therapeutic_language_contract_block(prompt_text=DAILY_RECORD_PROMPT).lower()
    incident_block = build_therapeutic_language_contract_block(prompt_text=INCIDENT_PROMPT).lower()
    assert "daily record" in daily_block
    assert "presentation and support" in daily_block
    assert "do not use incident summary" in daily_block
    assert "recording language warning" in incident_block or "brief summary" in incident_block


def test_is_daily_and_incident_request_detection():
    assert is_daily_record_request(DAILY_RECORD_PROMPT)
    assert not is_incident_record_request(DAILY_RECORD_PROMPT)
    assert is_incident_record_request(INCIDENT_PROMPT)
    assert headings_for_record_context(prompt_text=DAILY_RECORD_PROMPT)[0] == "Daily Record"
    assert "Incident" in headings_for_record_context(prompt_text=INCIDENT_PROMPT)[0]


def test_adult_identity_without_invented_initials():
    rough = "Staff gave Child A space and checked in later."
    cleaned = apply_adult_identity_language(rough)
    assert "Adult TK" not in cleaned
    assert "Adult JS" not in cleaned
    assert re.search(r"\bthe adult\b", cleaned, re.I)


def test_adult_identity_retains_supplied_initials():
    rough = "Adult TK gave Child A space. Adult JS checked in later."
    initials = extract_supplied_adult_initials(rough)
    assert initials == ["TK", "JS"]
    mixed = "Staff offered toast after Adult TK gave space. Staff checked in later."
    cleaned = apply_adult_identity_language(mixed, supplied_initials=initials)
    assert "Adult TK" in cleaned
    assert "Adult JS" in cleaned
    assert "Staff" not in cleaned
    assert not contains_generic_staff_with_initials(cleaned, supplied_initials=initials)


def test_staff_on_duty_is_not_generated():
    rough = "Staff on Duty: Adult TK, Adult JS"
    cleaned = apply_adult_identity_language(rough, supplied_initials=["TK", "JS"])
    assert "Staff on Duty" not in cleaned
    assert "Adults involved" in cleaned


def test_dsl_not_used_by_default_in_residential_output():
    source = "Child A came back quieter after school. Manager informed."
    output = sanitize_childrens_home_terminology("DSL informed and pathway to DSL followed.", source_text=source)
    assert "DSL" not in output
    assert "manager" in output.lower()


def test_dsl_preserved_when_user_provided_term():
    source = "Young person disclosed concern. DSL informed per local policy."
    output = sanitize_childrens_home_terminology("DSL informed and recorded.", source_text=source)
    assert "DSL" in output
    assert user_provided_dsl_term(source)


def test_daily_record_scaffold_without_dsl_when_not_in_input(daily_scenario: dict):
    output = build_child_centred_scaffold(daily_scenario)
    assert "DSL" not in output
    assert "Safeguarding Note" not in output
    assert "Staff on Duty" not in output
    assert "Next Steps" not in output


def test_daily_record_scaffold_no_safeguarding_note_without_cue(daily_scenario: dict):
    assert not has_safeguarding_cue(daily_scenario["input"])
    output = build_child_centred_scaffold(daily_scenario)
    assert "safeguarding note" not in output.lower()


def test_observation_sanitization_seemed_more_relaxed():
    text = "Child A seemed more relaxed by evening."
    cleaned = sanitize_observation_interpretation_language(text)
    assert "seemed more relaxed" not in cleaned.lower()
    assert "appeared calmer" in cleaned.lower()


def test_observation_interpretation_sanitization():
    text = "By evening mood improved and Child A seemed relaxed."
    cleaned = sanitize_observation_interpretation_language(text)
    assert "mood improved" not in cleaned.lower()
    assert "seemed relaxed" not in cleaned.lower()
    assert "appeared calmer" in cleaned.lower()
    assert "appeared more settled" not in cleaned.lower()


def test_child_quote_preserved_in_sanitized_output():
    source = "Child A said, 'I'm just annoyed about school.' Staff sat nearby."
    output = sanitize_live_record_output(
        "Child A said, 'I'm just annoyed about school.' The adult sat nearby.",
        source_text=source,
    )
    assert "I'm just annoyed about school." in output


def test_self_commentary_detection():
    assert is_self_commentary_paragraph(SELF_COMMENTARY_BAD)
    assert service_self_commentary(SELF_COMMENTARY_BAD)
    assert not is_self_commentary_paragraph(SELF_COMMENTARY_GOOD)
    assert user_explicitly_requests_explanation(EXPLANATION_REQUEST)


def test_daily_scaffold_uses_daily_headings_not_incident_summary(daily_scenario: dict):
    output = build_child_centred_scaffold(daily_scenario)
    lowered = output.lower()
    assert "incident summary" not in lowered
    assert "presentation and support" in lowered
    assert "adult response" in lowered
    assert "outcome / handover" in lowered
    assert "i'm just annoyed about school." in lowered
    assert count_content_sections(output) <= 3


def test_daily_scaffold_prefers_the_adult_over_staff_default(daily_scenario: dict):
    output = build_child_centred_scaffold(daily_scenario)
    assert "Staff gave" not in output
    assert re.search(r"\bthe adult\b", output, re.I)


def test_daily_scaffold_with_initials_uses_adult_labels_consistently():
    scenario = {
        "scenario_id": "live_review_daily_initials",
        "title": "Daily record with adult initials",
        "record_type": "daily_record",
        "scenario_family": "daily_care",
        "input": DAILY_RECORD_WITH_INITIALS + " Staff handed over to next shift.",
    }
    output = build_child_centred_scaffold(scenario)
    assert "Adult TK" in output
    assert "Adult JS" in output
    assert "Staff" not in output
    assert "Staff on Duty" not in output


def test_safeguarding_scaffold_still_has_pathway_language():
    scenario = {
        "scenario_id": "live_review_safeguarding",
        "title": "Online exploitation concern",
        "record_type": "safeguarding_concern",
        "scenario_family": "safeguarding",
        "input": (
            "Young person received messages from unknown adult online. "
            "Manager informed immediately. Device secured per policy."
        ),
        "safeguarding_flags": ["escalation_required"],
        "regulatory_context": ["safeguarding"],
    }
    output = build_quality_lab_scaffold(scenario).lower()
    assert "pathway" in output
    assert "manager" in output
    assert "local safeguarding" in output or "safeguarding procedure" in output


def test_daily_scaffold_routine_not_over_escalated(daily_scenario: dict):
    output = build_child_centred_scaffold(daily_scenario).lower()
    assert "must escalate" not in output
    assert "dsl pathway required" not in output
    assert "## pathway to consider" not in output


def test_sanitize_live_output_applies_full_discipline():
    source = DAILY_RECORD_WITH_INITIALS
    rough = (
        "## Safeguarding Note\n\nStaff on Duty. Child A seemed more relaxed. "
        "DSL informed. Staff handed over."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "Safeguarding Note" not in cleaned
    assert "Staff on Duty" not in cleaned
    assert "seemed more relaxed" not in cleaned.lower()
    assert "DSL" not in cleaned
    assert "Staff" not in cleaned


def test_daily_scaffold_avoids_mood_improved_when_input_says_appeared_calmer(daily_scenario: dict):
    output = build_child_centred_scaffold(daily_scenario).lower()
    assert "mood improved" not in output
    assert "appeared calmer" in output


def test_incident_scaffold_can_still_use_incident_structure():
    scenario = {
        "scenario_id": "live_review_incident",
        "title": "Incident reflection after contact",
        "record_type": "incident_report",
        "scenario_family": "incident_reflection",
        "input": "Child A became distressed after contact. Staff offered space and de-escalated.",
    }
    output = build_quality_lab_scaffold(scenario).lower()
    assert "incident" in output or "what happened" in output
    assert "incident summary" not in output or "brief summary" in output


def test_handover_scenario_heading_remains_appropriate():
    scenario = {
        "scenario_id": "live_review_handover",
        "title": "Handover after difficult school day",
        "record_type": "handover",
        "scenario_family": "handover",
        "input": "Child A quieter after school. Next shift to check in gently if Child A wishes to talk.",
    }
    output = build_child_centred_scaffold(scenario)
    assert "handover" in output.lower()


def test_principle_alignment_still_valid():
    assert validate_principle_alignment() == []


def test_record_generation_request_detection():
    assert is_record_generation_request(DAILY_RECORD_PROMPT)
    assert is_record_generation_request(INCIDENT_PROMPT)
    assert is_record_generation_request(MANUAL_REGRESSION_DAILY_RECORD_PROMPT)
    assert is_record_generation_request("Turn these rough notes into a daily record")


def test_strip_trailing_self_commentary_from_daily_record():
    source = DAILY_RECORD_WITH_INITIALS
    rough = (
        "Daily Record\n\nChild A appeared quieter after school.\n\n"
        "This record captures the child's experience in a factual, child-centred way."
    )
    cleaned = strip_trailing_self_commentary(rough, source_text=source)
    assert "This record captures" not in cleaned
    assert "Child A appeared quieter" in cleaned


def test_self_commentary_preserved_when_user_asks_why():
    rough = SELF_COMMENTARY_BAD
    cleaned = strip_trailing_self_commentary(rough, source_text=EXPLANATION_REQUEST)
    assert "This record maintains" in cleaned


def test_sanitize_live_output_strips_self_commentary_after_record():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Daily Record\n\nChild A said, \"I'm just annoyed about school.\" Adult JS remained nearby.\n\n"
        "This record captures the child's experience and maintains therapeutic wording."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "This record captures" not in cleaned
    assert "I'm just annoyed about school." in cleaned


def test_strip_child_quote_interpretation_in_simple_daily_record():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        'Child A said, "I\'m just annoyed about school." '
        "This indicates some frustration or dissatisfaction regarding their school experience."
    )
    cleaned = strip_child_quote_interpretation(rough, source_text=source)
    assert "I'm just annoyed about school." in cleaned
    assert "this indicates" not in cleaned.lower()
    assert "dissatisfaction" not in cleaned.lower()
    assert "frustration" not in cleaned.lower()


def test_direct_child_quote_preserved_exactly():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    quote = 'Child A said, "I\'m just annoyed about school."'
    cleaned = sanitize_live_record_output(quote, source_text=source)
    assert cleaned == quote


def test_strip_invented_emotional_impact_without_source_support():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Adult JS remained nearby without placing pressure on Child A to speak, "
        "allowing Child A to feel safe and comfortable."
    )
    cleaned = strip_invented_emotional_impact(rough, source_text=source)
    assert "feel safe and comfortable" not in cleaned.lower()
    assert "Adult JS remained nearby" in cleaned


def test_invented_felt_supported_removed_unless_in_input():
    source = DAILY_RECORD_WITH_INITIALS
    rough = "Adult JS offered toast. Child A felt supported and reassured."
    cleaned = strip_invented_emotional_impact(rough, source_text=source)
    assert "felt supported" not in cleaned.lower()
    assert "felt reassured" not in cleaned.lower()


def test_appeared_calmer_preserved_in_sanitized_output():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A ate toast and appeared calmer before bedtime."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "appeared calmer" in cleaned.lower()


def test_strip_unnecessary_follow_up_when_handover_present():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome / Handover\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently if Child A wishes to talk.\n\n"
        "## Follow-up for next shift\n\n"
        "Next adults should check in gently about school if Child A wishes to talk."
    )
    cleaned = strip_unnecessary_follow_up_section(rough, source_text=source)
    assert "follow-up" not in cleaned.lower()
    assert "handed over" in cleaned.lower()


def test_simple_daily_record_section_count_after_sanitize():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Daily Record\n\nOverview.\n\n"
        "## Presentation and Support\n\nChild A quieter after school.\n\n"
        "## Safeguarding Note\n\nNone.\n\n"
        "## Follow-up for next shift\n\nCheck in tomorrow.\n\n"
        "## Outcome / Handover\n\nAdult TK handed over to next shift."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "Safeguarding Note" not in cleaned
    assert count_content_sections(cleaned) <= 3


def test_incident_record_self_commentary_stripped():
    source = INCIDENT_PROMPT
    rough = (
        "Incident Reflection\n\nChild A became distressed after contact.\n\n"
        "This record maintains a factual, child-centred approach."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "This record maintains" not in cleaned


def test_magic_notes_request_is_record_generation():
    assert is_record_generation_request("Create magic notes from these rough notes about Child A")


def test_daily_headings_for_context_exclude_follow_up_by_default():
    headings = headings_for_record_context(prompt_text=DAILY_RECORD_PROMPT)
    assert headings[0] == "Daily Record"
    assert "Follow-up" not in " ".join(headings)
    assert "Child's Voice" not in " ".join(headings)


def test_manual_regression_prompt_constants_document_live_retest():
    assert "Adult TK" in MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    assert "Adult JS" in MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    assert "appeared calmer" in MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    assert "I'm just annoyed about school." in MANUAL_REGRESSION_DAILY_RECORD_PROMPT


def test_strip_approach_allowed_feel_supported():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "This approach allowed Child A to feel supported without pressure to engage further."
    )
    cleaned = strip_invented_emotional_impact(rough, source_text=source)
    assert "feel supported" not in cleaned.lower()


def test_strip_helping_feel_safe_preserves_adult_action():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Adult JS sat nearby, helping Child A feel safe and comfortable."
    cleaned = strip_invented_emotional_impact(rough, source_text=source)
    assert "Adult JS sat nearby" in cleaned
    assert "feel safe" not in cleaned.lower()
    assert "comfortable" not in cleaned.lower()


def test_child_stated_feeling_preserved_when_in_input():
    source = (
        f"{MANUAL_REGRESSION_DAILY_RECORD_PROMPT} "
        'Child A said, "I felt supported when Adult JS sat nearby."'
    )
    rough = 'Child A said, "I felt supported when Adult JS sat nearby."'
    cleaned = strip_invented_emotional_impact(rough, source_text=source)
    assert "felt supported" in cleaned.lower()


def test_strip_positive_shift_in_mood_preserves_appeared_calmer():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Child A ate the toast and appeared calmer before bedtime, "
        "indicating a positive shift in mood."
    )
    cleaned = strip_outcome_interpretation(rough, source_text=source)
    assert "appeared calmer" in cleaned.lower()
    assert "positive shift in mood" not in cleaned.lower()


def test_strip_showed_emotional_regulation():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A ate toast. This showed emotional regulation."
    cleaned = strip_outcome_interpretation(rough, source_text=source)
    assert "emotional regulation" not in cleaned.lower()
    assert "ate toast" in cleaned.lower()


def test_merge_duplicate_outcome_and_outcome_handover_headings():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome\n\n"
        "Child A appeared calmer before bedtime.\n\n"
        "## Outcome / Handover\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently if Child A wishes to talk."
    )
    cleaned = normalize_duplicate_daily_record_headings(rough, source_text=source)
    assert cleaned.lower().count("outcome") == 1 or "outcome / handover" in cleaned.lower()
    assert "appeared calmer" in cleaned.lower()
    assert "handed over" in cleaned.lower()
    assert not re.search(r"^##\s+Outcome\s*$", cleaned, re.M | re.I)


def test_simple_daily_record_no_separate_follow_up_when_handover_present():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome / Handover\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently about school if Child A wishes to talk.\n\n"
        "## Next Steps\n\n"
        "Tomorrow's adults should check in gently about school if Child A wishes to talk."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "next steps" not in cleaned.lower()
    assert "handed over" in cleaned.lower()


def test_safeguarding_record_follow_up_not_wrongly_removed():
    source = (
        "Create a safeguarding concern record. Young person disclosed online exploitation concern. "
        "Manager informed. Follow-up action plan required with social worker."
    )
    rough = (
        "## Outcome / follow-up\n\n"
        "Manager informed immediately.\n\n"
        "## Follow-up action plan\n\n"
        "Social worker to be contacted within 24 hours. Device review scheduled."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "follow-up action plan" in cleaned.lower()
    assert "social worker" in cleaned.lower()


def test_manual_regression_live_output_sanitized():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Daily Record\n\n"
        "## Presentation and Support\n\n"
        "Child A returned from school appearing quieter than usual. Adult TK gave Child A space. "
        "Adult JS checked in later.\n\n"
        'Child A said, "I\'m just annoyed about school."\n\n'
        "## Adult Response\n\n"
        "Adult JS offered Child A toast and sat nearby while Child A watched television, "
        "helping Child A feel safe and comfortable.\n\n"
        "## Outcome\n\n"
        "Child A accepted and ate the toast.\n\n"
        "## Outcome / Handover\n\n"
        "Child A ate the toast and appeared calmer before bedtime, indicating a positive shift in mood. "
        "This approach allowed Child A to feel supported without pressure to engage further. "
        "Adult TK handed over that tomorrow's adults should check in gently about school if Child A wishes to talk."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "feel supported" not in cleaned.lower()
    assert "feel safe" not in cleaned.lower()
    assert "comfortable" not in cleaned.lower()
    assert "positive shift in mood" not in cleaned.lower()
    assert "Adult TK" in cleaned
    assert "Adult JS" in cleaned
    assert "I'm just annoyed about school." in cleaned
    assert "appeared calmer" in cleaned.lower()
    assert not re.search(r"^##\s+Outcome\s*$", cleaned, re.M | re.I)
    assert "outcome / handover" in cleaned.lower()


def test_sentence_boundary_repair_quieter_than_usual_adult_tk():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A returned from school appearing quieter than usual Adult TK noticed this and gave Child A space."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "quieter than usual. Adult TK" in cleaned


def test_sentence_boundary_repair_settle_later():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Adult TK gave Child A space to settle Later, Adult JS checked in with Child A."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "settle. Later," in cleaned


def test_sentence_boundary_repair_watched_tv_during_this_time():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Adult JS sat nearby while Child A watched TV During this time, Child A ate toast."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "watched television. During this time," in cleaned


def test_sentence_boundary_repair_before_bedtime_adult_tk():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A appeared calmer before bedtime Adult TK handed over to the next shift."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "before bedtime. Adult TK" in cleaned


def test_repair_record_sentence_boundaries_direct():
    assert "usual. Adult TK" in repair_record_sentence_boundaries(
        "appearing quieter than usual Adult TK noticed this"
    )


def test_strip_interpretive_child_a_feelings_phrase():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "In response to Child A's feelings, Adult JS offered Child A toast."
    cleaned = strip_interpretive_feelings_phrases(rough, source_text=source)
    assert cleaned.startswith("In response")
    assert "Child A's feelings" not in cleaned


def test_child_quote_feeling_preserved():
    source = f'{MANUAL_REGRESSION_DAILY_RECORD_PROMPT} Child A said, "I feel sad."'
    rough = 'Child A said, "I feel sad."'
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "I feel sad." in cleaned


def test_user_provided_felt_sad_preserved():
    source = "Create a daily record. Child A said they felt sad after school."
    rough = "Child A said they felt sad after school."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "felt sad" in cleaned.lower()


def test_invented_frustration_not_generated():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Responding to Child A's frustration, Adult JS offered toast."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "frustration" not in cleaned.lower()


def test_manual_regression_preserves_before_bedtime():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A ate the toast and appeared calmer before bedtime."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "appeared calmer before bedtime" in cleaned.lower()


def test_unsupported_evening_progressed_removed():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A appeared calmer as the evening progressed."
    cleaned = strip_unsupported_timeline_expansion(rough, source_text=source)
    assert "as the evening progressed" not in cleaned.lower()
    assert "appeared calmer" in cleaned.lower()


def test_user_provided_evening_progressed_preserved():
    source = (
        "Create a daily record. Child A appeared calmer as the evening progressed "
        "and was ready for bed."
    )
    rough = "Child A appeared calmer as the evening progressed and was ready for bed."
    cleaned = strip_unsupported_timeline_expansion(rough, source_text=source)
    assert "as the evening progressed" in cleaned.lower()


def test_seemed_more_settled_becomes_appeared_calmer():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A seemed more settled."
    cleaned = sanitize_observation_interpretation_language(rough, source_text=source)
    assert "seemed more settled" not in cleaned.lower()
    assert "appeared calmer before bedtime" in cleaned.lower()


def test_mood_improved_does_not_appear():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "By evening mood improved."
    cleaned = sanitize_observation_interpretation_language(rough, source_text=source)
    assert "mood improved" not in cleaned.lower()


def test_seemed_relaxed_does_not_appear():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A seemed relaxed by bedtime."
    cleaned = sanitize_observation_interpretation_language(rough, source_text=source)
    assert "seemed relaxed" not in cleaned.lower()


def test_trailing_markdown_rule_removed_from_record_output():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Daily Record\n\nChild A appeared calmer before bedtime.\n\n—"
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert not cleaned.rstrip().endswith("—")


def test_trailing_markdown_preserved_when_user_provided():
    source = "Create a daily record with section separators.\n\nChild A quieter after school.\n\n—"
    rough = "Child A quieter after school.\n\n—"
    cleaned = strip_trailing_markdown_artefacts(rough, source_text=source)
    assert cleaned.rstrip().endswith("—")


def test_live_broken_output_full_sanitize_pass():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Child A returned from school appearing quieter than usual Adult TK noticed this and gave Child A space to settle "
        "Later, Adult JS checked in with Child A.\n\n"
        'Child A said, "I\'m just annoyed about school."\n\n'
        "In response to Child A's feelings, Adult JS offered Child A toast and sat nearby while Child A watched TV "
        "During this time, Child A ate the toast.\n\n"
        "Child A seemed more settled as the evening progressed.\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently about school if Child A wishes to talk.\n\n"
        "—"
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "quieter than usual. Adult TK" in cleaned
    assert "settle. Later," in cleaned
    assert "watched television. During this time," in cleaned
    assert "Child A's feelings" not in cleaned
    assert "as the evening progressed" not in cleaned.lower()
    assert "seemed more settled" not in cleaned.lower()
    assert "appeared calmer before bedtime" in cleaned.lower() or "appeared calmer" in cleaned.lower()
    assert not cleaned.rstrip().endswith("—")
    assert "I'm just annoyed about school." in cleaned


def test_sentence_boundary_repair_watched_television_child_a():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Adult JS offered Child A some toast and sat nearby while Child A watched television "
        "Child A accepted the toast and appeared calmer."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "watched television. Child A" in cleaned


def test_sentence_boundary_repair_accepted_toast_before_bedtime():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A accepted the toast Before bedtime, Child A appeared calmer."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "accepted the toast. Before bedtime" in cleaned


def test_sentence_boundary_repair_appeared_calmer_adult_tk():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A appeared calmer Adult TK handed over to the next shift."
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "appeared calmer. Adult TK" in cleaned


def test_repair_record_sentence_boundaries_watched_tv_child():
    assert "television. Child A" in repair_record_sentence_boundaries(
        "while Child A watched television Child A accepted the toast"
    )


def test_strip_repeated_appeared_calmer_from_adult_response():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Adult Response\n\n"
        "Adult JS offered toast. Child A accepted the toast and appeared calmer.\n\n"
        "## Outcome / Handover\n\n"
        "Before bedtime, Child A appeared calmer. Adult TK handed over that tomorrow's adults should check in gently."
    )
    cleaned = strip_repeated_observed_outcome(rough, source_text=source)
    assert "accepted the toast and appeared calmer" not in cleaned.lower()
    assert "accepted the toast." in cleaned or "accepted the toast" in cleaned
    assert "before bedtime, child a appeared calmer" in cleaned.lower()


def test_appeared_calmer_preserved_when_only_once():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "## Adult Response\n\nChild A accepted the toast and appeared calmer."
    cleaned = strip_repeated_observed_outcome(rough, source_text=source)
    assert "appeared calmer" in cleaned.lower()


def test_safeguarding_record_observations_not_stripped():
    source = (
        "Create a safeguarding concern record. Young person disclosed online exploitation concern. "
        "Manager informed."
    )
    rough = (
        "## Adult Response\n\n"
        "Adult JS offered support. Child A appeared distressed.\n\n"
        "## Outcome / follow-up\n\n"
        "Child A appeared distressed. Manager informed immediately."
    )
    cleaned = strip_repeated_observed_outcome(rough, source_text=source)
    assert cleaned.count("appeared distressed") >= 1


def test_strip_inline_next_steps_heading_and_bullets():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome / Handover\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently about school if Child A wishes to talk.\n\n"
        "Next Steps: - Ensure that Child A is supported in discussing school when they feel ready - "
        "Monitor Child A's mood and engagement throughout the day"
    )
    cleaned = strip_redundant_next_steps_in_daily_record(rough, source_text=source)
    assert "next steps" not in cleaned.lower()
    assert "monitor child a" not in cleaned.lower()
    assert "handed over" in cleaned.lower()


def test_strip_multiline_next_steps_section():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome / Handover\n\n"
        "Adult TK handed over that tomorrow's adults should check in gently.\n\n"
        "## Next Steps\n\n"
        "- Ensure that Child A is supported in discussing school when they feel ready\n"
        "- Monitor Child A's mood and engagement throughout the day"
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "next steps" not in cleaned.lower()
    assert "outcome / handover" in cleaned.lower()


def test_simple_daily_record_retains_outcome_handover():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Outcome / Handover\n\n"
        "Before bedtime, Child A appeared calmer. Adult TK handed over that tomorrow's adults should check in gently."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "outcome / handover" in cleaned.lower()
    assert "handed over" in cleaned.lower()


def test_safeguarding_action_plan_keeps_follow_up_section():
    source = (
        "Create a safeguarding concern record. Young person disclosed online exploitation concern. "
        "Manager informed. Follow-up action plan required with social worker."
    )
    rough = (
        "## Outcome / follow-up\n\n"
        "Manager informed immediately.\n\n"
        "## Follow-up action plan\n\n"
        "Social worker to be contacted within 24 hours."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "follow-up action plan" in cleaned.lower()


def test_user_requested_action_plan_keeps_action_section():
    source = (
        "Create a daily record with an action plan section. Child A quieter after school. "
        "Include next steps for tomorrow's adults."
    )
    rough = (
        "## Outcome / Handover\n\n"
        "Adult TK handed over to next shift.\n\n"
        "## Next Steps\n\n"
        "- Check in gently about school tomorrow"
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "next steps" in cleaned.lower()


def test_strip_end_of_record_marker():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Daily Record\n\nChild A appeared calmer before bedtime.\n\n[End of record]"
    cleaned = strip_end_of_record_artefacts(rough, source_text=source)
    assert "[End of record]" not in cleaned
    assert "appeared calmer" in cleaned.lower()


def test_strip_end_of_record_uppercase():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = "Child A appeared calmer before bedtime.\n\nEND OF RECORD"
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "END OF RECORD" not in cleaned


def test_user_requested_end_marker_preserved():
    source = "Create a daily record with an end marker. Child A quieter after school.\n\n[End of record]"
    rough = "Child A quieter after school.\n\n[End of record]"
    cleaned = strip_end_of_record_artefacts(rough, source_text=source)
    assert "[End of record]" in cleaned
    assert user_requested_end_marker(source)


def test_manual_regression_live_output_with_all_failures():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "## Presentation and Support\n\n"
        "Child A returned from school appearing quieter than usual. Adult TK gave Child A space. "
        "Later, Adult JS checked in with Child A.\n\n"
        'Child A said, "I\'m just annoyed about school."\n\n'
        "## Adult Response\n\n"
        "Adult JS offered Child A some toast and sat nearby while Child A watched television "
        "Child A accepted the toast and appeared calmer.\n\n"
        "## Outcome / Handover\n\n"
        "Before bedtime, Child A appeared calmer. Adult TK handed over that the adults on duty tomorrow "
        "should check in gently with Child A about school if Child A wishes to talk.\n\n"
        "Next Steps: - Ensure that Child A is supported in discussing school when they feel ready - "
        "Monitor Child A's mood and engagement throughout the day\n\n"
        "[End of record]"
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "watched television. Child A" in cleaned
    assert "accepted the toast and appeared calmer" not in cleaned.lower()
    assert "before bedtime, child a appeared calmer" in cleaned.lower()
    assert "next steps" not in cleaned.lower()
    assert "[end of record]" not in cleaned.lower()
    assert "Adult TK" in cleaned
    assert "Adult JS" in cleaned
