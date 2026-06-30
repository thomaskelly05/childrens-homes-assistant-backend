"""Phase Q1 — ORB recording output contract hardening tests."""

from __future__ import annotations

import pytest

from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_final_answer_repair_service import apply_deterministic_repairs, canonical_answer_for_qa
from services.orb_placeholder_quality_guard_service import sanitize_placeholders_in_answer
from services.orb_recording_output_contract_service import (
    build_context_drift_correction_answer,
    build_daily_record_contract_answer,
    build_incident_reflection_contract_answer,
    build_missing_return_contract_answer,
    find_pathway_drift_issues,
    has_concrete_recording_facts,
    has_recording_contract_sections,
    is_recording_contract_prompt,
    recording_contract_blocked_by_safeguarding,
    try_build_recording_contract_answer,
    validate_recording_contract_answer,
)
from services.orb_scenario_quality_gate_service import orb_scenario_quality_gate_service

REG_A_PROMPT = (
    "A young person became upset after contact and refused to join the evening meal. "
    "Staff gave them space, checked in calmly, and later supported them to talk about what had happened. "
    "Help me write this as a therapeutic, child-centred daily record."
)

REG_B_PROMPT = (
    "A young person shouted at staff, pushed a chair over and went to their bedroom after being told "
    "they could not have extra screen time. Staff gave them space, checked they were safe, and later "
    "completed a restorative conversation. Help me write this as a safe, factual, therapeutic incident "
    "reflection that avoids blame and shows what adults did to support the young person."
)

REG_C_PROMPT = (
    "The incident was not missing-from-care. The young person did not leave the home. They shouted after "
    "a screen time boundary, pushed a chair over, went to their bedroom, staff checked they were safe, "
    "and later completed a restorative conversation. Audit your previous answer. What pathway did you "
    "introduce incorrectly, and rewrite the guidance so it only relates to this incident."
)

REG_D_PROMPT = (
    "A young person has returned to the home after being missing for several hours. "
    "They appear tired, hungry and reluctant to talk. What should staff do immediately and "
    "how should this be recorded?"
)

SELF_HARM_WRITE_PROMPT = (
    "A young person said they wanted to die and tried to harm themselves using a ligature. "
    "Staff removed the ligature, stayed with them, called the manager and followed the home's "
    "safeguarding procedure. Help me write an incident reflection with escalation."
)

DISCLOSURE_WRITE_PROMPT = (
    "A young person disclosed that an adult hurt them during contact. "
    "Help me write a safe incident reflection and what staff should do next."
)

ACTIVE_MISSING_WRITE_PROMPT = (
    "A young person has left the home and their whereabouts are unknown. "
    "Help me write an incident record."
)


def test_reg_a_requires_child_voice_and_follow_up_prompts():
    answer = build_daily_record_contract_answer(REG_A_PROMPT)
    lower = answer.lower()
    assert "exact words" in lower
    assert "outcome" in lower
    assert "follow-up" in lower
    issues = find_pathway_drift_issues(answer, REG_A_PROMPT)
    assert not issues
    for forbidden in ("missing from care", "lado", "regulation 40"):
        assert forbidden not in lower


def test_reg_b_requires_full_incident_sequence_without_pathway_drift():
    answer = build_incident_reflection_contract_answer(REG_B_PROMPT)
    lower = answer.lower()
    for term in ("screen", "shouted", "chair", "bedroom", "safe", "restorative"):
        assert term in lower
    assert "[[NAME_" not in answer
    assert "[NAME_" not in answer
    issues = find_pathway_drift_issues(answer, REG_B_PROMPT)
    assert not issues
    for forbidden in ("missing from care", "lado", "regulation 40"):
        assert forbidden not in lower or "only relevant" in lower


def test_reg_c_acknowledges_drift_and_lists_removed_pathways():
    answer = build_context_drift_correction_answer(REG_C_PROMPT)
    lower = answer.lower()
    assert "incorrectly introduced" in lower
    assert "did not leave the home" in lower
    assert "remove from guidance" in lower
    for removed in ("police", "return home interview", "missing-from-care", "exploitation"):
        assert removed in lower
    issues = find_pathway_drift_issues(answer, REG_C_PROMPT)
    assert not issues


def test_reg_d_requires_welcome_welfare_and_safeguarding_boundaries():
    answer = build_missing_return_contract_answer(REG_D_PROMPT)
    lower = answer.lower()
    for term in (
        "welcome",
        "welfare",
        "injuries",
        "distress",
        "intoxication",
        "hunger",
        "fatigue",
        "shame",
        "blame",
        "manager",
        "social worker",
        "111",
        "999",
        "return home interview",
        "missing",
        "risk",
        "placement plan",
        "lado",
    ):
        assert term in lower, f"missing required term: {term}"


def test_incident_safer_wording_omits_screen_time_when_not_in_facts():
    non_screen = (
        "A young person shouted at staff and went to their bedroom. "
        "Staff checked they were safe. Help me write an incident reflection."
    )
    answer = build_incident_reflection_contract_answer(non_screen)
    assert "screen-time boundary" not in answer.lower()
    assert "boundary or trigger" in answer.lower()

    screen_answer = build_incident_reflection_contract_answer(REG_B_PROMPT)
    assert "screen-time boundary" in screen_answer.lower()


@pytest.mark.parametrize(
    "prompt,builder,required_terms",
    [
        (
            REG_A_PROMPT,
            build_daily_record_contract_answer,
            ("contact", "meal", "space", "calm", "exact words", "outcome"),
        ),
        (
            REG_B_PROMPT,
            build_incident_reflection_contract_answer,
            ("screen", "shouted", "chair", "bedroom", "restorative"),
        ),
        (
            REG_C_PROMPT,
            build_context_drift_correction_answer,
            ("incorrectly introduced", "did not leave the home", "remove from guidance"),
        ),
        (
            REG_D_PROMPT,
            build_missing_return_contract_answer,
            ("welcome", "welfare", "manager", "111", "999"),
        ),
    ],
)
def test_recording_contract_three_section_shape(prompt, builder, required_terms):
    answer = builder(prompt)
    assert has_recording_contract_sections(answer)
    lower = answer.lower()
    assert lower.index("draft record") < lower.index("what to add before sign-off")
    assert lower.index("what to add before sign-off") < lower.index("why this wording is safer")
    for term in required_terms:
        assert term in lower


def test_concrete_facts_required_for_ordinary_incident_prompts():
    vague = (
        "Help me write an incident reflection for something that happened on shift today "
        "with lots of detail about the young person and staff interactions."
    )
    assert not has_concrete_recording_facts(vague)
    assert not is_recording_contract_prompt(vague)
    assert try_build_recording_contract_answer(vague) is None


def test_placeholder_tokens_sanitised():
    raw = "Staff spoke with [[NAME_11]] about the incident. [NAME_2] checked in."
    cleaned, _issues = sanitize_placeholders_in_answer(raw)
    assert "[[NAME_" not in cleaned
    assert "[NAME_" not in cleaned
    assert "[Young Person]" in cleaned


@pytest.mark.parametrize(
    "prompt",
    [SELF_HARM_WRITE_PROMPT, DISCLOSURE_WRITE_PROMPT, ACTIVE_MISSING_WRITE_PROMPT],
)
def test_safeguarding_write_prompts_block_recording_contract(prompt: str):
    policy = orb_execution_policy_service.resolve(prompt)
    assert recording_contract_blocked_by_safeguarding(
        prompt,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    )
    assert not is_recording_contract_prompt(
        prompt,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    )
    assert try_build_recording_contract_answer(
        prompt,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    ) is None


def test_self_harm_write_prompt_does_not_use_deterministic_recording_template():
    policy = orb_execution_policy_service.resolve(SELF_HARM_WRITE_PROMPT)
    assert recording_contract_blocked_by_safeguarding(
        SELF_HARM_WRITE_PROMPT,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    )
    det = orb_execution_policy_service.try_deterministic_answer(
        SELF_HARM_WRITE_PROMPT,
        policy=policy,
    )
    assert det is None


def test_disclosure_write_prompt_does_not_bypass_safeguarding_route():
    policy = orb_execution_policy_service.resolve(DISCLOSURE_WRITE_PROMPT)
    det = orb_execution_policy_service.try_deterministic_answer(
        DISCLOSURE_WRITE_PROMPT,
        policy=policy,
    )
    assert det is None
    assert recording_contract_blocked_by_safeguarding(
        DISCLOSURE_WRITE_PROMPT,
        execution_policy=policy.execution_policy,
        contract_family=policy.selected_contract,
    )


def test_active_missing_write_prompt_uses_mandatory_safeguarding_not_recording_contract():
    policy = orb_execution_policy_service.resolve(ACTIVE_MISSING_WRITE_PROMPT)
    assert policy.execution_policy == "openai_mandatory_safeguarding"
    det = orb_execution_policy_service.try_deterministic_answer(
        ACTIVE_MISSING_WRITE_PROMPT,
        policy=policy,
    )
    assert det is None


def test_deterministic_execution_policy_uses_recording_contract_for_reg_b():
    result = orb_execution_policy_service.try_deterministic_answer(REG_B_PROMPT)
    assert result is not None
    assert result.get("no_llm") is True
    assert has_recording_contract_sections(str(result.get("answer") or ""))


def test_apply_repairs_rebuilds_generic_incident_with_facts():
    generic = "Absolutely — paste what happened and I'll help you draft a factual incident record."
    repaired, meta = apply_deterministic_repairs(
        generic,
        contract_family="incident_record",
        message=REG_B_PROMPT,
    )
    assert meta.get("repair_reason") == "recording_output_contract"
    assert "chair" in repaired.lower()
    assert "screen" in repaired.lower()


def test_apply_repairs_do_not_rebuild_safeguarding_write_prompts():
    generic = "Paste what happened and I can help you draft a record."
    repaired, meta = apply_deterministic_repairs(
        generic,
        contract_family="incident_record",
        message=SELF_HARM_WRITE_PROMPT,
    )
    assert meta.get("repair_reason") != "recording_output_contract"
    assert not has_recording_contract_sections(repaired)


def test_quality_gate_regression_a_d_pass_mock_mode():
    report = orb_scenario_quality_gate_service.run_set(
        "regression-a-d",
        use_live_provider=False,
    )
    assert report["scenario_count"] == 4
    assert report["failed"] == 0, report


def test_quality_gate_smoke_includes_regression_scenarios():
    scenarios = orb_scenario_quality_gate_service.resolve_set_scenarios("smoke")
    ids = {s["scenario_id"] for s in scenarios}
    assert "REG-A-daily-record-after-contact" in ids
    assert "REG-B-screen-time-incident" in ids
    assert "REG-C-context-drift-correction" in ids
    assert "REG-D-return-from-missing" in ids


def test_quality_gate_smoke_passes_mock_mode():
    report = orb_scenario_quality_gate_service.run_set("smoke", use_live_provider=False)
    failed = [r for r in report["results"] if not r["passed"]]
    assert not failed, failed


def test_canonical_answer_for_daily_record_prompt():
    answer = canonical_answer_for_qa("daily_record", message=REG_A_PROMPT)
    assert answer
    assert has_recording_contract_sections(answer)


def test_validate_recording_contract_rejects_pathway_drift():
    bad = (
        "## Draft record\n\nMissing from care procedure started.\n\n"
        "## What to add before sign-off\n\nx\n\n## Why this wording is safer\n\ny"
    )
    result = validate_recording_contract_answer(bad, REG_B_PROMPT)
    assert result["passed"] is False
    assert any("pathway_drift" in i for i in result["issues"])
