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
}

_FAMILY_BY_ID = {
    "GOLD-019-repeated-restraint": "repeated_restraint_trend",
    "GOLD-020-weak-restraint-record": "weak_restraint_record",
    "GOLD-023-medication-error": "medication_error",
    "GOLD-029-parent-restraint-complaint": "parent_complaint_restraint",
    "GOLD-080-conflicting-accounts": "conflicting_staff_accounts",
    "GOLD-049-hospital-escalation": "hospital_escalation",
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
    assert report["passed"] >= 48
    for scenario_id in GOLD_IDS:
        row = next(r for r in report["results"] if r["scenario_id"] == scenario_id)
        assert row["passed"] is True


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
