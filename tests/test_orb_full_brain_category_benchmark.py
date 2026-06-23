"""ORB Residential full-brain category benchmark tests."""

from __future__ import annotations

from assistant.evals.orb_residential_full_playbook_benchmark_data import (
    CATEGORY_BENCHMARK_PACK,
    all_category_prompts,
    category_ids,
)
from tests.test_orb_residential_full_playbook_benchmark import (  # noqa: F401
    test_all_fifty_four_categories_exist as test_all_seventeen_categories_have_five_prompts,
    test_autism_plan_changed_does_not_trigger_diagnosis_firewall,
    test_dsl_only_allowed_in_education_context,
    test_each_category_has_at_least_five_prompts,
    test_full_playbook_benchmark_produces_category_summary as test_full_benchmark_produces_category_summary,
    test_full_playbook_has_at_least_two_hundred_seventy_prompts as test_benchmark_pack_has_eighty_five_prompts,
    test_gesture_symbol_question_routes_child_voice_evidence_not_support_plan,
    test_medication_error_prompt_routes_incident_not_refusal,
    test_medication_refusal_does_not_imply_error_in_guard_helpers,
    test_no_default_dsl_in_residential_safeguarding_benchmark_rows,
)

# Backward-compatible aliases for legacy test names.
def test_legacy_pack_counts():
    assert len(CATEGORY_BENCHMARK_PACK) == 54
    assert len(all_category_prompts()) == 270
    assert len(category_ids()) == 54
