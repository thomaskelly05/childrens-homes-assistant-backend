from __future__ import annotations

from services.orb_expert_scenario_bank_service import (
    matrix_combination_count,
    orb_expert_scenario_bank_service,
)


def test_gold_scenario_count_at_least_100():
    assert orb_expert_scenario_bank_service.gold_count() >= 100


def test_every_gold_scenario_has_required_fields():
    required = (
        "scenario_id",
        "title",
        "family",
        "role",
        "risk_level",
        "prompt",
        "expected_markers",
        "must_not_say",
        "source_anchors",
    )
    for scenario in orb_expert_scenario_bank_service.list_gold_scenarios():
        for field in required:
            assert scenario.get(field), f"{scenario.get('scenario_id')}: missing {field}"


def test_gold_source_anchors_exist_in_registry():
    errors = orb_expert_scenario_bank_service.validate_gold_scenarios()
    assert not errors, errors


def test_matrix_combination_count_large():
    assert matrix_combination_count() > 1000


def test_generate_matrix_variants():
    variants = orb_expert_scenario_bank_service.generate_matrix_variants(
        family_id="missing_from_care",
        count=5,
    )
    assert len(variants) == 5
    assert all(v.get("generated") for v in variants)
    assert all(v.get("needs_human_review") for v in variants)
