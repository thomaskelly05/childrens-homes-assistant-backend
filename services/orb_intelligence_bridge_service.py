"""OS-ready intelligence bridge — standalone implemented; operational stub only."""

from __future__ import annotations

from typing import Any, Literal

from schemas.orb_intelligence_output import OrbIntelligenceBoundary, OrbIntelligenceOutput
from services.orb_intelligence_output_service import (
    STANDALONE_BOUNDARY_NOTICE,
    orb_intelligence_output_service,
)

IntelligenceSurface = Literal["standalone", "operational"]


class OrbIntelligenceBridgeService:
    """Future path for /orb and /assistant/orb to share intelligence without cross-wiring data."""

    def allowed_surface(self, surface: str) -> bool:
        return surface in {"standalone", "standalone_orb_ai", "operational", "operational_os_orb"}

    def build_boundary(self, surface: str) -> OrbIntelligenceBoundary:
        if surface in {"operational", "operational_os_orb"}:
            return OrbIntelligenceBoundary(
                surface=surface,
                standalone_only=False,
                os_linked=True,
                care_record_access=True,
                notice="Operational ORB may use permissioned OS context when wired.",
            )
        return orb_intelligence_output_service.build_safety_boundaries(surface="standalone")

    def normalise_output(self, output: OrbIntelligenceOutput | dict[str, Any]) -> OrbIntelligenceOutput:
        if isinstance(output, OrbIntelligenceOutput):
            return output
        return OrbIntelligenceOutput.model_validate(output)

    async def run_standalone_intelligence(self, request: dict[str, Any]) -> dict[str, Any]:
        """Route standalone intelligence requests to document, agent or deep research handlers."""
        kind = str(request.get("kind") or "agent").strip().lower()
        if kind == "document":
            from schemas.orb_documents import OrbDocumentAnalysisRequest
            from services.orb_document_understanding_service import orb_document_understanding_service

            doc_request = OrbDocumentAnalysisRequest.model_validate(request.get("document") or {})
            understanding = await orb_document_understanding_service.analyse_document(doc_request)
            output = orb_intelligence_output_service.from_document_analysis(understanding)
            output.boundaries = self.build_boundary("standalone")
            return {
                "success": True,
                "surface": "standalone",
                "intelligence_output": output.model_dump(),
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
            }

        if kind == "deep_research":
            from schemas.orb_agents import OrbDeepResearchRequest
            from services.orb_deep_research_service import orb_deep_research_service

            research_request = OrbDeepResearchRequest.model_validate(request.get("deep_research") or request)
            result = await orb_deep_research_service.run_deep_research(research_request)
            output = orb_intelligence_output_service.from_deep_research(result)
            output.boundaries = self.build_boundary("standalone")
            return {
                "success": result.success,
                "surface": "standalone",
                "intelligence_output": output.model_dump(),
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
            }

        from schemas.orb_agents import OrbAgentRunRequest
        from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service

        agent_request = OrbAgentRunRequest.model_validate(request.get("agent") or request)
        agent_result = await orb_agent_orchestrator_service.run_agent(agent_request)
        output = orb_intelligence_output_service.from_agent_run(agent_result)
        if (agent_result.context_used or {}).get("evaluation"):
            output = orb_intelligence_output_service.attach_evaluation(
                output,
                (agent_result.context_used or {})["evaluation"],
            )
        output.boundaries = self.build_boundary("standalone")
        return {
            "success": agent_result.success,
            "surface": "standalone",
            "intelligence_output": output.model_dump(),
            "agent_run": agent_result.model_dump(),
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }

    async def run_operational_intelligence(self, request: dict[str, Any]) -> dict[str, Any]:
        """Stub — operational OS intelligence is not wired in this pass."""
        _ = request
        return {
            "success": False,
            "surface": "operational",
            "error": "not_wired",
            "message": (
                "Operational intelligence bridge is not wired in this pass. "
                "Use /assistant/orb for permissioned OS ORB. "
                f"{STANDALONE_BOUNDARY_NOTICE}"
            ),
            "standalone_only": False,
            "os_linked": False,
            "care_record_access": False,
        }


orb_intelligence_bridge_service = OrbIntelligenceBridgeService()
