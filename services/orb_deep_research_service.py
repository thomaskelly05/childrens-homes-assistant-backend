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
from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service
from services.orb_agent_registry_service import LIVE_WEB_NOTE, orb_agent_registry_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service

logger = logging.getLogger("indicare.orb_deep_research")

DEPTH_LIMITS = {"quick": 5, "standard": 8, "deep": 12}


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbDeepResearchService:
    """Dedicated deep research with source clustering and gap analysis."""

    async def run_deep_research(self, request: OrbDeepResearchRequest) -> OrbDeepResearchResponse:
        plan = self.plan_research(request.query, mode=request.mode, depth=request.depth)
        max_sources = min(DEPTH_LIMITS.get(request.depth, 8), request.max_sources)

        primary = self.retrieve_primary_sources(request.query, mode=request.mode, limit=max_sources)
        supporting = self.retrieve_supporting_sources(
            request.query,
            mode=request.mode,
            limit=max(3, max_sources // 2),
            exclude=primary,
        )
        combined = self._merge_results(primary, supporting)[:max_sources]
        clusters = self.cluster_sources(combined)
        gaps = self.identify_gaps(combined, request.query)

        agent_request = OrbAgentRunRequest(
            agent_type="deep_research",
            prompt=request.query,
            mode=request.mode,
            project_context=request.project_context,
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
        )
        citations = self.build_research_citations(combined) or agent_response.citations
        sources = agent_response.sources

        findings = agent_response.findings or self._findings_from_clusters(clusters)
        steps = [
            OrbAgentStep(id="plan", label="Plan research", status="completed", detail=plan.get("summary")),
            OrbAgentStep(id="primary", label="Retrieve primary sources", status="completed"),
            OrbAgentStep(id="supporting", label="Retrieve supporting sources", status="completed"),
            OrbAgentStep(id="cluster", label="Cluster sources", status="completed"),
            OrbAgentStep(id="gaps", label="Identify source gaps", status="completed"),
            OrbAgentStep(id="briefing", label="Generate research briefing", status="completed"),
            *(agent_response.steps or []),
        ]

        warnings = list(agent_response.warnings or [])
        if gaps:
            warnings.extend(gaps[:3])

        return OrbDeepResearchResponse(
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
            context_used={
                **(agent_response.context_used or {}),
                "deep_research": True,
                "depth": request.depth,
                "source_count": len(combined),
            },
            model_routing=agent_response.model_routing,
            warnings=list(dict.fromkeys(warnings)),
            safety_notice=agent_response.safety_notice or LIVE_WEB_NOTE,
            live_web_note=LIVE_WEB_NOTE,
        )

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
    ) -> str:
        if fallback and len(fallback) > 200:
            body = fallback
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
