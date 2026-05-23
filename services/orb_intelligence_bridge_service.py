"""OS-ready intelligence bridge — standalone and operational paths."""

from __future__ import annotations

from typing import Any, Literal

from schemas.orb_intelligence_output import OrbIntelligenceBoundary, OrbIntelligenceOutput
from schemas.orb_operational import OrbOperationalRequest, OrbOperationalResponse
from services.orb_intelligence_output_service import (
    STANDALONE_BOUNDARY_NOTICE,
    orb_intelligence_output_service,
)

IntelligenceSurface = Literal["standalone", "operational"]

OPERATIONAL_BOUNDARY_NOTICE = (
    "Operational ORB uses permissioned IndiCare OS context summaries for your role only."
)


class OrbIntelligenceBridgeService:
    """Shared intelligence path for /orb and /assistant/orb without cross-wiring data."""

    def allowed_surface(self, surface: str) -> bool:
        return surface in {"standalone", "standalone_orb_ai", "operational", "operational_os_orb"}

    def build_boundary(self, surface: str) -> OrbIntelligenceBoundary:
        if surface in {"operational", "operational_os_orb"}:
            return OrbIntelligenceBoundary(
                surface=surface,
                standalone_only=False,
                os_linked=True,
                care_record_access=True,
                notice=OPERATIONAL_BOUNDARY_NOTICE,
            )
        return orb_intelligence_output_service.build_safety_boundaries(surface="standalone")

    def build_operational_boundary(
        self,
        current_user: dict[str, Any],
        scope: str,
    ) -> OrbIntelligenceBoundary:
        _ = current_user
        boundary = self.build_boundary("operational_os_orb")
        boundary.notice = f"{OPERATIONAL_BOUNDARY_NOTICE} Scope: {scope}."
        return boundary

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

    async def run_operational_intelligence(
        self,
        request: dict[str, Any] | OrbOperationalRequest,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        """Permissioned operational intelligence for /assistant/orb."""
        from services.orb_operational_assistant_service import orb_operational_assistant_service

        if current_user is None:
            return {
                "success": False,
                "surface": "operational",
                "error": "unauthorised",
                "message": "Operational intelligence requires an authenticated user.",
                "standalone_only": False,
                "os_linked": True,
                "care_record_access": False,
                "permissioned_context": True,
            }

        op_request = (
            request
            if isinstance(request, OrbOperationalRequest)
            else OrbOperationalRequest.model_validate(request)
        )
        context = await self.collect_safe_operational_context(op_request, current_user, conn=conn)
        routed_mode = self.route_operational_task(op_request)
        if routed_mode != op_request.mode:
            op_request = op_request.model_copy(update={"mode": routed_mode})

        response = await orb_operational_assistant_service.answer(op_request, current_user, conn=conn)
        output = self.evaluate_operational_output(response)
        audit_reference = self.audit_operational_intelligence_use(op_request, response, current_user)

        return {
            "success": True,
            "surface": "operational",
            "data": response.model_dump(),
            "intelligence_output": (
                output.intelligence_output.model_dump() if output.intelligence_output else None
            ),
            "context_summary": output.context_summary.model_dump(),
            "standalone_only": False,
            "os_linked": True,
            "care_record_access": output.care_record_access,
            "permissioned_context": True,
            "audit_reference": audit_reference,
            "context_collected": bool(context.get("raw_available")),
        }

    async def collect_safe_operational_context(
        self,
        request: OrbOperationalRequest | dict[str, Any],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any]:
        from services.orb_operational_context_service import orb_operational_context_bridge

        req = (
            request
            if isinstance(request, OrbOperationalRequest)
            else OrbOperationalRequest.model_validate(request)
        )
        return orb_operational_context_bridge.build_context(req, current_user, conn=conn)

    def summarise_operational_context(self, context: dict[str, Any]) -> dict[str, Any]:
        from services.orb_operational_context_service import orb_operational_context_bridge

        return orb_operational_context_bridge.summarise_context(context)

    def route_operational_task(self, request: OrbOperationalRequest) -> str:
        message = request.message.lower()
        mode = request.mode
        if mode != "general_operational_question":
            return mode
        if any(term in message for term in ("attention today", "daily brief", "manager review today")):
            return "manager_daily_brief"
        if any(term in message for term in ("record quality", "recording quality", "weak recording")):
            return "record_quality_review"
        if any(term in message for term in ("safeguarding theme", "safeguarding pattern", "emerging risk")):
            return "safeguarding_themes"
        if any(term in message for term in ("ofsted", "inspection evidence", "quality standard")):
            return "ofsted_evidence_review"
        if any(term in message for term in ("priorit", "action board", "what should i do")):
            return "action_priority"
        if any(term in message for term in ("staff member", "supervision", "workforce")):
            return "staff_support"
        if any(term in message for term in ("child journey", "young person", "last 7 days", "chronology")):
            return "child_journey_summary"
        if any(term in message for term in ("governance", "reg 44", "reg 45", "reg44", "reg45")):
            return "governance_briefing"
        return mode

    def evaluate_operational_output(
        self,
        output: OrbOperationalResponse | dict[str, Any],
    ) -> OrbOperationalResponse:
        if isinstance(output, OrbOperationalResponse):
            return output
        return OrbOperationalResponse.model_validate(output)

    def audit_operational_intelligence_use(
        self,
        request: OrbOperationalRequest,
        output: OrbOperationalResponse,
        current_user: dict[str, Any],
    ) -> str | None:
        try:
            from services.audit_event_service import record_audit_event

            reference = output.audit_reference or "orb-operational"
            record_audit_event(
                event_type="orb",
                action="operational_intelligence",
                outcome="success",
                actor=current_user,
                resource_type="orb_operational",
                resource_id=reference,
                metadata={
                    "mode": request.mode,
                    "scope": request.scope,
                    "home_id": request.home_id,
                    "child_id": request.child_id,
                    "staff_id": request.staff_id,
                    "care_record_access": output.care_record_access,
                    "degraded": output.context_summary.degraded,
                },
            )
            return reference
        except Exception:
            return output.audit_reference


orb_intelligence_bridge_service = OrbIntelligenceBridgeService()
