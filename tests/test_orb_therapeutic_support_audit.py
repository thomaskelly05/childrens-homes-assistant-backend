"""Therapeutic support audit — QA prompts and knowledge gap therapeutic scoring."""

from __future__ import annotations

from services.orb_execution_policy_service import orb_execution_policy_service
from services.orb_knowledge_gap_audit_service import orb_knowledge_gap_audit_service
from services.orb_therapeutic_language_contract_service import (
    THERAPEUTIC_QA_PROMPTS,
    run_therapeutic_qa_assertions,
)


def _policy_and_answer(prompt: str) -> tuple[dict, str | None]:
    policy = orb_execution_policy_service.resolve(prompt)
    det = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    return policy.to_dict(), (det or {}).get("answer")


def test_knowledge_gap_audit_includes_therapeutic_scoring():
    report = orb_knowledge_gap_audit_service.run_audit()
    assert report["version"] == "orb-knowledge-gap-audit-v3"
    assert "therapeutic_readiness_score" in report
    assert "therapeutic_language_gap_domains" in report
    assert "child_voice_gap_domains" in report
    assert "therapeutic_pilot_ready" in report
    daily = next(r for r in report["domain_results"] if r["prompt_id"] == "daily_recording")
    assert "therapeutic_scoring" in daily
    assert "therapeutic_language" in daily["therapeutic_scoring"]


def test_daily_note_deterministic_answer_is_non_shaming():
    _, answer = _policy_and_answer("Help me write a daily note")
    assert answer
    assertions = run_therapeutic_qa_assertions(answer, assertions=["non_shaming", "child_centred"])
    assert assertions["non_shaming"] is True


def test_keywork_headings_include_child_voice():
    _, answer = _policy_and_answer("Give me headings for a key-work session")
    assert answer
    assertions = run_therapeutic_qa_assertions(
        answer,
        assertions=["child_voice", "feelings", "agreed_actions"],
    )
    assert assertions["child_voice"] is True


def test_manager_oversight_includes_reflection():
    _, answer = _policy_and_answer("What should a manager oversight note include?")
    assert answer
    assertions = run_therapeutic_qa_assertions(answer, assertions=["reflection", "learning"])
    assert assertions["reflection"] is True or assertions["learning"] is True


def test_reg44_includes_relational_practice_evidence():
    _, answer = _policy_and_answer("Give me a Reg 44 evidence checklist")
    assert answer
    assertions = run_therapeutic_qa_assertions(
        answer,
        assertions=["relational_practice", "child_experience", "evidence"],
    )
    assert assertions["child_experience"] is True
    assert assertions["evidence"] is True


def test_therapeutic_qa_prompts_cover_required_scenarios():
    required = {
        "therapeutic_daily_note_rewrite",
        "therapeutic_attention_seeking_rewrite",
        "therapeutic_incident_repair",
        "therapeutic_missing_return",
        "therapeutic_self_harm_disclosure",
        "therapeutic_autism_school_refusal",
        "therapeutic_gdd_widgets",
        "therapeutic_keywork_family_contact",
        "therapeutic_manager_oversight",
        "therapeutic_reg44_relational",
        "therapeutic_supervision_restraint",
        "therapeutic_transitions_support_plan",
        "therapeutic_behaviour_co_regulation",
        "therapeutic_restorative_repair",
        "therapeutic_complaint_staff_tone",
    }
    prompt_ids = {item["prompt_id"] for item in THERAPEUTIC_QA_PROMPTS}
    assert required.issubset(prompt_ids)
