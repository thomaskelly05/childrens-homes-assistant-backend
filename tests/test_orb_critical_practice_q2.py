"""Q2 — Critical-50 GOLD failure hardening for six high-risk practice scenarios."""

from __future__ import annotations

import pytest

from services.orb_answer_quality_gate_service import orb_answer_quality_gate_service
from services.orb_critical_practice_answer_service import (
    detect_critical_practice_family,
    try_build_critical_practice_answer,
)
from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_recording_output_contract_service import (
    recording_contract_blocked_by_safeguarding,
    try_build_recording_contract_answer,
)
from services.orb_scenario_quality_gate_service import orb_scenario_quality_gate_service

GOLD_IDS = (
    "GOLD-019-repeated-restraint",
    "GOLD-020-weak-restraint-record",
    "GOLD-023-medication-error",
    "GOLD-029-parent-restraint-complaint",
    "GOLD-080-conflicting-accounts",
    "GOLD-049-hospital-escalation",
)

NON_REGRESSION_GOLD_IDS = (
    "GOLD-018-restraint-injury-complaint",
    "GOLD-062-ri-drift",
)

PROMPTS = {
    "GOLD-019-repeated-restraint": (
        "Fourth restraint this month for same child. BSP last reviewed 8 months ago."
    ),
    "GOLD-020-weak-restraint-record": (
        "Restraint record says 'YP kicked off' with no antecedent, duration, or debrief documented."
    ),
    "GOLD-023-medication-error": (
        "Wrong child's evening dose given. Controlled drug chart discrepancy noticed at handover."
    ),
    "GOLD-029-parent-restraint-complaint": (
        "Parent alleges excessive restraint and wants CCTV. We don't have CCTV in lounge."
    ),
    "GOLD-080-conflicting-accounts": (
        "Two staff give different restraint timelines; child says restraint lasted 'ages'."
    ),
    "GOLD-049-hospital-escalation": (
        "Head injury after fall in bathroom; child drowsy. What to do and record?"
    ),
    "GOLD-018-restraint-injury-complaint": (
        "Parent emailed that child has bruising after restraint. Staff account differs from child's."
    ),
    "GOLD-062-ri-drift": (
        "Restraint and missing trends up across two homes; local managers say staffing."
    ),
}

_FAMILY_BY_ID = {
    "GOLD-019-repeated-restraint": "repeated_restraint_trend",
    "GOLD-020-weak-restraint-record": "weak_restraint_record",
    "GOLD-023-medication-error": "medication_error",
    "GOLD-029-parent-restraint-complaint": "parent_complaint_restraint",
    "GOLD-080-conflicting-accounts": "conflicting_staff_accounts",
    "GOLD-049-hospital-escalation": "hospital_escalation",
    "GOLD-018-restraint-injury-complaint": "restraint_injury_complaint",
    "GOLD-062-ri-drift": "ri_governance_drift",
}

_FORBIDDEN = (
    "attention seeking",
    "manipulative",
    "chose to kick off",
    "will be outstanding",
    "guarantee compliance",
    "the child has adhd",
)

_REQUIRED_SNIPPETS = {
    "GOLD-019-repeated-restraint": ("trend", "bsp review", "therapeutic alternative", "child voice"),
    "GOLD-020-weak-restraint-record": (
        "not ready to sign off",
        "antecedent-behaviour-consequence",
        "factual language",
        "reg 12",
    ),
    "GOLD-023-medication-error": (
        "immediate safety",
        "gp/nhs advice",
        "notify manager",
        "learning",
        "cqc/ofsted notification uncertainty",
    ),
    "GOLD-029-parent-restraint-complaint": (
        "take seriously",
        "accounts",
        "complaints process",
        "reg 12",
        "do not invent cctv",
    ),
    "GOLD-080-conflicting-accounts": (
        "neutral fact-finding",
        "do not pick side",
        "cctv if exists",
        "child voice",
    ),
    "GOLD-049-hospital-escalation": (
        "emergency services",
        "do not diagnose",
        "notify manager/parents per protocol",
        "body map",
    ),
}


@pytest.mark.parametrize("scenario_id", GOLD_IDS)
def test_detects_critical_practice_family(scenario_id: str):
    prompt = PROMPTS[scenario_id]
    assert detect_critical_practice_family(prompt) == _FAMILY_BY_ID[scenario_id]


@pytest.mark.parametrize("scenario_id", GOLD_IDS)
def test_try_build_critical_practice_answer_includes_required_elements(scenario_id: str):
    answer = try_build_critical_practice_answer(PROMPTS[scenario_id])
    assert answer
    lower = answer.lower()
    for snippet in _REQUIRED_SNIPPETS[scenario_id]:
        assert snippet in lower, f"missing {snippet!r} in {scenario_id}"
    for phrase in _FORBIDDEN:
        assert phrase not in lower


@pytest.mark.parametrize("scenario_id", GOLD_IDS)
def test_execution_policy_returns_critical_practice_deterministic_answer(scenario_id: str):
    prompt = PROMPTS[scenario_id]
    policy = orb_execution_policy_service.resolve(prompt)
    result = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    assert result is not None
    assert result.get("no_llm") is True
    answer = str(result.get("answer") or "").lower()
    for snippet in _REQUIRED_SNIPPETS[scenario_id]:
        assert snippet in answer


@pytest.mark.parametrize("scenario_id", GOLD_IDS)
def test_critical_50_quality_gate_passes_for_scenario(scenario_id: str):
    scenario = orb_expert_scenario_bank_service.get_gold_scenario(scenario_id)
    assert scenario is not None
    answer, _provider = orb_scenario_quality_gate_service.generate_answer(
        scenario, use_live_provider=False
    )
    result = orb_scenario_quality_gate_service.evaluate_scenario(scenario, answer)
    assert result.passed, result.issues


def test_hospital_escalation_do_not_diagnose_is_not_flagged_as_diagnosis():
    answer = try_build_critical_practice_answer(PROMPTS["GOLD-049-hospital-escalation"])
    assert answer
    gate = orb_answer_quality_gate_service.evaluate_text(answer, risk_level="high")
    assert "diagnosis" not in (gate.get("critical_flags") or [])


def test_critical_50_improves_from_baseline_44_of_50():
    report = orb_scenario_quality_gate_service.run_set("critical-50", use_live_provider=False)
    assert report["passed"] == report["scenario_count"] == 50
    for scenario_id in (*GOLD_IDS, *NON_REGRESSION_GOLD_IDS):
        row = next(r for r in report["results"] if r["scenario_id"] == scenario_id)
        assert row["passed"] is True


def test_gold_018_routes_to_restraint_injury_complaint_not_parent_complaint():
    prompt = PROMPTS["GOLD-018-restraint-injury-complaint"]
    assert detect_critical_practice_family(prompt) == "restraint_injury_complaint"
    answer = try_build_critical_practice_answer(prompt)
    assert answer
    lower = answer.lower()
    assert "parent complaint about restraint" not in lower
    for snippet in (
        "bruising",
        "body map",
        "conflicting accounts",
        "staff account",
        "child voice",
        "lado consideration",
        "neutral investigation",
        "reg 12/13",
        "debrief",
        "manager review",
    ):
        assert snippet in lower, f"missing {snippet!r}"
    assert "do not conclude that restraint was justified" in lower
    assert "restraint was appropriate" not in lower


def test_gold_062_routes_to_ri_governance_not_single_child_restraint_trend():
    prompt = PROMPTS["GOLD-062-ri-drift"]
    assert detect_critical_practice_family(prompt) == "ri_governance_drift"
    answer = try_build_critical_practice_answer(prompt)
    assert answer
    lower = answer.lower()
    assert "## repeated restraint trend" not in lower
    for snippet in (
        "provider oversight",
        "across homes",
        "restraint and missing trends",
        "challenge",
        "themes",
        "evidence of learning",
        "staffing alone",
    ):
        assert snippet in lower, f"missing {snippet!r}"


@pytest.mark.parametrize("scenario_id", NON_REGRESSION_GOLD_IDS)
def test_non_regression_gold_scenarios_pass_critical_50(scenario_id: str):
    scenario = orb_expert_scenario_bank_service.get_gold_scenario(scenario_id)
    assert scenario is not None
    answer, _provider = orb_scenario_quality_gate_service.generate_answer(
        scenario, use_live_provider=False
    )
    result = orb_scenario_quality_gate_service.evaluate_scenario(scenario, answer)
    assert result.passed, result.issues


def test_q1_recording_contract_not_used_for_critical_practice_prompts():
    for scenario_id in GOLD_IDS:
        prompt = PROMPTS[scenario_id]
        policy = orb_execution_policy_service.resolve(prompt)
        if recording_contract_blocked_by_safeguarding(
            prompt,
            execution_policy=policy.execution_policy,
            contract_family=policy.selected_contract,
        ):
            continue
        assert try_build_recording_contract_answer(
            prompt,
            execution_policy=policy.execution_policy,
            contract_family=policy.selected_contract,
        ) is None


def test_medication_error_not_routed_to_handover_template():
    prompt = PROMPTS["GOLD-023-medication-error"]
    policy = orb_execution_policy_service.resolve(prompt)
    result = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    answer = str((result or {}).get("answer") or "").lower()
    assert "paste your shift notes" not in answer
    assert "immediate safety" in answer
    assert "gp/nhs advice" in answer


def test_weak_restraint_not_routed_to_team_debrief_template():
    prompt = PROMPTS["GOLD-020-weak-restraint-record"]
    policy = orb_execution_policy_service.resolve(prompt)
    result = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    answer = str((result or {}).get("answer") or "").lower()
    assert "team learning / debrief" not in answer
    assert "not ready to sign off" in answer


def test_repeated_restraint_not_generic_incident_template():
    prompt = PROMPTS["GOLD-019-repeated-restraint"]
    policy = orb_execution_policy_service.resolve(prompt)
    result = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    answer = str((result or {}).get("answer") or "").lower()
    assert "paste what happened" not in answer
    assert "trend" in answer


NATURAL_LANGUAGE_PROMPTS = {
    "B2-repeated-restraint-natural": (
        "This is the fourth time this month that the same young person has been physically "
        "held during evening routines. Help me reflect on what needs to be reviewed.",
        "repeated_restraint_trend",
        ("trend", "bsp review", "child voice", "manager", "debrief", "therapeutic alternative"),
    ),
    "B3-medication-error-natural": (
        "A young person was given their evening medication late and staff are unsure whether "
        "the dose timing may affect them. Help me think through what needs recording and what "
        "steps staff should consider.",
        "medication_error",
        (
            "immediate safety",
            "notify manager",
            "gp/nhs advice",
            "incident record",
            "learning",
            "mar chart",
        ),
    ),
    "B4-conflicting-accounts-natural": (
        "Two staff have given different accounts of what happened during an incident, and the "
        "young person's account is different again. Help me record this safely.",
        "conflicting_staff_accounts",
        ("do not pick side", "neutral fact-finding", "child voice", "preserve original records"),
    ),
}


@pytest.mark.parametrize("case_id", tuple(NATURAL_LANGUAGE_PROMPTS.keys()))
def test_natural_language_critical_practice_routing(case_id: str):
    prompt, family_id, _snippets = NATURAL_LANGUAGE_PROMPTS[case_id]
    assert detect_critical_practice_family(prompt) == family_id
    policy = orb_execution_policy_service.resolve(prompt)
    result = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    assert result is not None
    assert result.get("no_llm") is True


@pytest.mark.parametrize("case_id", tuple(NATURAL_LANGUAGE_PROMPTS.keys()))
def test_natural_language_critical_practice_answer_markers(case_id: str):
    prompt, _family_id, snippets = NATURAL_LANGUAGE_PROMPTS[case_id]
    answer = try_build_critical_practice_answer(prompt)
    assert answer
    lower = answer.lower()
    for snippet in snippets:
        assert snippet in lower, f"missing {snippet!r} in {case_id}"
    for phrase in _FORBIDDEN:
        assert phrase not in lower


def test_natural_language_routing_does_not_capture_routine_daily_medication_log():
    prompt = "Help me write daily medication log for evening routine."
    assert detect_critical_practice_family(prompt) is None
