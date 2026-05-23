"""Evaluation harness for standalone ORB document and agent outputs."""

from __future__ import annotations

from typing import Any

from schemas.orb_evaluation import OrbEvaluationRequest, OrbEvaluationResult
from services.orb_answer_quality_service import orb_answer_quality_service

STANDALONE_EVALUATION_SAFETY = (
    "Standalone ORB does not access live IndiCare OS records. "
    "Outputs are draft guidance for local review."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbEvaluationService:
    """Facade for answer, document, and agent output evaluation."""

    def health(self) -> dict[str, Any]:
        return {
            "status": "ready",
            "service": "orb_evaluation",
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
            "dimensions": [
                "source_grounding",
                "citation_quality",
                "standalone_boundary",
                "child_centred_language",
                "recording_quality",
                "safeguarding_caution",
                "ofsted_relevance",
                "therapeutic_quality",
                "clarity",
                "actionability",
                "british_english",
                "no_fake_source_claims",
            ],
        }

    def evaluate_answer(self, request: OrbEvaluationRequest) -> OrbEvaluationResult:
        result = orb_answer_quality_service.evaluate(request)
        if result.requires_human_review and STANDALONE_EVALUATION_SAFETY not in result.safety_notes:
            result.safety_notes.append(STANDALONE_EVALUATION_SAFETY)
        return result

    def evaluate_document_output(
        self,
        understanding: dict[str, Any],
        *,
        analysis_mode: str | None = None,
    ) -> OrbEvaluationResult:
        parts = [
            _text(understanding.get("plain_english_summary")),
            " ".join(understanding.get("key_themes") or []),
        ]
        action_plan = understanding.get("action_plan") or {}
        for action in action_plan.get("actions") or []:
            parts.append(_text(action.get("action")))
        answer_text = "\n".join(p for p in parts if p)
        requires_action_plan = analysis_mode in {"action_plan", "full_review", "manager_briefing"}
        requires_citations = analysis_mode in {
            "ofsted_lens",
            "policy_comparison",
            "full_review",
        }
        request = OrbEvaluationRequest(
            answer_text=answer_text or "Document analysis output.",
            analysis_mode=analysis_mode,
            sources=understanding.get("sources") or [],
            citations=understanding.get("citations") or [],
            requires_action_plan=requires_action_plan,
            requires_citations=requires_citations,
        )
        result = self.evaluate_answer(request)
        safety = _text(understanding.get("safety_notice"))
        if safety and safety not in result.safety_notes:
            result.safety_notes.append(safety)
        return result

    def evaluate_agent_output(
        self,
        *,
        answer: str,
        sources: list[dict[str, Any]] | None = None,
        citations: list[dict[str, Any]] | None = None,
        agent_type: str | None = None,
        analysis_mode: str | None = None,
    ) -> OrbEvaluationResult:
        requires_action_plan = agent_type == "document_analysis" and analysis_mode in {
            "action_plan",
            "manager_briefing",
        }
        return self.evaluate_answer(
            OrbEvaluationRequest(
                answer_text=answer,
                sources=sources or [],
                citations=citations or [],
                requires_action_plan=requires_action_plan,
                requires_citations=agent_type == "document_analysis",
            )
        )


orb_evaluation_service = OrbEvaluationService()
