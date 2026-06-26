"""ORB missing-from-care vs missing-return response quality."""

from __future__ import annotations

import re

from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_execution_policy_service import (
    deterministic_answer_for_missing_contract,
    is_active_missing_from_care_prompt,
)
from services.orb_final_answer_repair_service import (
    canonical_answer_for_qa,
    repair_missing_return_record,
)
from services.orb_multi_scenario_detector_service import orb_multi_scenario_detector_service
from services.orb_universal_answer_contract_map_service import detect_contract_family

ACTIVE_MISSING_PROMPT = "a young person has gone missing, what do I do"
ACTIVE_MISSING_ALT = "A young person is missing from care right now. What should staff do?"
RETURN_CANNABIS_PROMPT = (
    "A young person has come back from missing for three days and smells of cannabis. What do I do?"
)
HISTORICAL_MISSING_PROMPT = (
    "A young person has gone missing twice this week and received gifts from an older person they met online."
)


def test_active_missing_prompt_detected():
    assert is_active_missing_from_care_prompt(ACTIVE_MISSING_PROMPT) is True
    assert is_active_missing_from_care_prompt(ACTIVE_MISSING_ALT) is True


def test_return_and_historical_prompts_not_active_missing():
    assert is_active_missing_from_care_prompt(RETURN_CANNABIS_PROMPT) is False
    assert is_active_missing_from_care_prompt(HISTORICAL_MISSING_PROMPT) is False


def test_active_missing_routes_to_missing_contract_family():
    assert detect_contract_family(ACTIVE_MISSING_PROMPT) == "missing_return_record"
    multi = orb_multi_scenario_detector_service.detect(ACTIVE_MISSING_PROMPT)
    assert multi["scenario_types"] == ["missing_from_home"]
    brain = orb_brain_convergence_orchestrator_service.build_brain_decision(
        ACTIVE_MISSING_PROMPT,
        mode="Ask ORB",
    )
    assert brain.contract_family == "missing_return_record"
    assert "missing_from_home" in brain.scenario_types


def test_active_missing_answer_is_missing_from_care_not_return_heading():
    answer = canonical_answer_for_qa("missing_return_record", message=ACTIVE_MISSING_PROMPT)
    assert answer is not None
    heading = answer.split("\n", 1)[0]
    assert "missing from care" in heading.lower()
    assert not re.search(r"missing\s+return\s*[—\-]", heading, re.I)


def test_active_missing_answer_includes_procedure_manager_recording_and_return_stage():
    answer = canonical_answer_for_qa("missing_return_record", message=ACTIVE_MISSING_PROMPT)
    assert answer is not None
    lowered = answer.lower()
    assert "missing-from-care concern" in lowered
    assert "missing-from-care procedure" in lowered or "missing procedure" in lowered
    assert "manager/on-call" in lowered
    assert "local policy" in lowered
    assert "record times, actions, decisions" in lowered
    assert "orb is not for emergencies" in lowered
    assert "when the young person returns" in lowered
    assert "welcome back" in lowered
    welcome_idx = lowered.index("welcome back")
    returns_idx = lowered.index("when the young person returns")
    assert returns_idx < welcome_idx


def test_active_missing_repair_replaces_wrong_missing_return_heading():
    wrong = (
        "This looks like a missing-from-care concern.\n\n"
        "Missing return — immediate actions on shift:\n\n"
        "Immediate welfare check\n* Calm welcome back"
    )
    repaired = repair_missing_return_record(wrong, message=ACTIVE_MISSING_PROMPT)
    assert not re.search(r"missing\s+return\s*[—\-]", repaired.split("\n", 2)[0], re.I)
    assert "when the young person returns" in repaired.lower()


def test_return_prompt_keeps_missing_return_heading():
    answer = canonical_answer_for_qa("missing_return_record", message=RETURN_CANNABIS_PROMPT)
    assert answer is not None
    assert re.search(r"missing\s+return\s*[—\-]", answer.split("\n", 1)[0], re.I)
    assert "welcome back" in answer.lower()


def test_deterministic_selector_matches_prompt_stage():
    active = deterministic_answer_for_missing_contract(ACTIVE_MISSING_PROMPT)
    returned = deterministic_answer_for_missing_contract(RETURN_CANNABIS_PROMPT)
    assert "missing from care" in active.split("\n", 1)[0].lower()
    assert re.search(r"missing\s+return\s*[—\-]", returned.split("\n", 1)[0], re.I)
