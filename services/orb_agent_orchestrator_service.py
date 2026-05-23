"""Orchestrates standalone ORB agents — no OS record access."""

from __future__ import annotations

from typing import Any

from schemas.orb_agents import OrbAgentRunRequest, OrbAgentRunResponse
from schemas.orb_documents import OrbDocumentAnalysisMode, OrbDocumentAnalysisRequest
from services.orb_agent_registry_service import orb_agent_registry_service
from services.orb_deep_research_service import orb_deep_research_service
from services.orb_document_understanding_service import orb_document_understanding_service
from services.orb_evaluation_service import orb_evaluation_service
from services.orb_general_assistant_service import orb_general_assistant_service


def _text(value: Any) -> str:
    return str(value or "").strip()


def _format_understanding(understanding: dict[str, Any]) -> str:
    lines = [
        f"# {understanding.get('title', 'Document analysis')}",
        "",
        understanding.get("plain_english_summary", ""),
        "",
    ]
    themes = understanding.get("key_themes") or []
    if themes:
        lines.append("## Key themes")
        for theme in themes:
            lines.append(f"- {theme}")
        lines.append("")
    plan = understanding.get("action_plan") or {}
    actions = plan.get("actions") or []
    if actions:
        lines.append("## Action plan (draft)")
        for action in actions:
            lines.append(
                f"- [{action.get('priority', 'medium').upper()}] {action.get('action')} "
                f"(owner: {action.get('suggested_owner_label') or 'team'}, "
                f"timescale: {action.get('timescale') or 'TBC'})"
            )
        lines.append("")
    if understanding.get("safety_notice"):
        lines.append(f"**Safety:** {understanding['safety_notice']}")
    return "\n".join(lines).strip()


class OrbAgentOrchestratorService:
    async def run(self, request: OrbAgentRunRequest) -> OrbAgentRunResponse:
        agent = orb_agent_registry_service.get_agent(request.agent_id)
        if not agent:
            raise ValueError(f"Unknown agent: {request.agent_id}")

        if agent.agent_type == "document_analysis":
            return await self._run_document_analysis(request, agent.id)

        if agent.agent_type == "deep_research":
            result = orb_deep_research_service.research(request.message, mode=request.mode)
            evaluation = orb_evaluation_service.evaluate_agent_output(
                answer=result["answer"],
                sources=result.get("sources"),
                citations=result.get("citations"),
                agent_type="deep_research",
            )
            return OrbAgentRunResponse(
                agent_id=agent.id,
                agent_type=agent.agent_type,
                answer=result["answer"],
                sources=result.get("sources") or [],
                citations=result.get("citations") or [],
                context_used={
                    "agent": agent.id,
                    "deep_research": True,
                    "os_linked": False,
                    "care_record_access": False,
                },
                evaluation=evaluation.model_dump(),
            )

        answer_result = await orb_general_assistant_service.answer(
            request.message,
            mode=request.mode,
        )
        evaluation = orb_evaluation_service.evaluate_agent_output(
            answer=answer_result.get("answer", ""),
            sources=answer_result.get("sources"),
            citations=answer_result.get("citations"),
            agent_type="general_assistant",
        )
        return OrbAgentRunResponse(
            agent_id=agent.id,
            agent_type=agent.agent_type,
            answer=answer_result.get("answer", ""),
            sources=answer_result.get("sources") or [],
            citations=answer_result.get("citations") or [],
            context_used=answer_result.get("context_used") or {},
            evaluation=evaluation.model_dump(),
        )

    async def _run_document_analysis(
        self,
        request: OrbAgentRunRequest,
        agent_id: str,
    ) -> OrbAgentRunResponse:
        mode: OrbDocumentAnalysisMode = (
            request.analysis_mode  # type: ignore[assignment]
            if request.analysis_mode in {
                "explain",
                "summarise",
                "action_plan",
                "ofsted_lens",
                "safeguarding_lens",
                "recording_lens",
                "therapeutic_lens",
                "policy_comparison",
                "manager_briefing",
                "staff_briefing",
                "full_review",
            }
            else self._infer_analysis_mode(request.message)
        )
        analysis_request = OrbDocumentAnalysisRequest(
            mode=mode,
            source_id=request.source_id,
            title=request.document_title,
            text=request.document_text,
            question=request.message,
        )
        understanding = await orb_document_understanding_service.analyse_document(
            analysis_request
        )
        payload = understanding.model_dump()
        answer = _format_understanding(payload)
        evaluation = understanding.evaluation or orb_evaluation_service.evaluate_document_output(
            payload, analysis_mode=mode
        ).model_dump()
        return OrbAgentRunResponse(
            agent_id=agent_id,
            agent_type="document_analysis",
            answer=answer,
            understanding=payload,
            sources=understanding.sources,
            citations=understanding.citations,
            context_used={
                "agent": agent_id,
                "document_analysis": {
                    "mode": mode,
                    "source_id": request.source_id,
                    "standalone_only": True,
                },
                "os_linked": False,
                "care_record_access": False,
            },
            evaluation=evaluation if isinstance(evaluation, dict) else evaluation,
        )

    def _infer_analysis_mode(self, message: str) -> OrbDocumentAnalysisMode:
        lower = message.lower()
        if "action plan" in lower or "what should we do" in lower:
            return "action_plan"
        if "summar" in lower:
            return "summarise"
        if "ofsted" in lower:
            return "ofsted_lens"
        if "safeguard" in lower:
            return "safeguarding_lens"
        if "recording" in lower or "daily note" in lower:
            return "recording_lens"
        if "compare" in lower and "policy" in lower:
            return "policy_comparison"
        if "manager briefing" in lower or "brief the manager" in lower:
            return "manager_briefing"
        if "staff briefing" in lower:
            return "staff_briefing"
        if "therapeutic" in lower or "trauma" in lower:
            return "therapeutic_lens"
        if "full review" in lower:
            return "full_review"
        return "explain"


orb_agent_orchestrator_service = OrbAgentOrchestratorService()
