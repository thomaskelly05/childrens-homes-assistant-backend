"""ORB Residential full-brain category benchmark tests."""

from __future__ import annotations

import re

from assistant.evals.orb_full_brain_category_benchmark import run_full_brain_category_benchmark
from assistant.evals.orb_full_brain_category_benchmark_data import (
    CATEGORY_BENCHMARK_PACK,
    all_category_prompts,
    category_ids,
)
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
    should_skip_diagnosis_firewall,
)
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from services.orb_universal_answer_contract_map_service import detect_contract_family

GESTURE_PROMPT = (
    "How can I evidence a young person's voice in a daily record when they communicate "
    "mainly through gestures and symbols?"
)
AUTISM_PLAN_PROMPT = "The autism support plan changed after a review — how should staff record the update?"
MEDICATION_REFUSAL_PROMPT = "A young person refused medication. What should we consider?"
MEDICATION_ERROR_PROMPT = "We made a medication error and gave the wrong dose — what should staff record?"
SCHOOL_DSL_PROMPT = "The school DSL asked for chronology after an exclusion — what should we share?"


def test_all_seventeen_categories_have_five_prompts():
    assert len(CATEGORY_BENCHMARK_PACK) == 17
    for category in CATEGORY_BENCHMARK_PACK:
        assert len(category["prompts"]) >= 5, category["category_id"]


def test_benchmark_pack_has_eighty_five_prompts():
    assert len(all_category_prompts()) == 85
    assert len(category_ids()) == 17


def test_gesture_symbol_question_routes_child_voice_evidence_not_support_plan():
    assert detect_contract_family(GESTURE_PROMPT) == "child_voice_evidence_recording"


def test_autism_plan_changed_does_not_trigger_diagnosis_firewall():
    assert should_skip_diagnosis_firewall(AUTISM_PLAN_PROMPT)
    scaffold = orb_safety_scaffold_service.build_from_message(AUTISM_PLAN_PROMPT)
    assert scaffold.detected_category != "diagnosis-request"
    assert not scaffold.guardrail_active


def test_medication_refusal_does_not_imply_error_in_guard_helpers():
    answer = "Record the refusal on the MAR, notify the manager and follow medication policy."
    assert not find_inappropriate_medication_error_reference(answer, source_text=MEDICATION_REFUSAL_PROMPT)
    error_answer = "This may be a medication error — notify the manager."
    assert find_inappropriate_medication_error_reference(error_answer, source_text=MEDICATION_REFUSAL_PROMPT)


def test_medication_error_prompt_routes_incident_not_refusal():
    assert detect_contract_family(MEDICATION_ERROR_PROMPT) == "incident_record"
    assert detect_contract_family(MEDICATION_REFUSAL_PROMPT) == "medication_refusal_guidance"


def test_dsl_only_allowed_in_education_context():
    residential_answer = "Escalate to the manager and safeguarding lead immediately."
    assert not find_inappropriate_dsl_reference(residential_answer, source_text=MEDICATION_REFUSAL_PROMPT)
    dsl_answer = "Notify the school DSL with chronology."
    assert not find_inappropriate_dsl_reference(dsl_answer, source_text=SCHOOL_DSL_PROMPT)
    bad_answer = "Notify the DSL immediately."
    assert find_inappropriate_dsl_reference(bad_answer, source_text=MEDICATION_REFUSAL_PROMPT)


def test_full_benchmark_produces_category_summary():
    report = run_full_brain_category_benchmark()
    assert report["categories_total"] == 17
    assert report["prompts_total"] == 85
    assert set(report["categories"].keys()) == set(category_ids())
    for category_id in category_ids():
        cat = report["categories"][category_id]
        assert cat["prompts_tested"] >= 5
        assert cat["status"] in {"pass", "concern", "fail"}


def test_no_default_dsl_in_residential_safeguarding_benchmark_rows():
  report = run_full_brain_category_benchmark()
  for result in report["results"]:
    if result.get("routing", {}).get("contract_family") == "school_refusal_recording":
      continue
    if "education_context" in str(result.get("prompt", "")).lower():
      continue
    for issue in result.get("issues") or []:
      assert "education-only DSL wording" not in issue, result["prompt_id"]
