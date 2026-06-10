"""Ofsted-readiness scoring tests."""

from __future__ import annotations

from services.orb_execution_policy_service import (
    DAILY_NOTE_DETERMINISTIC_ANSWER,
    orb_execution_policy_service,
)
from services.orb_ofsted_readiness_scoring_service import orb_ofsted_readiness_scoring_service


def test_ofsted_score_passes_for_daily_note_template():
    score = orb_ofsted_readiness_scoring_service.score_answer(
        DAILY_NOTE_DETERMINISTIC_ANSWER,
        prompt="Help me write a daily note",
        contract_family="daily_record",
        execution_policy="deterministic_only",
        openai_called=False,
        deterministic_available=True,
    )
    assert score["no-invented-facts"] == "pass"
    assert score["internal-first"] == "pass"
    assert score["cost-control"] == "pass"
    assert score["recording-quality"] >= 2


def test_ofsted_score_fails_without_child_voice_for_full_answer():
    score = orb_ofsted_readiness_scoring_service.score_answer(
        "Record what happened and staff response.",
        prompt="Write today's daily note",
        contract_family="daily_record",
        execution_policy="openai_compact",
        openai_called=True,
    )
    assert score["child-voice"] < 3
    assert score["ofsted_ready"] is False


def test_ofsted_score_fails_without_recording_quality():
    score = orb_ofsted_readiness_scoring_service.score_answer(
        "Be kind and supportive on shift.",
        prompt="Help me record today",
        contract_family="daily_record",
        execution_policy="openai_compact",
        openai_called=True,
    )
    assert score["recording-quality"] < 3


def test_ofsted_ready_requires_no_invented_facts():
    score = orb_ofsted_readiness_scoring_service.score_answer(
        "Jamie was calm at breakfast at 8am and staff member John supported him.",
        prompt="Help me write a daily note",
        contract_family="daily_record",
        execution_policy="openai_compact",
        openai_called=True,
    )
    assert score["no-invented-facts"] == "fail"
    assert score["ofsted_ready"] is False


def test_reg44_template_scores_ofsted_ready():
    from services.orb_execution_policy_service import REG44_CHECKLIST_DETERMINISTIC_ANSWER

    score = orb_ofsted_readiness_scoring_service.score_answer(
        REG44_CHECKLIST_DETERMINISTIC_ANSWER,
        prompt="Give me a Reg 44 evidence checklist",
        contract_family="reg44_visitor",
        execution_policy="deterministic_only",
        openai_called=False,
        deterministic_available=True,
    )
    assert score["evidence-based"] >= 3
    assert score["ofsted_ready"] is True


def test_mandatory_safeguarding_high_risk_scoring():
    score = orb_ofsted_readiness_scoring_service.score_answer(
        "Listen calmly, keep them safe, notify the manager immediately, record factually, "
        "do not investigate, follow local safeguarding procedures and escalate.",
        prompt="disclosed abuse",
        contract_family="abuse_disclosure",
        execution_policy="openai_mandatory_safeguarding",
        openai_called=True,
        high_risk=True,
    )
    assert score["safeguarding-aware"] >= 3
    assert score["professional-boundary"] >= 2
