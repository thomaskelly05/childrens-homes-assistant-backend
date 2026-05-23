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
from services.ai_model_router_service import STANDALONE_LLM_TIMEOUT_SECONDS, ai_model_router_service
from services.orb_agent_registry_service import LIVE_WEB_NOTE, orb_agent_registry_service
from services.orb_citation_service import orb_citation_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_standalone_sources import append_sources_basis_section

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

    async def run_agent(self, request: OrbAgentRunRequest) -> OrbAgentRunResponse:
        agent_type, classify_reason = self._resolve_agent_type(request)
        agent = orb_agent_registry_service.get_agent(agent_type)
        if not agent:
            return self.fallback_agent_response(
                ValueError(f"Unknown agent: {agent_type}"),
                request,
                orb_agent_registry_service.get_agent("general_research"),
            )

        steps: list[OrbAgentStep] = [
            OrbAgentStep(id="classify", label="Classify request", status="completed", detail=classify_reason),
        ]

        try:
            plan = self.build_agent_plan(agent, request)
            steps.append(OrbAgentStep(id="plan", label="Build agent plan", status="completed", detail=plan.get("summary")))

            retrieval = self.retrieve_agent_sources(agent, request)
            steps.append(
                OrbAgentStep(
                    id="retrieve",
                    label="Retrieve source material",
                    status="completed",
                    detail=f"{len(retrieval.get('source_packs') or [])} packs, "
                    f"{len(retrieval.get('document_results') or [])} library passages",
                )
            )

            prompt = self.build_agent_prompt(agent, request, retrieval)
            steps.append(OrbAgentStep(id="prompt", label="Build evidence summary", status="completed"))

            llm_result = await self._call_model(agent, request, prompt, retrieval)
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

            context_used = {
                "surface": "standalone_orb_ai",
                "os_linked": False,
                "care_record_access": False,
                "agent": {
                    "type": agent_type,
                    "name": agent.name,
                    "auto_run": True,
                    "classify_reason": classify_reason,
                },
                "retrieval": self._retrieval_summary(retrieval),
            }

            return OrbAgentRunResponse(
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
                warnings=list(dict.fromkeys(warnings)),
                safety_notice=self.build_safety_notice(agent, request),
            )
        except Exception as exc:
            logger.warning("agent run failed type=%s error=%s", agent_type, type(exc).__name__, exc_info=True)
            return self.fallback_agent_response(exc, request, agent, steps=steps)

    def _resolve_agent_type(self, request: OrbAgentRunRequest) -> tuple[OrbAgentType, str]:
        if request.agent_type and orb_agent_registry_service.agent_available(request.agent_type):
            return request.agent_type, "Explicit agent type requested"
        return orb_agent_registry_service.classify_agent(
            request.prompt,
            mode=request.mode,
            attachments=request.attachments,
        )

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
            doc_citations = orb_rag_retrieval_service.build_rag_citations(merged)
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

        return "\n\n".join(
            part
            for part in [
                AGENT_SYSTEM_PREFIX,
                f"Agent role: {agent.name}",
                f"Agent purpose: {agent.description}",
                agent.safety_notice,
                format_hint,
                depth_hint,
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
            context_used={
                "surface": "standalone_orb_ai",
                "os_linked": False,
                "care_record_access": False,
            },
            warnings=[LIVE_WEB_NOTE, f"Agent error: {type(error).__name__ if error else 'unknown'}"],
            safety_notice=agent.safety_notice if agent else LIVE_WEB_NOTE,
        )


orb_agent_orchestrator_service = OrbAgentOrchestratorService()
