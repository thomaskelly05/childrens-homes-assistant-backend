"""Live-output quality polish integration tests for ORB Residential."""

from __future__ import annotations

import re

from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_brain_visibility_service import sanitize_orb_brain_metadata_for_user
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_final_answer_repair_service import (
    canonical_answer_for_qa,
    repair_accessible_child_support_plan,
)
from services.orb_universal_answer_contract_map_service import detect_contract_family


LIVE_PROMPTS = {
    "daily_note": "Help me write a daily note",
    "convert_recording": (
        "Convert this to recording wording: Jamie was attention seeking all night and refused to listen."
    ),
    "missing_cannabis": (
        "A young person has come back from missing for three days and smells of cannabis. What do I do?"
    ),
    "gdd_support_plan": (
        "Create a child-friendly support plan for a 17-year-old with GDD who uses widgets to communicate."
    ),
    "reg44": "What should a Reg 44 visitor be looking for in a children's home?",
}


def test_live_daily_note_compact_and_internal_first():
    det = orb_execution_policy_service.try_deterministic_answer(LIVE_PROMPTS["daily_note"])
    assert det is not None
    answer = det["answer"]
    assert "paste your rough notes" in answer.lower()
    assert len(answer.split()) < 120
    assert not re.search(r"\b(jamie|sarah|he was calm)\b", answer.lower())


def test_live_convert_recording_removes_judgemental_concepts():
    det = orb_execution_policy_service.try_deterministic_answer(LIVE_PROMPTS["convert_recording"])
    answer = det["answer"].lower()
    assert "seek attention" not in answer
    assert "attention seeking" not in answer
    assert "refused to listen" not in answer
    assert "observed to" in answer
    assert "staff remained curious" in answer


def test_live_missing_cannabis_canonical_avoids_lado():
    answer = canonical_answer_for_qa(
        "missing_return_record",
        message=LIVE_PROMPTS["missing_cannabis"],
    )
    assert answer is not None
    lowered = answer.lower()
    assert "welfare" in lowered
    assert "social worker" in lowered
    assert "exploitation" in lowered or "contextual" in lowered
    assert "lado" not in lowered or "only" in lowered


def test_live_gdd_support_plan_no_truncated_placeholders():
    plan = repair_accessible_child_support_plan("", message=LIVE_PROMPTS["gdd_support_plan"])
    assert "…]" not in plan
    assert "[Add a dream or aspiration using my widget, symbol, photo or words]" in plan


def test_live_reg44_residential_evidence_markers():
    det = orb_execution_policy_service.try_deterministic_answer(LIVE_PROMPTS["reg44"])
    assert det is not None
    answer = det["answer"].lower()
    assert "lived experience" in answer or "child" in answer
    assert "consultation" in answer or "staff" in answer
    assert "previous" in answer or "action from previous" in answer
    assert "outstanding grade" not in answer


def test_live_prompts_select_expected_contracts():
    assert detect_contract_family(LIVE_PROMPTS["daily_note"]) == "daily_record"
    assert detect_contract_family(LIVE_PROMPTS["convert_recording"]) == "convert_to_recording_wording"
    assert detect_contract_family(LIVE_PROMPTS["missing_cannabis"]) == "missing_return_record"
    assert detect_contract_family(LIVE_PROMPTS["reg44"]) == "reg44_visitor"


def test_finalize_hides_internal_metadata_from_normal_users():
    packet = {"version": "test", "expert_depth": "residential_standard"}
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="He was attention seeking.",
        prompt_text=LIVE_PROMPTS["daily_note"],
        message=LIVE_PROMPTS["daily_note"],
        record_learning=False,
        apply_gate_fixes=False,
    )
    assert "attention seeking" not in answer.lower()
    staff_view = sanitize_orb_brain_metadata_for_user(meta, {"role": "staff"})
    assert "repair_reason" not in staff_view
    assert "selected_contract" not in staff_view
