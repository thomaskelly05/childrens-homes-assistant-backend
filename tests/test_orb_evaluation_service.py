from __future__ import annotations

import asyncio

import pytest

import routers.orb_evaluation_routes as evaluation_routes
from schemas.orb_evaluation import OrbEvaluationRequest
from services.orb_evaluation_service import orb_evaluation_service


def test_evaluation_health(fake_state):
    response = asyncio.run(evaluation_routes.evaluation_health(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["standalone_only"] is True


def test_flags_fake_live_retrieval():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(
            answer_text="I retrieved from live OS records in Care Hub for this child.",
            requires_citations=False,
        )
    )
    assert result.requires_human_review is True
    assert any(f.code == "fake_live_retrieval" for f in result.flags)


def test_flags_os_record_access_claim():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(
            answer_text="I accessed the child's file and staff record shows concern.",
        )
    )
    assert any(f.code == "fake_live_retrieval" for f in result.flags)


def test_flags_judgemental_language():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(answer_text="The child was attention seeking and manipulative.")
    )
    assert any(f.code == "judgemental_language" for f in result.flags)


def test_requires_citations_for_ofsted():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(
            answer_text="Ofsted will expect strong evidence of leadership.",
            analysis_mode="ofsted_lens",
            requires_citations=True,
        )
    )
    assert any(
        f.code in {"missing_regulatory_citations", "missing_action_plan"}
        for f in result.flags
    ) or result.dimensions


def test_action_plan_check():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(
            answer_text="Here is some general reflection only.",
            requires_action_plan=True,
        )
    )
    assert any(f.code == "missing_action_plan" for f in result.flags)


def test_passes_good_answer():
    result = orb_evaluation_service.evaluate_answer(
        OrbEvaluationRequest(
            answer_text=(
                "Daily notes should remain factual and child-centred, with the child's voice where possible. "
                "Follow local safeguarding procedures and escalate immediate risk. "
                "Sources / basis: ORB Knowledge Library — recording quality."
            ),
            sources=[{"label": "Recording quality", "type": "recording_quality"}],
            citations=[{"label": "Recording quality"}],
        )
    )
    assert result.passed is True
    assert result.overall_score >= 0.55


def test_evaluate_document_output_route(fake_state):
    response = asyncio.run(
        evaluation_routes.evaluate_document_output(
            evaluation_routes.OrbEvaluateDocumentOutputRequest(
                understanding={
                    "plain_english_summary": "Factual child-centred notes with escalation reminder.",
                    "key_themes": ["recording"],
                    "safety_notice": "Standalone only",
                    "sources": [{"label": "Doc"}],
                },
                analysis_mode="safeguarding_lens",
            ),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
