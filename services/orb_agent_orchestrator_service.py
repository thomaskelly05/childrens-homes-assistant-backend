"""Runs standalone ORB specialist agents — Knowledge Library + model router only."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any

from schemas.orb_agents import (
    OrbAgentDefinition,
    OrbAgentFinding,
    OrbAgentOutput,
    OrbAgentOutputFormat,
    OrbAgentRunRequest,
    OrbAgentRunResponse,
    OrbAgentStep,
    OrbAgentType,
)
from schemas.orb_documents import OrbDocumentAnalysisMode, OrbDocumentAnalysisRequest
from schemas.orb_evaluation import OrbEvaluationResult
from services.ai_model_router_service import STANDALONE_LLM_TIMEOUT_SECONDS, ai_model_router_service
from services.orb_agent_registry_service import LIVE_WEB_NOTE, orb_agent_registry_service
from services.orb_brain_metadata_service import merge_context_used
from services.orb_brain_selection_shadow_service import (
    attach_brain_selection_shadow,
    run_brain_selection_shadow,
)
from services.orb_citation_service import orb_citation_service
from services.orb_document_understanding_service import orb_document_understanding_service
from services.orb_evaluation_service import orb_evaluation_service
from schemas.orb_intelligence_output import OrbIntelligenceOutput
from services.orb_intelligence_output_service import orb_intelligence_output_service
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_standalone_sources import append_sources_basis_section
from services.orb_chat_timing_service import (
    OrbChatTimingTracker,
    build_route_timing_payload,
    log_orb_route_timing,
)
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

logger = logging.getLogger("indicare.orb_agent_orchestrator")

STANDALONE_BOUNDARY_SHORT = "Standalone ORB does not access live IndiCare OS records."

OUTPUT_FORMAT_INSTRUCTIONS: dict[OrbAgentOutputFormat, str] = {
    "briefing": """
Structure the response as a manager-style briefing with these headings:
## Summary
## Key points
## Evidence / source basis
## Implications
## Suggested next actions
## Limits / gaps
""".strip(),
    "checklist": """
Structure as a checklist with:
## Checklist items
(numbered items)
## Why it matters
## Evidence / source basis
""".strip(),
    "comparison": """
Structure as a comparison with sections:
## Area | Current position | Source expectation | Gap | Suggested update
(use a clear table or bullet groups per area)
""".strip(),
    "action_plan": """
Structure as:
## Action | Why | Owner placeholder | Priority | Source basis
""".strip(),
    "supervision_guide": """
Structure as:
## Discussion points
## Reflective questions
## Practice examples
## Follow-up actions
""".strip(),
    "evidence_map": """
Structure as:
## Evidence theme | What source expects | What to look for | Possible evidence examples
""".strip(),
    "answer": "Provide a clear, structured answer with practical next steps where helpful.",
}

AGENT_SYSTEM_PREFIX = """
You are a standalone ORB specialist agent for residential children's homes.
You must NOT claim access to live IndiCare OS records, Care Hub, child files, staff records,
chronology or dashboards. Use only the grounding context and user-supplied text.
Cite honestly from the grounding context — do not fabricate URLs or exact statutory quotes.
British English. Calm, practical, child-centred tone.
""".strip()


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbAgentOrchestratorService:
    """Orchestrates standalone agent runs with RAG, citations and model routing."""

    def _with_brain_selection_shadow(
        self,
        context_used: dict[str, Any],
        request: OrbAgentRunRequest,
        agent_type: str,
        *,
        expert_depth: str | None = None,
        route: str = "/orb/standalone/agents/run",
    ) -> dict[str, Any]:
        shadow = run_brain_selection_shadow(
            request.prompt,
            mode=request.mode,
            attachments=request.attachments,
            agent_type=agent_type,
            expert_depth=expert_depth,
            route=route,
        )
        return attach_brain_selection_shadow(context_used, shadow)

    async def run_agent(self, request: OrbAgentRunRequest) -> OrbAgentRunResponse:
        route_started = time.perf_counter()
        timing = OrbChatTimingTracker()
        timing.mark("request_received")
        agent_type, classify_reason = self._resolve_agent_type(request)
        agent = orb_agent_registry_service.get_agent(agent_type)
        if not agent:
            return self.fallback_agent_response(
                ValueError(f"Unknown agent: {agent_type}"),
                request,
                orb_agent_registry_service.get_agent("general_research"),
            )

        if agent_type == "document_analysis":
            doc_response = await self._run_document_analysis_agent(request, agent, classify_reason)
            if doc_response is not None:
                return doc_response

        steps: list[OrbAgentStep] = [
            OrbAgentStep(id="classify", label="Classify request", status="completed", detail=classify_reason),
        ]

        try:
            plan = self.build_agent_plan(agent, request)
            steps.append(OrbAgentStep(id="plan", label="Build agent plan", status="completed", detail=plan.get("summary")))

            timing.mark("context_build_start")
            brain_context = self._build_standalone_brain_context(request)
            timing.mark("retrieval_complete")
            steps.append(
                OrbAgentStep(
                    id="intelligence",
                    label="Build standalone intelligence context",
                    status="completed",
                    detail=_text((brain_context.get("intelligence_packet") or {}).get("expert_depth")),
                )
            )

            retrieval = self.retrieve_agent_sources(agent, request)
            timing.mark("shared_cognition_complete")
            steps.append(
                OrbAgentStep(
                    id="retrieve",
                    label="Retrieve source material",
                    status="completed",
                    detail=f"{len(retrieval.get('source_packs') or [])} packs, "
                    f"{len(retrieval.get('document_results') or [])} library passages",
                )
            )

            prompt = self.build_agent_prompt(agent, request, retrieval, brain_context=brain_context)
            timing.mark("prompt_build_complete")
            steps.append(OrbAgentStep(id="prompt", label="Build evidence summary", status="completed"))

            timing.mark("model_start")
            llm_result = await self._call_model(agent, request, prompt, retrieval)
            timing.mark("model_complete")
            steps.append(OrbAgentStep(id="generate", label="Generate structured output", status="completed"))

            parsed = self.parse_agent_output(
                llm_result.get("text") or "",
                agent,
                request,
                retrieval=retrieval,
            )
            citations = retrieval.get("citations") or []
            sources = retrieval.get("sources") or []
            findings = self.build_findings(parsed.get("body") or "", sources, citations)
            steps.append(OrbAgentStep(id="safety", label="Apply safety boundaries", status="completed"))

            output_format = request.preferred_output or orb_agent_registry_service.default_output_format(agent_type)
            body = append_sources_basis_section(parsed.get("body") or "", sources)
            output = OrbAgentOutput(
                title=parsed.get("title") or agent.name,
                format=output_format,
                body=body,
                structured_sections=parsed.get("structured_sections") or {},
            )

            warnings: list[str] = []
            meta = retrieval.get("retrieval_meta") or {}
            if meta.get("warnings"):
                warnings.extend(meta["warnings"])
            if not (retrieval.get("document_results")):
                warnings.append(LIVE_WEB_NOTE)

            context_used = merge_context_used(
                {
                    "standalone_only": True,
                    "agent": {
                        "type": agent_type,
                        "name": agent.name,
                        "auto_run": True,
                        "classify_reason": classify_reason,
                    },
                    "retrieval": self._retrieval_summary(retrieval),
                    **self._build_agent_intelligence_metadata(brain_context, retrieval),
                },
                surface="orb_standalone",
                mode=request.mode,
                feature="agent",
                lens=agent_type,
                sources=[s.model_dump() if hasattr(s, "model_dump") else s for s in sources],
                citations=[c.model_dump() if hasattr(c, "model_dump") else c for c in citations],
            )
            timing.mark("citations_complete")
            evaluation = self._evaluate_agent_output(
                body,
                sources=sources,
                citations=citations,
                agent_type=agent_type,
            )
            context_used["evaluation"] = evaluation.model_dump()
            packet = brain_context.get("intelligence_packet") or {}
            context_used = self._with_brain_selection_shadow(
                context_used,
                request,
                agent_type,
                expert_depth=packet.get("expert_depth"),
                route=(
                    "/orb/standalone/agents/deep-research"
                    if agent_type == "deep_research"
                    else "/orb/standalone/agents/run"
                ),
            )
            timing.mark("explainability_complete")
            intel_warnings = self._evaluation_warnings(evaluation)
            warnings = list(dict.fromkeys(warnings + intel_warnings))
            model_routing = llm_result.get("model_routing") or {}

            response = OrbAgentRunResponse(
                success=True,
                agent_type=agent_type,
                status="completed",
                output=output,
                findings=findings,
                sources=sources,
                citations=citations,
                steps=steps,
                context_used=context_used,
                model_routing=llm_result.get("model_routing"),
                warnings=warnings,
                safety_notice=self.build_safety_notice(agent, request),
            )
            attached = self._attach_save_metadata(response, request)
            try:
                from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

                timing.mark("governance_complete")
                indicare_ai_governance_event_service.record_from_standalone_response(
                    {
                        "answer": _text(output.body) if output else "",
                        "sources": [s.model_dump() if hasattr(s, "model_dump") else s for s in sources],
                        "citations": [c.model_dump() if hasattr(c, "model_dump") else c for c in citations],
                        "context_used": context_used,
                        "model_routing": llm_result.get("model_routing"),
                        "evaluation": context_used.get("evaluation"),
                    },
                    event_type="agent_run",
                    message=request.query,
                )
            except Exception:
                pass
            timing.mark("response_sent")
            elapsed_ms = int((time.perf_counter() - route_started) * 1000)
            if attached.context_used:
                ctx = dict(attached.context_used)
                ctx["timing"] = build_route_timing_payload(
                    timing,
                    route="/orb/standalone/agents/run",
                    elapsed_ms=elapsed_ms,
                    retrieval_elapsed_ms=(retrieval.get("retrieval_meta") or {}).get("elapsed_ms"),
                    provider_elapsed_ms=model_routing.get("latency_ms"),
                    prompt_char_estimate=len(prompt),
                    model=model_routing.get("model"),
                    provider=model_routing.get("provider"),
                    extra={"agent_type": agent_type},
                )
                log_orb_route_timing(
                    "/orb/standalone/agents/run",
                    ctx["timing"],
                    mode=request.mode,
                )
                attached = attached.model_copy(update={"context_used": ctx})
            return attached
        except Exception as exc:
            logger.warning("agent run failed type=%s error=%s", agent_type, type(exc).__name__, exc_info=True)
            return self.fallback_agent_response(exc, request, agent, steps=steps)

    def _extract_document_payload(self, request: OrbAgentRunRequest) -> tuple[str | None, str | None, str | None]:
        """Return document_text, source_id, title from request and attachments."""
        doc_text = _text(request.document_text)
        source_id = _text(request.document_source_id or request.source_id) or None
        title = _text(request.document_title) or None
        if not doc_text:
            for att in request.attachments:
                content = _text(getattr(att, "content", None))
                if content:
                    doc_text = content
                    if not title:
                        title = _text(getattr(att, "name", None)) or "Attached document"
                    break
        return doc_text or None, source_id, title

    def _preferred_output_to_analysis_mode(
        self,
        preferred: OrbAgentOutputFormat,
        prompt: str,
    ) -> OrbDocumentAnalysisMode:
        lower = prompt.lower()
        if preferred == "action_plan" or "action plan" in lower:
            return "action_plan"
        if preferred == "briefing" or "manager briefing" in lower:
            return "manager_briefing"
        if preferred == "comparison" or "compare" in lower:
            return "policy_comparison"
        if preferred in {"checklist", "evidence_map"}:
            if "ofsted" in lower:
                return "ofsted_lens"
            return "full_review"
        if preferred == "supervision_guide" or "staff guidance" in lower:
            return "staff_briefing"
        return "explain"

    async def _run_document_analysis_agent(
        self,
        request: OrbAgentRunRequest,
        agent: OrbAgentDefinition,
        classify_reason: str,
    ) -> OrbAgentRunResponse | None:
        doc_text, source_id, title = self._extract_document_payload(request)
        if not doc_text and not source_id:
            body = (
                "Upload or paste a document first, then I can analyse it. "
                "Open the Documents panel to upload a file or paste text, "
                "or attach document content when running this agent."
            )
            context_used = merge_context_used(
                {
                    "standalone_only": True,
                    "document_analysis": {
                        "needs_document": True,
                        "document_understanding_service": True,
                    },
                    "agent": {
                        "type": "document_analysis",
                        "name": agent.name,
                        "classify_reason": classify_reason,
                    },
                },
                surface="orb_standalone",
                mode=request.mode,
                feature="agent",
                lens="document_analysis",
            )
            context_used = self._with_brain_selection_shadow(
                context_used,
                request,
                "document_analysis",
            )
            return OrbAgentRunResponse(
                success=True,
                agent_type="document_analysis",
                status="completed",
                output=OrbAgentOutput(
                    title="Document Analysis Agent",
                    format=request.preferred_output,
                    body=body,
                ),
                steps=[
                    OrbAgentStep(
                        id="identify",
                        label="Identify document analysis request",
                        status="completed",
                    ),
                    OrbAgentStep(
                        id="missing_document",
                        label="Awaiting standalone document",
                        status="completed",
                        detail="No document_text or source_id provided",
                    ),
                ],
                context_used=context_used,
                warnings=[STANDALONE_BOUNDARY_SHORT],
                safety_notice=self.build_safety_notice(agent, request),
            )

        analysis_mode = self._preferred_output_to_analysis_mode(request.preferred_output, request.prompt)
        steps: list[OrbAgentStep] = [
            OrbAgentStep(
                id="identify",
                label="Identify document analysis request",
                status="completed",
                detail=classify_reason,
            ),
            OrbAgentStep(
                id="analyse_document",
                label="Analyse standalone document",
                status="running",
            ),
        ]

        doc_request = OrbDocumentAnalysisRequest(
            mode=analysis_mode,
            source_id=source_id,
            text=doc_text if not source_id else None,
            title=title,
            question=request.prompt,
            include_evaluation=True,
        )
        understanding = await orb_document_understanding_service.analyse_document(doc_request)
        steps[-1] = OrbAgentStep(
            id="analyse_document",
            label="Analyse standalone document",
            status="completed",
            detail=analysis_mode,
        )

        retrieval = orb_rag_retrieval_service.retrieve_for_conversation(
            request.prompt,
            mode=request.mode,
            attachments=["document"] if doc_text or source_id else None,
        )
        steps.append(
            OrbAgentStep(
                id="retrieve",
                label="Retrieve related guidance",
                status="completed",
                detail=f"{len(retrieval.get('document_results') or [])} library passages",
            )
        )

        intel = orb_intelligence_output_service.from_document_analysis(understanding)
        body = orb_intelligence_output_service.build_copy_markdown(intel)
        body = append_sources_basis_section(body, understanding.sources)

        steps.append(
            OrbAgentStep(id="generate", label="Generate structured output", status="completed")
        )

        evaluation = understanding.evaluation
        if not evaluation:
            eval_result = orb_evaluation_service.evaluate_document_output(
                understanding.model_dump(),
                analysis_mode=analysis_mode,
            )
            evaluation = eval_result.model_dump()
        steps.append(OrbAgentStep(id="evaluate", label="Evaluate output", status="completed"))
        steps.append(
            OrbAgentStep(id="sources", label="Attach sources and citations", status="completed")
        )
        steps.append(
            OrbAgentStep(id="safety", label="Apply safety boundaries", status="completed")
        )

        findings = [
            OrbAgentFinding(
                title=point[:120],
                summary=point,
                source_ids=[_text(understanding.source_id)] if understanding.source_id else [],
                confidence="medium",
            )
            for point in intel.key_points[:6]
        ]
        if not findings and understanding.key_themes:
            findings = [
                OrbAgentFinding(title=theme[:120], summary=theme, confidence="medium")
                for theme in understanding.key_themes[:4]
            ]

        if not evaluation:
            eval_result = orb_evaluation_service.evaluate_agent_output(
                answer=body[:8000],
                sources=understanding.sources,
                citations=understanding.citations,
                agent_type="document_analysis",
                analysis_mode=analysis_mode,
            )
            evaluation = eval_result.model_dump()

        warnings = self._evaluation_warnings_from_dict(evaluation)

        doc_context_used = merge_context_used(
            {
                "standalone_only": True,
                "document_analysis": {
                    "document_understanding_service": True,
                    "analysis_mode": analysis_mode,
                    "source_id": understanding.source_id,
                },
                "agent": {
                    "type": "document_analysis",
                    "name": agent.name,
                    "classify_reason": classify_reason,
                },
                "retrieval": self._retrieval_summary(retrieval),
                "evaluation": evaluation,
                "intelligence_output": intel.model_dump(),
            },
            surface="orb_standalone",
            mode=request.mode,
            feature="agent",
            lens="document_analysis",
            sources=understanding.sources,
            citations=understanding.citations,
        )
        doc_context_used = self._with_brain_selection_shadow(
            doc_context_used,
            request,
            "document_analysis",
        )
        response = OrbAgentRunResponse(
            success=True,
            agent_type="document_analysis",
            status="completed",
            output=OrbAgentOutput(
                title=understanding.title or agent.name,
                format=request.preferred_output,
                body=body,
                structured_sections={"analysis_mode": analysis_mode},
            ),
            findings=findings,
            sources=understanding.sources,
            citations=understanding.citations,
            steps=steps,
            context_used=doc_context_used,
            model_routing=understanding.model_routing,
            warnings=list(dict.fromkeys(warnings + [STANDALONE_BOUNDARY_SHORT])),
            safety_notice=understanding.safety_notice or self.build_safety_notice(agent, request),
        )
        return self._attach_save_metadata(
            response,
            request,
            created_from="agent",
            analysis_mode=analysis_mode,
        )

    def _attach_save_metadata(
        self,
        response: OrbAgentRunResponse,
        request: OrbAgentRunRequest,
        *,
        created_from: str = "agent",
        analysis_mode: str | None = None,
    ) -> OrbAgentRunResponse:
        intel_data = (response.context_used or {}).get("intelligence_output")
        if intel_data:
            intel = OrbIntelligenceOutput.model_validate(intel_data)
        else:
            intel = orb_intelligence_output_service.from_agent_run(response)
        mode = analysis_mode
        if not mode:
            doc_ctx = (response.context_used or {}).get("document_analysis") or {}
            mode = doc_ctx.get("analysis_mode")
        envelope = orb_intelligence_output_service.build_save_envelope(
            intel,
            request,
            created_from=created_from,
            analysis_mode=mode,
        )
        ctx = dict(response.context_used or {})
        ctx.update(envelope)
        return response.model_copy(update={"context_used": ctx})

    def _evaluate_agent_output(
        self,
        answer: str,
        *,
        sources: list[dict[str, Any]],
        citations: list[dict[str, Any]],
        agent_type: str,
        analysis_mode: str | None = None,
    ):
        return orb_evaluation_service.evaluate_agent_output(
            answer=answer,
            sources=sources,
            citations=citations,
            agent_type=agent_type,
            analysis_mode=analysis_mode,
        )

    def _evaluation_warnings(self, evaluation: OrbEvaluationResult) -> list[str]:
        return self._evaluation_warnings_from_dict(evaluation.model_dump())

    def _evaluation_warnings_from_dict(self, evaluation: dict[str, Any] | None) -> list[str]:
        if not evaluation:
            return []
        warnings: list[str] = []
        for flag in evaluation.get("flags") or []:
            if flag.get("severity") == "critical":
                warnings.append(_text(flag.get("message")) or "Critical quality flag raised.")
        if evaluation.get("requires_human_review"):
            warnings.append("Human review recommended before relying on this output.")
        return warnings

    def _resolve_agent_type(self, request: OrbAgentRunRequest) -> tuple[OrbAgentType, str]:
        if request.agent_type and orb_agent_registry_service.agent_available(request.agent_type):
            return request.agent_type, "Explicit agent type requested"
        return orb_agent_registry_service.classify_agent(
            request.prompt,
            mode=request.mode,
            attachments=request.attachments,
        )

    def _build_standalone_brain_context(self, request: OrbAgentRunRequest) -> dict[str, Any]:
        """Build safe standalone intelligence packet and shared cognition (no OS records)."""
        mode = _text(request.mode) or "Ask ORB"
        profile_context = bool(request.profile_context)
        intelligence_packet = indicare_intelligence_core_service.build_intelligence_packet(
            message=request.prompt,
            mode=mode,
            profile_context=profile_context,
            history=[],
            profile_role=None,
        )
        shared_cognition = shared_institutional_cognition_runtime.build_context(
            surface="standalone_orb",
            message=request.prompt,
            mode=mode,
            operational_context=None,
            history=[],
        )
        return {
            "intelligence_packet": intelligence_packet,
            "shared_cognition": shared_cognition,
        }

    def _missingness_graph_summary(self, missingness: dict[str, Any] | None) -> dict[str, Any]:
        graph = missingness or {}
        sequence = graph.get("sequence") or {}
        return {
            "node_count": len(graph.get("nodes") or []),
            "edge_count": len(graph.get("edges") or []),
            "sequence_id": sequence.get("sequence_id"),
            "has_gaps": bool(graph.get("nodes")),
        }

    def _build_agent_intelligence_metadata(
        self,
        brain_context: dict[str, Any],
        retrieval: dict[str, Any],
    ) -> dict[str, Any]:
        packet = brain_context.get("intelligence_packet") or {}
        shared = brain_context.get("shared_cognition") or {}
        shared_explain = shared.get("explainability") or {}
        convergence = packet.get("convergence") or {}
        return {
            "standalone_brain": True,
            "expert_depth": packet.get("expert_depth"),
            "active_brains": list(shared.get("active_brains") or packet.get("active_brains") or []),
            "active_intelligence_layers": list(packet.get("active_intelligence_layers") or []),
            "active_engines": list(shared.get("active_engines") or convergence.get("active_engines") or []),
            "cognition_display_labels": list(shared.get("cognition_display_labels") or []),
            "reasoning_lenses": list(
                shared_explain.get("reasoning_lenses") or shared.get("active_lenses") or []
            ),
            "quality_gate_preview": packet.get("quality_gate_preview"),
            "registered_home_domains": list(packet.get("registered_home_domains") or []),
            "whole_child_domains": list(packet.get("whole_child_domains") or []),
            "source_basis": packet.get("source_basis"),
            "gaps": list(packet.get("gaps") or []),
            "missingness_graph": self._missingness_graph_summary(packet.get("missingness_graph")),
            "shared_cognition": {
                "surface": shared.get("surface"),
                "explainability": shared_explain,
                "operational_context_available": False,
                "operational_context_used": False,
            },
            "official_source_grounding": bool(shared.get("citations")),
            "indicare_intelligence_core": {
                "version": packet.get("version"),
                "expert_depth": packet.get("expert_depth"),
            },
            "os_linked": False,
            "care_record_access": False,
            "os_records_accessed": False,
            "retrieval_classification": (retrieval.get("classification") or {}).get("primary_intent"),
        }

    def _brain_prompt_blocks(self, brain_context: dict[str, Any], *, message: str, mode: str | None) -> str:
        packet = brain_context.get("intelligence_packet") or {}
        shared = brain_context.get("shared_cognition") or {}
        blocks: list[str] = []
        intelligence_block = _text(packet.get("prompt_block"))
        if intelligence_block:
            blocks.append(intelligence_block)
        shared_blocks = shared.get("prompt_blocks") or []
        for block in shared_blocks:
            text = _text(block)
            if text:
                blocks.append(text)
        return "\n\n".join(blocks)

    def _retrieval_summary(self, retrieval: dict[str, Any]) -> dict[str, Any]:
        packs = retrieval.get("source_packs") or []
        document_results = retrieval.get("document_results") or []
        meta = retrieval.get("retrieval_meta") or {}
        return {
            "strategy": meta.get("strategy")
            or ("source_pack_plus_document_rag" if document_results else "built_in_source_pack"),
            "live_retrieved": False,
            "source_count": len(packs),
            "document_result_count": len(document_results),
            "top_source_titles": retrieval.get("top_source_titles") or [],
            "research_intent": bool((retrieval.get("classification") or {}).get("research_intent")),
            "semantic_available": meta.get("semantic_available", False),
            "synonym_expansion_used": meta.get("synonym_expansion_used", False),
            "official_source_count": meta.get("official_source_count", 0),
            "warnings": meta.get("warnings") or [],
        }

    def build_agent_plan(self, agent: OrbAgentDefinition, request: OrbAgentRunRequest) -> dict[str, Any]:
        depth = request.depth
        max_sources = self._depth_source_limit(depth, request.max_sources)
        output = request.preferred_output or orb_agent_registry_service.default_output_format(agent.type)
        return {
            "agent_type": agent.type,
            "depth": depth,
            "max_sources": max_sources,
            "preferred_output": output,
            "requires_citations": agent.requires_citations and request.require_citations,
            "summary": f"{agent.name} — {depth} depth, {output} format, up to {max_sources} sources",
        }

    def _depth_source_limit(self, depth: str, requested: int) -> int:
        limits = {"quick": min(5, requested), "standard": min(8, requested), "deep": min(12, requested)}
        return limits.get(depth, requested)

    def retrieve_agent_sources(
        self,
        agent: OrbAgentDefinition,
        request: OrbAgentRunRequest,
    ) -> dict[str, Any]:
        query = self._build_retrieval_query(request)
        limit = self._depth_source_limit(request.depth, request.max_sources)
        profile_context = bool(request.profile_context)
        attachments = None
        if request.attachments:
            attachments = ["attachment"] * len(request.attachments)

        retrieval = orb_rag_retrieval_service.retrieve_for_conversation(
            query,
            mode=request.mode,
            profile_context=profile_context,
            attachments=attachments,
        )

        if request.depth == "deep":
            supporting = orb_rag_retrieval_service.search(query, mode=request.mode, limit=limit)
            existing_ids = {
                _text(r.get("source_id")) + str(r.get("chunk_index"))
                for r in retrieval.get("document_results") or []
            }
            merged = list(retrieval.get("document_results") or [])
            for row in supporting:
                key = _text(row.get("source_id")) + str(row.get("chunk_index"))
                if key not in existing_ids:
                    merged.append(row)
                    existing_ids.add(key)
            merged = merged[:limit]
            retrieval["document_results"] = merged
            pack_citations = retrieval.get("pack_citations") or []
            merged_citations = orb_rag_retrieval_service.merge_with_source_pack_citations(
                pack_citations,
                merged,
            )
            retrieval["citations"] = merged_citations
            retrieval["sources"] = orb_citation_service.frontend_sources_payload(merged_citations)
            retrieval["grounding_context"] = orb_rag_retrieval_service.build_grounded_context(
                query,
                packs=retrieval.get("source_packs"),
                document_results=merged,
                mode=request.mode,
            )

        return retrieval

    def _build_retrieval_query(self, request: OrbAgentRunRequest) -> str:
        parts = [request.prompt]
        if request.project_context:
            parts.append(request.project_context)
        if request.profile_context:
            parts.append(request.profile_context)
        for att in request.attachments:
            content = _text(getattr(att, "content", None))
            if content:
                parts.append(content[:4000])
        return "\n".join(parts)

    def build_agent_prompt(
        self,
        agent: OrbAgentDefinition,
        request: OrbAgentRunRequest,
        retrieval_context: dict[str, Any],
        *,
        brain_context: dict[str, Any] | None = None,
    ) -> str:
        output_format = request.preferred_output or orb_agent_registry_service.default_output_format(agent.type)
        format_hint = OUTPUT_FORMAT_INSTRUCTIONS.get(output_format, OUTPUT_FORMAT_INSTRUCTIONS["answer"])

        user_context_parts: list[str] = []
        if request.project_context:
            user_context_parts.append(f"Project context (user-provided):\n{request.project_context}")
        if request.profile_context:
            user_context_parts.append(f"Profile context (user-provided):\n{request.profile_context}")
        for att in request.attachments:
            content = _text(getattr(att, "content", None))
            if content:
                name = _text(getattr(att, "name", None)) or "attachment"
                user_context_parts.append(f"User attachment ({name}):\n{content[:8000]}")

        depth_hint = {
            "quick": "Keep the response concise — top 3–5 source themes only.",
            "standard": "Provide findings with implications and practical actions.",
            "deep": "Provide thorough findings, implications, actions, confidence notes and source gaps.",
        }.get(request.depth, "")

        brain_blocks = (
            self._brain_prompt_blocks(
                brain_context,
                message=request.prompt,
                mode=request.mode,
            )
            if brain_context
            else ""
        )

        return "\n\n".join(
            part
            for part in [
                AGENT_SYSTEM_PREFIX,
                f"Agent role: {agent.name}",
                f"Agent purpose: {agent.description}",
                agent.safety_notice,
                format_hint,
                depth_hint,
                brain_blocks,
                retrieval_context.get("grounding_context") or "",
                LIVE_WEB_NOTE,
                "\n".join(user_context_parts) if user_context_parts else "",
                f"User request:\n{request.prompt}",
            ]
            if part
        )

    async def _call_model(
        self,
        agent: OrbAgentDefinition,
        request: OrbAgentRunRequest,
        system_prompt: str,
        retrieval: dict[str, Any],
    ) -> dict[str, Any]:
        classification = retrieval.get("classification") or {}
        research_intent = bool(classification.get("research_intent")) or agent.requires_citations

        try:
            response, decision, trace = await asyncio.wait_for(
                ai_model_router_service.complete_with_routing(
                    message=request.prompt,
                    system_prompt=system_prompt,
                    history=[],
                    mode=request.mode,
                    retrieval_context=retrieval,
                    detail_level="detailed" if request.depth != "quick" else "concise",
                    research_intent=research_intent,
                    surface="orb_agent_orchestrator",
                    route="orb_agent_orchestrator_service._call_model",
                    local_fallback_available=True,
                ),
                timeout=STANDALONE_LLM_TIMEOUT_SECONDS,
            )
            model_routing = ai_model_router_service.routing_metadata_for_context(
                decision,
                trace,
                response=response,
            )
            text = _text(response.text)
            if text:
                return {"text": text, "model_routing": model_routing}
        except Exception:
            logger.debug("agent model call failed; using structured fallback", exc_info=True)

        return {
            "text": self._structured_fallback_text(agent, request, retrieval),
            "model_routing": None,
        }

    def _structured_fallback_text(
        self,
        agent: OrbAgentDefinition,
        request: OrbAgentRunRequest,
        retrieval: dict[str, Any],
    ) -> str:
        titles = retrieval.get("top_source_titles") or []
        title_line = ", ".join(t for t in titles[:5] if t) or "built-in ORB knowledge packs"
        output_format = request.preferred_output or orb_agent_registry_service.default_output_format(agent.type)

        if output_format == "briefing":
            return (
                f"## Summary\n\n{agent.name} prepared a source-backed briefing from ORB Knowledge Library material.\n\n"
                f"## Key points\n\n- Themes drawn from: {title_line}.\n"
                f"- Request: {request.prompt[:500]}\n\n"
                f"## Evidence / source basis\n\nRetrieved from ORB Knowledge Library (no live web retrieval).\n\n"
                f"## Implications\n\nUse professional judgement and local policy alongside this guidance.\n\n"
                f"## Suggested next actions\n\n- Review relevant local policies.\n"
                f"- Discuss with your line manager or safeguarding lead where appropriate.\n\n"
                f"## Limits / gaps\n\n{LIVE_WEB_NOTE}"
            )
        return (
            f"{agent.name} could not reach the live model, but retrieved guidance themes from: {title_line}. "
            f"Re-run when the model router is available, or refine your question.\n\n{LIVE_WEB_NOTE}"
        )

    def parse_agent_output(
        self,
        text: str,
        agent: OrbAgentDefinition,
        request: OrbAgentRunRequest,
        *,
        retrieval: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        body = _text(text)
        if not body:
            body = self._structured_fallback_text(agent, request, retrieval or {})

        title_match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else agent.name

        sections: dict[str, str] = {}
        for match in re.finditer(r"^##\s+(.+)$", body, re.MULTILINE):
            sections[match.group(1).strip().lower().replace(" ", "_")] = ""

        return {
            "title": title,
            "body": body,
            "structured_sections": sections,
        }

    def build_findings(
        self,
        text: str,
        sources: list[dict[str, Any]],
        citations: list[dict[str, Any]],
    ) -> list[OrbAgentFinding]:
        findings: list[OrbAgentFinding] = []
        sections = re.split(r"\n##\s+", text)
        source_ids = [_text(s.get("id")) for s in (citations or sources) if s.get("id")]

        for idx, section in enumerate(sections[1:6], start=1):
            lines = [line.strip() for line in section.strip().splitlines() if line.strip()]
            if not lines:
                continue
            title = lines[0].strip("# ").strip()
            summary = lines[1] if len(lines) > 1 else title
            findings.append(
                OrbAgentFinding(
                    title=title[:120],
                    summary=summary[:500],
                    evidence=summary[:300] if len(lines) > 2 else None,
                    source_ids=source_ids[:3],
                    confidence="medium",
                    implications=None,
                    suggested_actions=[],
                )
            )

        if not findings and sources:
            primary = sources[0]
            findings.append(
                OrbAgentFinding(
                    title=_text(primary.get("label")) or "Key source theme",
                    summary=_text(primary.get("basis")) or "Retrieved from ORB Knowledge Library",
                    source_ids=source_ids[:2],
                    confidence="medium",
                )
            )
        return findings

    def build_safety_notice(self, agent: OrbAgentDefinition, request: OrbAgentRunRequest) -> str:
        parts = [_text(agent.safety_notice), STANDALONE_BOUNDARY_SHORT]
        if agent.type == "safeguarding_reflection":
            parts.insert(
                0,
                "ORB does not decide safeguarding thresholds. Escalate immediately if risk is current or immediate.",
            )
        return " ".join(p for p in parts if p)

    def fallback_agent_response(
        self,
        error: Exception | None,
        request: OrbAgentRunRequest,
        agent: OrbAgentDefinition | None,
        *,
        steps: list[OrbAgentStep] | None = None,
    ) -> OrbAgentRunResponse:
        agent = agent or orb_agent_registry_service.get_agent("general_research")
        agent_type = agent.type if agent else "general_research"
        retrieval = orb_rag_retrieval_service.retrieve_for_conversation(request.prompt, mode=request.mode)
        body = self._structured_fallback_text(agent, request, retrieval) if agent else _text(str(error))
        sources = retrieval.get("sources") or []
        citations = retrieval.get("citations") or []
        output_format = request.preferred_output or "answer"

        fallback_context_used = merge_context_used(
            {},
            surface="orb_standalone",
            mode=request.mode,
            feature="agent",
            lens=agent_type,
            sources=sources,
            citations=citations,
        )
        fallback_context_used = self._with_brain_selection_shadow(
            fallback_context_used,
            request,
            agent_type,
        )
        return OrbAgentRunResponse(
            success=False,
            agent_type=agent_type,
            status="failed",
            output=OrbAgentOutput(
                title=agent.name if agent else "ORB Agent",
                format=output_format,
                body=append_sources_basis_section(body, sources),
            ),
            findings=self.build_findings(body, sources, citations),
            sources=sources,
            citations=citations,
            steps=steps or [OrbAgentStep(id="failed", label="Agent run failed", status="failed", detail=str(error))],
            context_used=fallback_context_used,
            warnings=[LIVE_WEB_NOTE, f"Agent error: {type(error).__name__ if error else 'unknown'}"],
            safety_notice=agent.safety_notice if agent else LIVE_WEB_NOTE,
        )


orb_agent_orchestrator_service = OrbAgentOrchestratorService()
