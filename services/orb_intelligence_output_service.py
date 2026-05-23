"""Adapters between ORB intelligence surfaces and unified output shape."""

from __future__ import annotations

from typing import Any

from schemas.orb_agents import OrbAgentRunResponse
from schemas.orb_documents import OrbDocumentAnalysisResponse, OrbDocumentUnderstanding
from schemas.orb_evaluation import OrbEvaluationResult
from schemas.orb_saved_outputs import OrbSavedOutputSaveOptions, OrbSavedOutputType
from schemas.orb_intelligence_output import (
    OrbIntelligenceAction,
    OrbIntelligenceBoundary,
    OrbIntelligenceOutput,
    OrbIntelligenceOutputType,
    OrbIntelligenceQualitySummary,
    OrbIntelligenceSection,
    OrbIntelligenceSourceSummary,
)

STANDALONE_BOUNDARY_NOTICE = (
    "Standalone ORB does not access live IndiCare OS records, Care Hub, chronology, "
    "child records, staff records or dashboards."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbIntelligenceOutputService:
    """Convert document, agent and deep research responses into shared intelligence output."""

    def build_safety_boundaries(self, *, surface: str = "standalone") -> OrbIntelligenceBoundary:
        standalone = surface in {"standalone", "standalone_orb_ai", "standalone_orb"}
        return OrbIntelligenceBoundary(
            surface=surface,
            standalone_only=standalone,
            os_linked=False,
            care_record_access=False,
            notice=STANDALONE_BOUNDARY_NOTICE if standalone else None,
        )

    def from_document_analysis(
        self,
        response: OrbDocumentAnalysisResponse | OrbDocumentUnderstanding,
    ) -> OrbIntelligenceOutput:
        understanding = (
            response.understanding
            if isinstance(response, OrbDocumentAnalysisResponse)
            else response
        )
        mode = understanding.analysis_mode or "explain"
        output_type = self._document_output_type(mode)

        sections: list[OrbIntelligenceSection] = []
        if understanding.important_points:
            body = "\n".join(
                f"- {p.point}" + (f": {p.detail}" if p.detail else "")
                for p in understanding.important_points[:12]
            )
            sections.append(
                OrbIntelligenceSection(
                    id="key_points",
                    title="Key points",
                    body=body,
                    order=1,
                )
            )
        if understanding.practice_implications:
            sections.append(
                OrbIntelligenceSection(
                    id="practice",
                    title="Practice implications",
                    body="\n".join(f"- {i.implication}" for i in understanding.practice_implications[:8]),
                    order=2,
                )
            )

        actions = self.normalise_actions(
            [a.model_dump() for a in (understanding.action_plan.actions if understanding.action_plan else [])]
        )
        key_points = [p.point for p in understanding.important_points[:10]] or list(
            understanding.key_themes[:8]
        )
        risks = [r.risk for r in understanding.risks_or_concerns if r.risk]  # typo fix below
        gaps = [g.gap for g in understanding.gaps_or_missing_information if g.gap]
        questions = [q.question for q in understanding.suggested_questions if q.question]

        quality = None
        if understanding.evaluation:
            quality = self._quality_from_evaluation_dict(understanding.evaluation)

        return OrbIntelligenceOutput(
            type=output_type,
            title=understanding.title,
            summary=understanding.plain_english_summary,
            sections=sections,
            key_points=key_points,
            findings=self.normalise_findings(
                [{"title": t, "summary": t} for t in understanding.key_themes[:6]]
            ),
            actions=actions,
            questions=questions,
            risks=risks,
            gaps=gaps,
            sources=understanding.sources,
            citations=understanding.citations,
            quality=quality,
            safety_notice=understanding.safety_notice,
            limitations=understanding.limitations,
            boundaries=self.build_safety_boundaries(surface="standalone"),
            model_routing=understanding.model_routing,
            standalone_only=True,
            os_linked=False,
            care_record_access=False,
        )

    def from_agent_run(self, response: OrbAgentRunResponse) -> OrbIntelligenceOutput:
        output_type: OrbIntelligenceOutputType = "answer"
        if response.agent_type == "document_analysis":
            output_type = "document_analysis"
        elif response.agent_type == "deep_research":
            output_type = "deep_research"
        elif response.agent_type == "safeguarding_reflection":
            output_type = "safeguarding_reflection"
        elif response.agent_type == "recording_quality":
            output_type = "recording_rewrite"
        elif response.agent_type == "therapeutic_practice":
            output_type = "therapeutic_reflection"

        fmt = response.output.format
        if response.agent_type != "document_analysis":
            if fmt == "action_plan":
                output_type = "action_plan"
            elif fmt == "briefing":
                output_type = "manager_briefing"
            elif fmt == "checklist":
                output_type = "checklist"
            elif fmt == "comparison":
                output_type = "comparison"
            elif fmt == "evidence_map":
                output_type = "evidence_map"

        findings = [
            {
                "title": f.title,
                "summary": f.summary,
                "evidence": f.evidence,
                "suggested_actions": f.suggested_actions,
            }
            for f in (response.findings or [])
        ]

        evaluation = (response.context_used or {}).get("evaluation")
        quality = self._quality_from_evaluation_dict(evaluation) if evaluation else None

        return OrbIntelligenceOutput(
            type=output_type,
            title=response.output.title,
            summary=response.output.body[:1200],
            sections=[
                OrbIntelligenceSection(
                    id="body",
                    title="Output",
                    body=response.output.body,
                    order=0,
                )
            ],
            findings=self.normalise_findings(findings),
            sources=response.sources,
            citations=response.citations,
            quality=quality,
            safety_notice=response.safety_notice,
            boundaries=self.build_safety_boundaries(
                surface=_text((response.context_used or {}).get("surface")) or "standalone"
            ),
            model_routing=response.model_routing,
            retrieval_context=(response.context_used or {}).get("retrieval"),
            standalone_only=True,
            os_linked=False,
            care_record_access=False,
        )

    def from_deep_research(self, response: Any) -> OrbIntelligenceOutput:
        """Accept OrbDeepResearchResponse or dict."""
        if hasattr(response, "model_dump"):
            data = response.model_dump()
        elif isinstance(response, dict):
            data = response
        else:
            data = {}

        output = data.get("output") or {}
        body = _text(output.get("body"))
        gaps = list(data.get("source_gaps") or [])
        warnings = list(data.get("warnings") or [])

        from schemas.orb_agents import OrbAgentOutput

        agent_like = OrbAgentRunResponse(
            success=bool(data.get("success", True)),
            agent_type="deep_research",
            status="completed",
            output=OrbAgentOutput(
                title=_text(output.get("title")) or "Deep research",
                format=output.get("format") or "briefing",
                body=body,
                structured_sections=output.get("structured_sections") or {},
            ),
            findings=data.get("findings") or [],
            sources=data.get("sources") or [],
            citations=data.get("citations") or [],
            context_used=data.get("context_used") or {},
            model_routing=data.get("model_routing"),
            warnings=warnings,
            safety_notice=data.get("safety_notice"),
        )
        intel = self.from_agent_run(agent_like)
        intel.type = "deep_research"
        intel.title = _text(output.get("title")) or f"Deep research: {data.get('query', '')[:80]}"
        intel.gaps = gaps + intel.gaps
        intel.summary = body[:1500] if body else intel.summary
        doc_ctx = (data.get("context_used") or {}).get("document_understanding")
        if doc_ctx:
            intel.sections.insert(
                0,
                OrbIntelligenceSection(
                    id="document_understanding",
                    title="Document understanding",
                    body=_text(doc_ctx.get("summary")),
                    order=-1,
                ),
            )
        return intel

    def attach_evaluation(
        self,
        output: OrbIntelligenceOutput,
        evaluation: OrbEvaluationResult | dict[str, Any],
    ) -> OrbIntelligenceOutput:
        if isinstance(evaluation, OrbEvaluationResult):
            data = evaluation.model_dump()
        else:
            data = evaluation
        output.quality = self._quality_from_evaluation_dict(data)
        for note in data.get("safety_notes") or []:
            if note and note not in (output.quality.safety_notes if output.quality else []):
                if output.quality:
                    output.quality.safety_notes.append(note)
        critical = [
            f for f in (data.get("flags") or []) if f.get("severity") == "critical"
        ]
        if critical:
            boundary_flag = any(
                f.get("code") == "standalone_boundary_breach" for f in critical
            )
            if boundary_flag:
                warn = (
                    "This output may imply access to live OS records. "
                    "Standalone ORB cannot access Care Hub or child records."
                )
                output.safety_notice = " ".join(
                    filter(None, [output.safety_notice, warn])
                )
        return output

    def build_copy_markdown(self, output: OrbIntelligenceOutput) -> str:
        lines = [f"# {output.title}", "", output.summary, ""]
        if output.key_points:
            lines.append("## Key points")
            for point in output.key_points:
                lines.append(f"- {point}")
            lines.append("")
        for section in sorted(output.sections, key=lambda s: s.order):
            if section.id == "body":
                continue
            lines.append(f"## {section.title}")
            lines.append(section.body)
            lines.append("")
        if output.actions:
            lines.append("## Actions (draft)")
            for action in output.actions:
                lines.append(
                    f"- [{action.priority}] {action.action}"
                    + (f" — {action.why}" if action.why else "")
                )
            lines.append("")
        if output.risks:
            lines.append("## Risks")
            for risk in output.risks:
                lines.append(f"- {risk}")
            lines.append("")
        if output.gaps:
            lines.append("## Gaps / limits")
            for gap in output.gaps:
                lines.append(f"- {gap}")
            lines.append("")
        if output.quality and output.quality.headline:
            lines.append(f"## Quality\n\n{output.quality.headline}")
            lines.append("")
        if output.safety_notice:
            lines.append(f"**Safety:** {output.safety_notice}")
        if output.boundaries.notice:
            lines.append(f"\n**Boundary:** {output.boundaries.notice}")
        return "\n".join(lines).strip()

    def normalise_actions(self, actions: list[dict[str, Any]]) -> list[OrbIntelligenceAction]:
        normalised: list[OrbIntelligenceAction] = []
        for row in actions:
            action = _text(row.get("action"))
            if not action:
                continue
            normalised.append(
                OrbIntelligenceAction(
                    action=action,
                    why=_text(row.get("why_it_matters") or row.get("why")),
                    priority=_text(row.get("priority")) or "medium",
                    owner_label=_text(row.get("suggested_owner_label") or row.get("owner_label")) or None,
                    timescale=_text(row.get("timescale")) or None,
                    source_basis=_text(row.get("source_basis")) or None,
                )
            )
        return normalised

    def normalise_findings(self, findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for row in findings:
            title = _text(row.get("title"))
            summary = _text(row.get("summary") or row.get("body"))
            if not title and not summary:
                continue
            result.append(
                {
                    "title": title or summary[:80],
                    "summary": summary or title,
                    "evidence": row.get("evidence"),
                    "suggested_actions": row.get("suggested_actions") or [],
                }
            )
        return result

    def _document_output_type(self, mode: str) -> OrbIntelligenceOutputType:
        mapping: dict[str, OrbIntelligenceOutputType] = {
            "action_plan": "action_plan",
            "manager_briefing": "manager_briefing",
            "staff_briefing": "staff_briefing",
            "policy_comparison": "comparison",
            "ofsted_lens": "evidence_map",
            "full_review": "document_analysis",
            "safeguarding_lens": "safeguarding_reflection",
            "recording_lens": "recording_rewrite",
            "therapeutic_lens": "therapeutic_reflection",
        }
        return mapping.get(mode, "document_analysis")

    def _quality_from_evaluation_dict(
        self,
        data: dict[str, Any] | None,
    ) -> OrbIntelligenceQualitySummary | None:
        if not data:
            return None
        summary = data.get("summary") or {}
        return OrbIntelligenceQualitySummary(
            overall_score=float(data.get("overall_score", 0.75)),
            passed=bool(data.get("passed", True)),
            headline=_text(summary.get("headline")) or None,
            flags=list(data.get("flags") or []),
            recommendations=list(data.get("recommendations") or []),
            requires_human_review=bool(data.get("requires_human_review")),
            safety_notes=list(data.get("safety_notes") or []),
        )

    def save_options_from_request(self, request: Any) -> OrbSavedOutputSaveOptions | None:
        if not getattr(request, "save_output", False):
            return None
        output_type = getattr(request, "save_output_type", None)
        return OrbSavedOutputSaveOptions(
            save_output=True,
            project_id=getattr(request, "project_id", None),
            project_name=getattr(request, "project_name", None),
            profile_ids=list(getattr(request, "profile_ids", None) or []),
            tags=list(getattr(request, "tags", None) or []),
            title=getattr(request, "save_title", None),
            output_type=output_type if output_type else None,  # type: ignore[arg-type]
        )

    def build_save_envelope(
        self,
        output: OrbIntelligenceOutput,
        request: Any | None = None,
        *,
        created_from: str = "manual",
        created_from_id: str | None = None,
        analysis_mode: str | None = None,
        save_output: bool | None = None,
        project_id: str | None = None,
        project_name: str | None = None,
        tags: list[str] | None = None,
        save_title: str | None = None,
        save_output_type: OrbSavedOutputType | None = None,
    ) -> dict[str, Any]:
        from services.orb_saved_output_service import orb_saved_output_service

        options = self.save_options_from_request(request) if request is not None else None
        if options is None and save_output:
            options = OrbSavedOutputSaveOptions(
                save_output=True,
                project_id=project_id,
                project_name=project_name,
                tags=list(tags or []),
                title=save_title,
                output_type=save_output_type,
            )
        hints, saved = orb_saved_output_service.maybe_save_intelligence(
            output,
            options,
            created_from=created_from,
            created_from_id=created_from_id,
            analysis_mode=analysis_mode,
        )
        return {
            "intelligence_output": output.model_dump(),
            "save_hints": hints.model_dump(),
            "saved_output": saved.model_dump(),
        }


orb_intelligence_output_service = OrbIntelligenceOutputService()
