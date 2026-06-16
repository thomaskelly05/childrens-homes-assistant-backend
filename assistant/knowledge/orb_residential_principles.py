"""Canonical ORB Residential recording principles — shared brain consolidation source.

Runtime prompts and benchmark scaffolds should align to these principles.
The JSON framework (`orb_recording_framework.json`) remains the structural SSOT for
wording_discipline bullets and recording steps.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from assistant.knowledge.adult_identity_language import (
    ADULT_IDENTITY_PRINCIPLE,
    CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY_PRINCIPLE,
    CHILD_VOICE_DISCIPLINE_PRINCIPLE,
    DAILY_RECORD_OUTPUT_DISCIPLINE_PRINCIPLE,
    DAILY_RECORD_PROPORTIONALITY_PRINCIPLE,
    DAILY_RECORD_SIMPLIFICATION_PRINCIPLE,
    DUPLICATE_HEADING_DISCIPLINE_PRINCIPLE,
    EMOTIONAL_IMPACT_DISCIPLINE_PRINCIPLE,
    OUTCOME_INTERPRETATION_DISCIPLINE_PRINCIPLE,
    RECORD_HEADING_DISCIPLINE_PRINCIPLE,
    RECORD_ONLY_OUTPUT_PRINCIPLE,
    SELF_COMMENTARY_PRINCIPLE,
)

_FRAMEWORK_PATH = Path(__file__).resolve().parent / "orb_recording_framework.json"

# Core principle statements — referenced by scaffold, rubric traceability and tests.
CHILD_CENTRED_PRINCIPLE = (
    "For residential records, keep the child visible: what they said or showed, their presentation, "
    "and their experience before, during and after adult support. "
    "Separate observation from interpretation. Do not invent feelings."
)

ADULT_RESPONSE_PRINCIPLE = (
    "For residential childcare records, make adult practice visible and specific. "
    "Name what adults did first, how they communicated, and how they preserved dignity, safety and relationship. "
    "Record space, choice, reassurance, co-regulation or repair where provided. "
    "Note plans followed, oversight sought, and what appeared to help or not help. "
    "Do not default to generic 'staff' — use Adult [initials] when supplied, otherwise 'the adult' or 'adults'. "
    "Avoid vague 'staff supported' unless the support is described. "
    "Do not invent actions or initials not in the input — prompt for missing detail instead."
)

THERAPEUTIC_LANGUAGE_PRINCIPLE = (
    "For residential records, use respectful, non-blaming therapeutic language. "
    "Describe observable behaviour and presentation — not labels. "
    "Separate observation from interpretation. "
    "When rough input contains judgemental wording, reframe to factual, warm language "
    "without inventing events. Adults remain responsible for final wording."
)

FACTUAL_ACCURACY_PRINCIPLE = (
    "For residential childcare records, separate known facts from interpretation. "
    "Preserve direct words where provided. Do not add unprovided facts, chronology, adult actions, "
    "child feelings, outcomes or safeguarding escalation. "
    "Use 'not stated', 'not yet known', 'requires clarification' or 'the record should confirm' "
    "where information is missing. Turn missing information into prompts, not assumptions. "
    "A safer record is honest about what is known, unknown and still to be reviewed."
)

OBSERVATION_VS_INTERPRETATION_PRINCIPLE = (
    "For residential childcare records, separate what was observed, said, reported and reflected. "
    "Use 'The adult observed…' or 'Adult [initials] observed…' for presentation; 'Child A said…' for direct words; "
    "'It was reported that…' for reported information; 'appeared' or 'presented as' for observed presentation; "
    "'may indicate', 'could suggest' or 'may have communicated' only as reflection, not fact. "
    "Prefer 'appeared calmer' over 'mood improved' and 'appeared calmer before bedtime' where the input states this — not 'seemed more settled' or 'seemed relaxed' unless directly stated. "
    "Do not add 'indicating a positive shift in mood' or 'showing emotional regulation' after observed presentation. "
    "Do not state motives, feelings, triggers, risk levels or safeguarding thresholds as facts unless provided. "
    "Mark what is not known. Behaviour-as-communication is reflective, not diagnostic."
)

MANAGEMENT_OVERSIGHT_PRINCIPLE = (
    "For residential childcare records, help adults consider management oversight — not replace it. "
    "Prompt whether this is an isolated event or part of a pattern; whether plans or risk assessments need review; "
    "whether the adult response was consistent with the agreed approach; whether a manager/senior should review; "
    "whether supervision, debrief or practice learning is needed; and what follow-up remains. "
    "Use 'manager/senior should consider reviewing…' not 'manager must conclude…'. "
    "ORB supports oversight; it does not complete management oversight."
)

PATHWAY_DISCIPLINE_PRINCIPLE = (
    "For residential childcare records, ORB should help adults consider the most proportionate pathway. "
    "Pathways are for professional consideration — responsible adults/managers decide and act per local policy. "
    "Use 'pathway to consider', 'routine follow-up / handover', 'senior or manager review', "
    "'local safeguarding procedure', 'professional consultation where policy-led', "
    "'urgent action if immediate risk is indicated', and 'responsible adult to decide'. "
    "Record who was informed and what was agreed. Note what remains unresolved. "
    "Do not say 'threshold met', 'referral required' or 'no concern' as a definitive decision. "
    "ORB must not default to DSL or education safeguarding terminology — use children's home language unless the user supplied DSL."
)

PROFESSIONAL_JUDGEMENT_BOUNDARY = (
    "Adults remain accountable for professional judgement, escalation and final records. "
    "ORB supports reflection and recording; it is not a safeguarding or management decision."
)

INSPECTION_EVIDENCE_SUPPORT = (
    "ORB may support inspection evidence preparation as an internal quality indicator. "
    "It does not determine inspection outcomes, guarantee compliance or represent regulator endorsement."
)

# Named principle registry for consolidation tests and traceability.
CANONICAL_PRINCIPLES: dict[str, str] = {
    "child_centredness": CHILD_CENTRED_PRINCIPLE,
    "adult_response": ADULT_RESPONSE_PRINCIPLE,
    "adult_identity": ADULT_IDENTITY_PRINCIPLE,
    "childrens_home_safeguarding_terminology": CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY_PRINCIPLE,
    "daily_record_proportionality": DAILY_RECORD_PROPORTIONALITY_PRINCIPLE,
    "daily_record_output_discipline": DAILY_RECORD_OUTPUT_DISCIPLINE_PRINCIPLE,
    "record_only_output": RECORD_ONLY_OUTPUT_PRINCIPLE,
    "child_voice_discipline": CHILD_VOICE_DISCIPLINE_PRINCIPLE,
    "emotional_impact_discipline": EMOTIONAL_IMPACT_DISCIPLINE_PRINCIPLE,
    "outcome_interpretation_discipline": OUTCOME_INTERPRETATION_DISCIPLINE_PRINCIPLE,
    "duplicate_heading_discipline": DUPLICATE_HEADING_DISCIPLINE_PRINCIPLE,
    "daily_record_simplification": DAILY_RECORD_SIMPLIFICATION_PRINCIPLE,
    "therapeutic_language": THERAPEUTIC_LANGUAGE_PRINCIPLE,
    "factual_accuracy": FACTUAL_ACCURACY_PRINCIPLE,
    "observation_vs_interpretation": OBSERVATION_VS_INTERPRETATION_PRINCIPLE,
    "record_heading_discipline": RECORD_HEADING_DISCIPLINE_PRINCIPLE,
    "self_commentary": SELF_COMMENTARY_PRINCIPLE,
    "management_oversight": MANAGEMENT_OVERSIGHT_PRINCIPLE,
    "pathway_discipline": PATHWAY_DISCIPLINE_PRINCIPLE,
    "professional_judgement": PROFESSIONAL_JUDGEMENT_BOUNDARY,
    "inspection_evidence_support": INSPECTION_EVIDENCE_SUPPORT,
}

# Therapeutic phrase replacement — shared across scaffold and contract service.
THERAPEUTIC_PHRASE_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    (r"\bcalmed down\b", "appeared calmer"),
    (r"\battention[\s-]?seeking\b", "communicating distress"),
    (r"\bmanipulative\b", "behaviour that may have communicated an unmet need"),
    (r"\bkicked off\b", "became distressed"),
    (r"\bnaughty\b", "distressed"),
    (r"\bnon-?compliant\b", "found it difficult to follow the request"),
)


@lru_cache(maxsize=1)
def load_framework() -> dict[str, Any]:
    return json.loads(_FRAMEWORK_PATH.read_text(encoding="utf-8"))


def structure_steps() -> list[str]:
    return list(load_framework()["residential_recording_structure"]["steps"])


def wording_discipline_bullets() -> list[str]:
    return list(load_framework()["residential_recording_structure"]["wording_discipline"])


def residential_recording_discipline_principles() -> list[str]:
    """Condensed principles for therapeutic_language module — derived from framework SSOT."""
    return wording_discipline_bullets()


def validate_principle_alignment() -> list[str]:
    """Return conflicts if canonical principles contradict framework bullets."""
    issues: list[str] = []
    bullets = " ".join(wording_discipline_bullets()).lower()
    checks = [
        ("child voice", "child_centredness"),
        ("staff supported", "adult_response"),
        ("do not default to 'staff'", "adult_identity"),
        ("do not default to dsl", "childrens_home_safeguarding_terminology"),
        ("safeguarding note", "daily_record_proportionality"),
        ("not yet known", "factual_accuracy"),
        ("pathway to consider", "pathway_discipline"),
        ("manager/senior should consider", "management_oversight"),
        ("may indicate", "observation_vs_interpretation"),
        ("self-assessment", "self_commentary"),
    ]
    for needle, key in checks:
        if needle not in bullets:
            issues.append(f"framework missing expected theme for {key}: {needle!r}")
    return issues
