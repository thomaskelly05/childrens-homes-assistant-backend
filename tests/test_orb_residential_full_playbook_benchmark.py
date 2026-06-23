"""ORB Residential full playbook benchmark tests."""

from __future__ import annotations

import time

from assistant.evals.orb_residential_full_playbook_benchmark import run_residential_full_playbook_benchmark
from assistant.evals.orb_residential_full_playbook_benchmark_data import (
    CATEGORY_BENCHMARK_PACK,
    all_category_prompts,
    category_ids,
)
from assistant.evals.orb_full_brain_category_benchmark_data import PACK_VERSION
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
    should_skip_diagnosis_firewall,
)
from services.orb_instant_first_lines_service import instant_first_lines_for_message
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from services.orb_therapeutic_template_factory_service import (
    REQUIRED_TEMPLATE_FAMILIES,
    orb_therapeutic_template_factory_service,
)
from services.orb_universal_answer_contract_map_service import detect_contract_family

GESTURE_PROMPT = (
    "How can I evidence a young person's voice in a daily record when they communicate "
    "mainly through gestures and symbols?"
)
AUTISM_PLAN_PROMPT = "The autism support plan changed after a review — how should staff record the update?"
MEDICATION_REFUSAL_PROMPT = "A young person refused medication. What should we consider?"
MEDICATION_ERROR_PROMPT = "We made a medication error and gave the wrong dose — what should staff record?"
SCHOOL_DSL_PROMPT = "The school DSL asked for chronology after an exclusion — what should we share?"
COMMUNICATE_PACK_PROMPT = "Create a communication support pack for a hospital visit tomorrow."


def test_all_fifty_four_categories_exist():
    assert len(CATEGORY_BENCHMARK_PACK) == 54
    assert len(category_ids()) == 54


def test_each_category_has_at_least_five_prompts():
    for category in CATEGORY_BENCHMARK_PACK:
        assert len(category["prompts"]) >= 5, category["category_id"]


def test_full_playbook_has_at_least_two_hundred_seventy_prompts():
    assert len(all_category_prompts()) == 270
    assert PACK_VERSION == "orb-residential-full-playbook-benchmark-v1"


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


def test_full_playbook_benchmark_produces_category_summary():
    report = run_residential_full_playbook_benchmark()
    assert report["categories_total"] == 54
    assert report["prompts_total"] == 270
    assert set(report["categories"].keys()) == set(category_ids())
    for category_id in category_ids():
        cat = report["categories"][category_id]
        assert cat["prompts_tested"] >= 5
        assert cat["status"] in {"pass", "concern", "fail"}


def test_no_default_dsl_in_residential_safeguarding_benchmark_rows():
    report = run_residential_full_playbook_benchmark()
    for result in report["results"]:
        if result.get("routing", {}).get("contract_family") == "school_refusal_recording":
            continue
        if result.get("education_context"):
            continue
        for issue in result.get("issues") or []:
            assert "education-only DSL wording" not in issue, result["prompt_id"]


def test_instant_first_lines_exist_for_high_risk_categories():
    high_risk_prompts = {
        "missing_from_care": "A young person is missing from care right now.",
        "self_harm_suicide": "Young person disclosed self-harm and said they want to die.",
        "allegations_lado": "A child says a staff member touched them inappropriately.",
        "medication_refusal_support": "A young person refused medication.",
    }
    for category_id, prompt in high_risk_prompts.items():
        result = instant_first_lines_for_message(prompt)
        assert result.lines
        assert result.category_id == category_id
        assert len(result.lines) <= 3


def test_instant_first_lines_complete_under_fifty_ms():
    samples = [
        "Help me write a daily record.",
        "A young person is missing from care right now.",
        "Create a communication support pack for contact change.",
    ]
    for sample in samples:
        start = time.perf_counter()
        result = instant_first_lines_for_message(sample)
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert elapsed_ms < 50, f"too slow: {elapsed_ms}ms"
        assert result.elapsed_ms < 50


def test_instant_first_lines_no_external_ai_marker():
    source_path = __import__("services.orb_instant_first_lines_service", fromlist=["__file__"]).__file__
    text = open(source_path, encoding="utf-8").read()
    assert "openai" not in text.lower()
    assert "anthropic" not in text.lower()
    assert "stream_answer" not in text


def test_stream_route_wires_instant_first_lines():
    source = open("routers/orb_standalone_routes.py", encoding="utf-8").read()
    assert "instant_first_lines_for_message" in source
    assert "instant_first_lines_ms" in source
    assert "instant_category" in source
    assert "instant_lines_used" in source


def test_communicate_support_pack_request_has_instant_lines():
    result = instant_first_lines_for_message(COMMUNICATE_PACK_PROMPT)
    assert result.category_id == "orb_communicate"
    assert "communication support" in result.text.lower()


def test_template_factory_covers_required_families():
    verification = orb_therapeutic_template_factory_service.verify_families()
    assert verification["required_families"] == len(REQUIRED_TEMPLATE_FAMILIES)
    assert verification["missing_registry_ids"] == []


def test_templates_are_child_centred_therapeutic_and_adult_guided():
    for family, template_id in list(REQUIRED_TEMPLATE_FAMILIES.items())[:8]:
        template = orb_therapeutic_template_factory_service.get_template(template_id)
        assert template is not None, family
        assert template.get("adult_guidance_before_completing")
        assert template.get("child_voice_prompts")
        assert template.get("therapeutic_wording_examples")
        assert template.get("review_before_use")
        assert "guarantee" in template.get("compliance_disclaimer", "").lower() or "does not guarantee" in template.get("review_before_use", "").lower()
        combined = " ".join(
            [
                str(template.get("purpose", "")),
                str(template.get("adult_guidance_before_completing", "")),
                " ".join(template.get("what_to_avoid") or []),
            ]
        ).lower()
        assert "dsl" not in combined or "school" in combined


def test_no_duplicate_template_registry_created():
    import inspect
    import services.orb_template_library_registry as registry_module
    import services.orb_therapeutic_template_factory_service as factory_module

    assert registry_module.ORB_TEMPLATE_REGISTRY is not None
    source = inspect.getsource(factory_module)
    assert "ORB_TEMPLATE_REGISTRY:" not in source
    assert "def _build_registry" not in source
