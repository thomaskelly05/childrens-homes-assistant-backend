"""Live-quality tests for accessible child support plan outputs."""

from __future__ import annotations

from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_final_answer_contract_validator_service import validate_final_answer_contract
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from services.orb_fast_opening_service import merge_stream_answer, strip_streaming_artifacts_from_answer
from services.orb_universal_answer_contract_map_service import (
    detect_contract_family,
    sanitize_final_answer,
)

GDD_PROMPT = (
    "Give me a template for a child-friendly support plan for a 17-year-old with GDD. "
    "They mainly use widgets to be able to communicate. I want this to give them a plan "
    "they can follow, with dreams and aspirations."
)

GENERIC_LIVE_ANSWER = (
    "Creating a child-friendly support plan for a 17-year-old with GDD requires a focus on "
    "communication and independence.\n\n"
    "[Use widgets to express dre…]\n"
    "[Goal 1: Specific, measurab…]\n\n"
    "Support strategies include visual schedules and adult guidance."
)


def test_gdd_contract_selection_passes():
    assert detect_contract_family(GDD_PROMPT) == "accessible_child_support_plan"


def test_generic_live_answer_fails_before_repair():
    result = validate_final_answer_contract(
        GENERIC_LIVE_ANSWER,
        contract_family="accessible_child_support_plan",
    )
    assert result["passed"] is False


def test_repair_produces_child_facing_plan():
    repaired, meta = repair_and_validate_final_answer(
        GENERIC_LIVE_ANSWER,
        contract_family="accessible_child_support_plan",
        message=GDD_PROMPT,
    )
    assert meta["repair_applied"] is True
    assert meta["final_answer_validation_passed"] is True
    lower = repaired.lower()
    assert "my support plan" in lower
    assert "creating a child-friendly support plan" not in lower
    assert "…]" not in repaired
    assert "widget" in lower
    assert "yes:" in lower or "how i say yes" in lower
    assert "dream" in lower
    assert "independence" in lower
    assert "adult guidance" in lower


def test_finalize_intelligence_repairs_generic_answer():
    packet = {
        "expert_depth": "residential_standard",
        "selected_contract": "accessible_child_support_plan",
    }
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer=GENERIC_LIVE_ANSWER,
        prompt_text=GDD_PROMPT,
        message=GDD_PROMPT,
        mode="Ask ORB",
        record_learning=False,
        apply_gate_fixes=False,
    )
    assert meta.get("final_answer_validation_passed") is True
    assert "creating a child-friendly support plan" not in answer.lower()
    assert "my support plan" in answer.lower()


def test_streaming_and_non_streaming_both_sanitise():
    streamed = f"Creating a child-friendly support plan…\n\n{GENERIC_LIVE_ANSWER}"
    merged = merge_stream_answer(
        fast_opening="Start with what is safest and most practical right now.",
        model_answer=GENERIC_LIVE_ANSWER,
        streamed_text=streamed,
    )
    cleaned = strip_streaming_artifacts_from_answer(merged)
    sanitized = sanitize_final_answer(cleaned, family_id="accessible_child_support_plan")
    repaired, meta = repair_and_validate_final_answer(
        sanitized,
        contract_family="accessible_child_support_plan",
        message=GDD_PROMPT,
    )
    assert meta["final_answer_validation_passed"] is True
    assert "start with what is safest" not in repaired.lower()


def test_gdd_prompt_avoids_excessive_retrieval_bloat():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
    from services.orb_universal_answer_contract_map_service import STANDARD_DEPTH_PROMPT_CHAR_CAP

    estimate = orb_knowledge_retrieval_service.estimate_prompt_assembly_chars(
        GDD_PROMPT,
        mode="Ask ORB",
    )
    assert estimate["selected_contract"] == "accessible_child_support_plan"
    assert estimate["simple_standard_contract"] is True
    assert estimate["retrieval_count"] <= 8
    assert estimate["embedding_calls"] == 0
    assert estimate["prompt_chars"] <= STANDARD_DEPTH_PROMPT_CHAR_CAP
