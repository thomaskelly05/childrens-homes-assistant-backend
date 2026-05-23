"""Deep research workflow for standalone ORB — multi-pass Knowledge Library retrieval."""

from __future__ import annotations

import logging
from typing import Any

from schemas.orb_agents import (
    OrbAgentFinding,
    OrbAgentOutput,
    OrbAgentRunRequest,
    OrbAgentStep,
    OrbDeepResearchRequest,
    OrbDeepResearchResponse,
)
from schemas.orb_documents import OrbDocumentAnalysisRequest
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_agent_registry_service import LIVE_WEB_NOTE, orb_agent_registry_service
from services.orb_document_understanding_service import orb_document_understanding_service
from services.orb_evaluation_service import orb_evaluation_service
from services.orb_intelligence_output_service import orb_intelligence_output_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service

logger = logging.getLogger("indicare.orb_deep_research")

DEPTH_LIMITS = {"quick": 5, "standard": 8, "deep": 12}

DOCUMENT_RESEARCH_WARNING = (
    "This research includes a user-provided standalone document and ORB Knowledge Library sources. "
    "It does not access live IndiCare OS records."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbDeepResearchService:
    """Dedicated deep research with source clustering and gap analysis."""

    def _has_document(self, request: OrbDeepResearchRequest) -> bool:
        return bool(
            _text(request.document_text)
            or _text(request.document_source_id)
            or _text(request.source_id)
        )

    async def _analyse_document_for_research(
        self,
        request: OrbDeepResearchRequest,
    ) -> dict[str, Any] | None:
        if not self._has_document(request):
            return None
        source_id = _text(request.document_source_id or request.source_id) or None
        doc_text = _text(request.document_text) or None
        mode = "full_review" if request.depth == "deep" else "manager_briefing"
        doc_request = OrbDocumentAnalysisRequest(
            mode=mode,
            source_id=source_id,
            text=doc_text if not source_id else None,
            title=_text(request.document_title) or None,
            question=request.query,
            include_evaluation=True,
        )
        understanding = await orb_document_understanding_service.analyse_document(doc_request)
        intel = orb_intelligence_output_service.from_document_analysis(understanding)
        return {
            "understanding": understanding.model_dump(),
            "summary": understanding.plain_english_summary,
            "key_points": intel.key_points,
            "risks": intel.risks,
            "actions": [a.model_dump() for a in intel.actions],
            "analysis_mode": mode,
        }

    async def run_deep_research(self, request: OrbDeepResearchRequest) -> OrbDeepResearchResponse:
        plan = self.plan_research(request.query, mode=request.mode, depth=request.depth)
        max_sources = min(DEPTH_LIMITS.get(request.depth, 8), request.max_sources)

        document_context: dict[str, Any] | None = None
        doc_steps: list[OrbAgentStep] = []
        if self._has_document(request):
            doc_steps.append(
                OrbAgentStep(id="document", label="Analyse standalone document", status="running")
            )
            document_context = await self._analyse_document_for_research(request)
            doc_steps[0] = OrbAgentStep(
                id="document",
                label="Analyse standalone document",
                status="completed",
                detail=(document_context or {}).get("analysis_mode"),
            )

        research_query = request.query
        if document_context:
            research_query = (
                f"{request.query}\n\nDocument context:\n"
                f"{document_context.get('summary', '')}\n"
                f"Key points: {', '.join(document_context.get('key_points') or [])}"
            )

        primary = self.retrieve_primary_sources(research_query, mode=request.mode, limit=max_sources)
        supporting = self.retrieve_supporting_sources(
            research_query,
            mode=request.mode,
            limit=max(3, max_sources // 2),
            exclude=primary,
        )
        combined = self._merge_results(primary, supporting)[:max_sources]
        clusters = self.cluster_sources(combined)
        gaps = self.identify_gaps(combined, request.query)

        project_context = request.project_context
        if document_context:
            doc_block = (
                "## User-provided standalone document\n\n"
                f"{document_context.get('summary', '')}\n\n"
            )
            actions = document_context.get("actions") or []
            if actions:
                doc_block += "### Suggested actions from document\n"
                for action in actions[:6]:
                    doc_block += f"- {_text(action.get('action'))}\n"
            project_context = "\n\n".join(filter(None, [project_context, doc_block]))

        agent_request = OrbAgentRunRequest(
            agent_type="deep_research",
            prompt=request.query,
            mode=request.mode,
            project_context=project_context,
            profile_context=request.profile_context,
            preferred_output=request.preferred_output,
            depth=request.depth,
            require_citations=request.require_citations,
            max_sources=max_sources,
        )
        agent_response = await orb_agent_orchestrator_service.run_agent(agent_request)

        briefing_body = self.build_research_briefing(
            request.query,
            clusters,
            gaps,
            fallback=agent_response.output.body,
            document_context=document_context,
        )
        citations = self.build_research_citations(combined) or agent_response.citations
        sources = agent_response.sources

        findings = agent_response.findings or self._findings_from_clusters(clusters)
        steps = [
            OrbAgentStep(id="plan", label="Plan research", status="completed", detail=plan.get("summary")),
            *doc_steps,
            OrbAgentStep(id="primary", label="Retrieve primary sources", status="completed"),
            OrbAgentStep(id="supporting", label="Retrieve supporting sources", status="completed"),
            OrbAgentStep(id="cluster", label="Cluster sources", status="completed"),
            OrbAgentStep(id="gaps", label="Identify source gaps", status="completed"),
            OrbAgentStep(id="briefing", label="Generate research briefing", status="completed"),
            OrbAgentStep(id="evaluate", label="Evaluate output", status="completed"),
            *(agent_response.steps or []),
        ]

        warnings = list(agent_response.warnings or [])
        if gaps:
            warnings.extend(gaps[:3])
        if document_context:
            warnings.insert(0, DOCUMENT_RESEARCH_WARNING)

        context_used = {
            **(agent_response.context_used or {}),
            "deep_research": True,
            "depth": request.depth,
            "source_count": len(combined),
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }
        if document_context:
            context_used["document_understanding"] = {
                "included": True,
                "analysis_mode": document_context.get("analysis_mode"),
                "summary": document_context.get("summary"),
                "auto_run": True,
            }

        evaluation = (agent_response.context_used or {}).get("evaluation")
        if not evaluation:
            eval_result = orb_evaluation_service.evaluate_agent_output(
                answer=briefing_body[:8000],
                sources=sources,
                citations=citations,
                agent_type="deep_research",
            )
            evaluation = eval_result.model_dump()
        context_used["evaluation"] = evaluation

        intel = orb_intelligence_output_service.from_deep_research(
            {
                "success": agent_response.success,
                "query": request.query,
                "output": {
                    "title": f"Deep research: {request.query[:80]}",
                    "format": request.preferred_output,
                    "body": briefing_body,
                    "structured_sections": agent_response.output.structured_sections,
                },
                "findings": [f.model_dump() for f in findings],
                "sources": sources,
                "citations": citations,
                "context_used": context_used,
                "warnings": warnings,
                "source_gaps": gaps,
                "safety_notice": agent_response.safety_notice,
            }
        )
        save_envelope = orb_intelligence_output_service.build_save_envelope(
            intel,
            request,
            created_from="deep_research",
        )
        context_used.update(save_envelope)

        response = OrbDeepResearchResponse(
            success=agent_response.success,
            query=request.query,
            depth=request.depth,
            output=OrbAgentOutput(
                title=f"Deep research: {request.query[:80]}",
                format=request.preferred_output,
                body=briefing_body,
                structured_sections=agent_response.output.structured_sections,
            ),
            findings=findings,
            sources=sources,
            citations=citations,
            source_clusters=clusters,
            source_gaps=gaps,
            steps=steps,
            context_used=context_used,
            model_routing=agent_response.model_routing,
            warnings=list(dict.fromkeys(warnings)),
            safety_notice=agent_response.safety_notice or LIVE_WEB_NOTE,
            live_web_note=LIVE_WEB_NOTE,
        )
        try:
            from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

            indicare_ai_governance_event_service.record_from_standalone_response(
                {
                    "answer": briefing_body,
                    "sources": [s.model_dump() if hasattr(s, "model_dump") else s for s in sources],
                    "citations": [c.model_dump() if hasattr(c, "model_dump") else c for c in citations],
                    "context_used": context_used,
                    "model_routing": agent_response.model_routing,
                },
                event_type="deep_research",
                message=request.query,
            )
        except Exception:
            pass
        return response

    def plan_research(
        self,
        query: str,
        *,
        mode: str | None = None,
        depth: str = "standard",
    ) -> dict[str, Any]:
        agent_type, reason = orb_agent_registry_service.classify_agent(query, mode=mode)
        return {
            "agent_type": agent_type,
            "depth": depth,
            "max_sources": DEPTH_LIMITS.get(depth, 8),
            "summary": f"Deep research ({depth}) — {reason}",
            "live_web_enabled": False,
        }

    def retrieve_primary_sources(
        self,
        query: str,
        *,
        mode: str | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        return orb_rag_retrieval_service.search(query, mode=mode, limit=limit)

    def retrieve_supporting_sources(
        self,
        query: str,
        *,
        mode: str | None = None,
        limit: int = 4,
        exclude: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        expansion_query = f"{query} guidance practice evidence"
        results = orb_rag_retrieval_service.search(expansion_query, mode=mode, limit=limit * 2)
        exclude_keys = {
            _text(r.get("source_id")) + str(r.get("chunk_index")) for r in (exclude or [])
        }
        filtered = []
        for row in results:
            key = _text(row.get("source_id")) + str(row.get("chunk_index"))
            if key not in exclude_keys:
                filtered.append(row)
            if len(filtered) >= limit:
                break
        return filtered

    def _merge_results(
        self,
        primary: list[dict[str, Any]],
        supporting: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        seen: set[str] = set()
        merged: list[dict[str, Any]] = []
        for row in primary + supporting:
            key = _text(row.get("source_id")) + str(row.get("chunk_index"))
            if key in seen:
                continue
            seen.add(key)
            merged.append(row)
        return merged

    def cluster_sources(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        buckets: dict[str, list[dict[str, Any]]] = {}
        for row in results:
            source_type = _text(row.get("source_type")) or "general"
            buckets.setdefault(source_type, []).append(row)

        clusters = []
        for theme, items in buckets.items():
            clusters.append(
                {
                    "theme": theme.replace("_", " ").title(),
                    "source_type": theme,
                    "count": len(items),
                    "titles": list(dict.fromkeys(_text(i.get("source_title")) for i in items if i.get("source_title")))[:5],
                    "sample_excerpt": _text(items[0].get("text"))[:240] if items else "",
                }
            )
        return clusters

    def identify_gaps(self, results: list[dict[str, Any]], query: str) -> list[str]:
        gaps: list[str] = [LIVE_WEB_NOTE]
        if not results:
            gaps.append("No matching passages were found in the ORB Knowledge Library for this query.")
            return gaps

        lower = query.lower()
        types = {_text(r.get("source_type")) for r in results}
        if any(term in lower for term in ("ofsted", "sccif", "inspection")) and "regulatory_framework" not in types:
            gaps.append("Limited regulatory framework passages — consider adding SCCIF or Quality Standards sources.")
        if "safeguarding" in lower and "safeguarding_principles" not in types:
            gaps.append("Limited safeguarding source passages — follow local safeguarding procedures alongside this research.")
        if len(results) < 3:
            gaps.append("Few library passages matched — broaden the question or add sources to the Knowledge Library.")
        return list(dict.fromkeys(gaps))

    def build_research_briefing(
        self,
        query: str,
        clusters: list[dict[str, Any]],
        gaps: list[str],
        *,
        fallback: str,
        document_context: dict[str, Any] | None = None,
    ) -> str:
        doc_section = ""
        if document_context:
            doc_section = (
                "## Document understanding (standalone user document)\n\n"
                f"{_text(document_context.get('summary'))}\n\n"
            )
            key_points = document_context.get("key_points") or []
            if key_points:
                doc_section += "### Key points\n" + "\n".join(f"- {p}" for p in key_points[:8]) + "\n\n"
            risks = document_context.get("risks") or []
            if risks:
                doc_section += "### Risks noted\n" + "\n".join(f"- {r}" for r in risks[:5]) + "\n\n"

        if fallback and len(fallback) > 200:
            body = fallback
            if doc_section and doc_section not in body:
                body = f"{doc_section}\n{body}"
        else:
            cluster_lines = []
            for cluster in clusters:
                cluster_lines.append(
                    f"- **{cluster['theme']}** ({cluster['count']} passages): "
                    f"{', '.join(cluster.get('titles') or []) or 'see sources'}"
                )
            body = (
                f"## Summary\n\nResearch on: {query}\n\n"
                f"## Key themes\n\n" + ("\n".join(cluster_lines) if cluster_lines else "- See attached sources") + "\n\n"
                f"## Limits / gaps\n\n" + "\n".join(f"- {g}" for g in gaps)
            )
        if document_context and DOCUMENT_RESEARCH_WARNING not in body:
            body = f"{body}\n\n{DOCUMENT_RESEARCH_WARNING}"
        if LIVE_WEB_NOTE not in body:
            body = f"{body}\n\n{LIVE_WEB_NOTE}"
        return body

    def build_research_citations(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not results:
            return []
        return orb_rag_retrieval_service.build_rag_citations(results)

    def _findings_from_clusters(self, clusters: list[dict[str, Any]]) -> list[OrbAgentFinding]:
        findings: list[OrbAgentFinding] = []
        for cluster in clusters[:6]:
            findings.append(
                OrbAgentFinding(
                    title=_text(cluster.get("theme")) or "Theme",
                    summary=_text(cluster.get("sample_excerpt")) or "See clustered sources",
                    confidence="medium",
                )
            )
        return findings


orb_deep_research_service = OrbDeepResearchService()
