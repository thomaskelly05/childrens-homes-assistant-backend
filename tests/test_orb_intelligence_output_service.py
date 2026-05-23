from __future__ import annotations

import pytest

from schemas.orb_agents import OrbAgentOutput, OrbAgentRunResponse
from schemas.orb_documents import (
    OrbDocumentAction,
    OrbDocumentActionPlan,
    OrbDocumentAnalysisResponse,
    OrbDocumentUnderstanding,
)
from schemas.orb_evaluation import OrbEvaluationFlag, OrbEvaluationResult, OrbQualitySummary
from services.orb_intelligence_output_service import orb_intelligence_output_service


def test_from_document_analysis():
    understanding = OrbDocumentUnderstanding(
        title="Policy",
        plain_english_summary="A summary of the policy.",
        key_themes=["safeguarding"],
        action_plan=OrbDocumentActionPlan(
            actions=[OrbDocumentAction(action="Review policy", priority="high")]
        ),
    )
    output = orb_intelligence_output_service.from_document_analysis(
        OrbDocumentAnalysisResponse(understanding=understanding)
    )
    assert output.type == "document_analysis"
    assert output.standalone_only is True
    assert output.os_linked is False
    assert len(output.actions) == 1


def test_from_agent_run():
    response = OrbAgentRunResponse(
        agent_type="document_analysis",
        output=OrbAgentOutput(title="Doc", format="briefing", body="Brief body"),
        context_used={"evaluation": {"overall_score": 0.8, "passed": True}},
    )
    output = orb_intelligence_output_service.from_agent_run(response)
    assert output.type == "document_analysis"
    assert output.summary


def test_attach_evaluation():
    output = orb_intelligence_output_service.from_agent_run(
        OrbAgentRunResponse(
            agent_type="general_research",
            output=OrbAgentOutput(title="T", format="answer", body="Answer"),
        )
    )
    evaluation = OrbEvaluationResult(
        overall_score=0.5,
        passed=False,
        flags=[
            OrbEvaluationFlag(
                code="standalone_boundary_breach",
                message="Claims OS access",
                severity="critical",
            )
        ],
        requires_human_review=True,
    )
    updated = orb_intelligence_output_service.attach_evaluation(output, evaluation)
    assert updated.quality is not None
    assert updated.quality.requires_human_review is True
    assert "OS records" in (updated.safety_notice or "")


def test_build_copy_markdown():
    output = orb_intelligence_output_service.from_document_analysis(
        OrbDocumentUnderstanding(title="T", plain_english_summary="Summary line")
    )
    md = orb_intelligence_output_service.build_copy_markdown(output)
    assert "# T" in md
    assert "Summary line" in md


def test_build_save_envelope_hints():
    output = orb_intelligence_output_service.from_document_analysis(
        OrbDocumentUnderstanding(
            title="Policy review",
            plain_english_summary="Summary",
            analysis_mode="manager_briefing",
        )
    )
    envelope = orb_intelligence_output_service.build_save_envelope(
        output,
        analysis_mode="manager_briefing",
    )
    assert envelope["save_hints"]["save_available"] is True
    assert envelope["save_hints"]["suggested_output_type"] == "manager_briefing"
    assert envelope["saved_output"]["saved"] is False

    saved = orb_intelligence_output_service.build_save_envelope(
        output,
        save_output=True,
        project_id="project-1",
        tags=["briefing"],
    )
    assert saved["saved_output"]["saved"] is True
    assert saved["saved_output"]["output_id"]
