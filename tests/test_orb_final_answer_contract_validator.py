"""Tests for ORB final-answer contract validator."""

from __future__ import annotations

from services.orb_final_answer_contract_validator_service import (
    FAMILY_MARKER_GROUPS,
    validate_final_answer_contract,
)
from services.orb_final_answer_repair_service import (
    ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE,
    repair_accessible_child_support_plan,
)
from services.orb_universal_answer_contract_map_service import detect_contract_family

GDD_PROMPT = (
    "Give me a template for a child-friendly support plan for a 17-year-old with GDD. "
    "They mainly use widgets to be able to communicate. I want this to give them a plan "
    "they can follow, with dreams and aspirations."
)

GENERIC_BAD_ANSWER = (
    "Creating a child-friendly support plan requires a focus on communication. "
    "Here's a structured template you can adapt, tailored to their individual needs. "
    "[Use widgets to express dre…] [Goal 1: Specific, measurab…]"
)


def test_accessible_support_plan_marker_groups_defined():
    groups = FAMILY_MARKER_GROUPS["accessible_child_support_plan"]
    group_ids = {g[0] for g in groups}
    assert "say_yes" in group_ids
    assert "adult_guidance" in group_ids
    assert "independence" in group_ids


def test_canonical_support_plan_passes_validation():
    answer = repair_accessible_child_support_plan("", message=GDD_PROMPT)
    result = validate_final_answer_contract(
        answer,
        contract_family="accessible_child_support_plan",
    )
    assert result["passed"] is True
    assert not result["forbidden_patterns"]
    assert not result["missing_required_markers"]
    assert not result["placeholder_issues"]


def test_generic_bad_answer_fails_validation():
    result = validate_final_answer_contract(
        GENERIC_BAD_ANSWER,
        contract_family="accessible_child_support_plan",
    )
    assert result["passed"] is False
    assert result["forbidden_patterns"]
    assert result["missing_required_markers"]
    assert result["repair_instructions"]


def test_gdd_prompt_contract_selection():
    assert detect_contract_family(GDD_PROMPT) == "accessible_child_support_plan"


def test_forbidden_creating_child_friendly_support_plan():
    result = validate_final_answer_contract(
        "Creating a child-friendly support plan for the young person.",
        contract_family="accessible_child_support_plan",
    )
    assert result["passed"] is False
    assert any("creating" in p.lower() for p in result["forbidden_patterns"])


def test_template_contains_adult_guidance_section():
    assert "Adult guidance for using this plan" in ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE
