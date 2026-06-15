"""Canonical ORB Residential Quality Lab scenario schema — internal evaluation only."""

from __future__ import annotations

from typing import Any

SCHEMA_VERSION = "1.0.0"

FEATURE_TARGETS: tuple[str, ...] = (
    "Chat",
    "Magic Notes",
    "Voice",
    "ORB Write",
    "Templates",
    "Documents & Guidance",
    "Management oversight",
    "Regulation evidence",
)

DIFFICULTY_LEVELS: tuple[str, ...] = (
    "basic",
    "moderate",
    "complex",
    "high-risk",
)

REGULATORY_CONTEXTS: tuple[str, ...] = (
    "daily living",
    "safeguarding",
    "behaviour",
    "health",
    "education",
    "family contact",
    "missing from care",
    "restraint / physical intervention",
    "medication",
    "allegation",
    "complaints",
    "equality / identity",
    "transitions",
    "placement planning",
    "leadership / management",
    "Reg 44",
    "Reg 45",
)

RECORD_TYPES: tuple[str, ...] = (
    "daily_record",
    "incident_report",
    "safeguarding_concern",
    "handover",
    "key_work_session",
    "manager_summary",
    "reg_44_evidence_summary",
    "general_dictation",
    "behaviour_reflection",
    "family_contact_record",
    "multi_agency_discussion",
    "home_visit_note",
    "strategy_safeguarding_discussion",
    "supervision_discussion",
    "medication_record",
    "risk_assessment_note",
    "complaint_record",
    "reg_45_self_evaluation",
    "placement_plan_review",
    "professional_contact_note",
)

REQUIRED_SCENARIO_FIELDS: tuple[str, ...] = (
    "scenario_id",
    "title",
    "version",
    "source",
    "scenario_family",
    "record_type",
    "feature_target",
    "difficulty",
    "regulatory_context",
    "input",
    "expected_strengths",
    "required_elements",
    "prohibited_elements",
    "safeguarding_flags",
    "quality_focus",
    "ideal_output_traits",
    "scoring_notes",
    "synthetic_data_confirmation",
)

DEFAULT_REQUIRED_ELEMENTS: list[str] = [
    "factual observations",
    "adult response",
    "outcome",
    "adult review requirement",
]

DEFAULT_PROHIBITED_ELEMENTS: list[str] = [
    "blame",
    "diagnosis",
    "assumptions presented as fact",
    "punitive wording",
    "invented facts",
]

SAFEGUARDING_REQUIRED_ELEMENTS: list[str] = [
    "child voice/presentation",
    "factual observations",
    "adult response",
    "escalation/pathway",
    "management oversight",
    "adult review requirement",
]

VARIANT_TYPES: tuple[str, ...] = (
    "rough_note",
    "manager_oversight",
    "handover",
    "mobile_friendly",
    "child_centred_rewrite",
    "safeguarding_escalation",
    "reg44_evidence",
    "poor_wording_correction",
    "voice_dictate_transcript",
    "reflective_supervision",
)


def validate_scenario_fields(scenario: dict[str, Any]) -> list[str]:
    """Return list of validation errors for a canonical scenario."""
    errors: list[str] = []
    for field in REQUIRED_SCENARIO_FIELDS:
        if field not in scenario or scenario[field] is None:
            errors.append(f"missing field: {field}")
    if scenario.get("feature_target") not in FEATURE_TARGETS:
        errors.append(f"invalid feature_target: {scenario.get('feature_target')}")
    if scenario.get("difficulty") not in DIFFICULTY_LEVELS:
        errors.append(f"invalid difficulty: {scenario.get('difficulty')}")
    reg = scenario.get("regulatory_context")
    if isinstance(reg, str):
        if reg not in REGULATORY_CONTEXTS:
            errors.append(f"invalid regulatory_context: {reg}")
    elif isinstance(reg, list):
        for item in reg:
            if item not in REGULATORY_CONTEXTS:
                errors.append(f"invalid regulatory_context item: {item}")
    else:
        errors.append("regulatory_context must be str or list")
    if scenario.get("synthetic_data_confirmation") is not True:
        errors.append("synthetic_data_confirmation must be true")
    return errors


def scenario_to_baseline_format(scenario: dict[str, Any]) -> dict[str, Any]:
    """Map canonical scenario to legacy baseline runner format (id field)."""
    return {
        "id": scenario.get("scenario_id"),
        "title": scenario.get("title"),
        "record_type": scenario.get("record_type"),
        "input": scenario.get("input"),
        "expected_strengths": scenario.get("expected_strengths") or [],
        "safeguarding_flags": scenario.get("safeguarding_flags") or [],
        "required_elements": scenario.get("required_elements") or [],
        "prohibited_elements": scenario.get("prohibited_elements") or [],
        "ideal_output_traits": scenario.get("ideal_output_traits") or [],
        "feature_target": scenario.get("feature_target"),
        "difficulty": scenario.get("difficulty"),
        "regulatory_context": scenario.get("regulatory_context"),
        "scenario_family": scenario.get("scenario_family"),
        "source": scenario.get("source"),
        "version": scenario.get("version"),
    }
