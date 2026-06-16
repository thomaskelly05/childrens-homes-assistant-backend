"""Registry of standalone ORB specialist agents — no OS or care-record access."""

from __future__ import annotations

import re
from typing import Any

from schemas.orb_agents import (
    OrbAgentCapability,
    OrbAgentDefinition,
    OrbAgentOutputFormat,
    OrbAgentType,
)

LIVE_WEB_NOTE = (
    "Live web retrieval is not enabled in standalone ORB. "
    "This research uses the ORB Knowledge Library and built-in source packs."
)

STANDALONE_BOUNDARY_NOTICE = (
    "Standalone ORB does not access live IndiCare OS records, Care Hub, chronology, "
    "child files, staff records or dashboards."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: str) -> str:
    return _text(value).lower()


class OrbAgentRegistryService:
    """Defines and classifies standalone ORB agents."""

    def __init__(self) -> None:
        self._agents = self._build_definitions()

    def _cap(self, agent_id: str, name: str, description: str) -> OrbAgentCapability:
        return OrbAgentCapability(id=agent_id, name=name, description=description)

    def _build_definitions(self) -> dict[OrbAgentType, OrbAgentDefinition]:
        common_sources = [
            "knowledge_library",
            "source_packs",
            "user_uploaded",
            "built_in_regulatory",
        ]
        common_tools = ["rag_retrieval", "semantic_search", "citation_builder", "model_router"]

        agents: list[OrbAgentDefinition] = [
            OrbAgentDefinition(
                id="deep_research",
                name="Deep Research Agent",
                type="deep_research",
                description=(
                    "Broad source-backed research using the ORB Knowledge Library with citations, "
                    "findings and practical implications."
                ),
                capabilities=[
                    self._cap("multi_pass_retrieval", "Multi-pass retrieval", "Primary and supporting sources"),
                    self._cap("source_clustering", "Source clustering", "Groups related guidance"),
                    self._cap("gap_analysis", "Gap analysis", "Identifies limits in available sources"),
                ],
                allowed_sources=common_sources,
                allowed_tools=[*common_tools, "deep_research_workflow"],
                risk_level="medium",
                requires_citations=True,
                output_formats=["answer", "briefing", "action_plan"],
                safety_notice=STANDALONE_BOUNDARY_NOTICE,
            ),
            OrbAgentDefinition(
                id="ofsted_research",
                name="Ofsted Research Agent",
                type="ofsted_research",
                description=(
                    "SCCIF, Quality Standards and Ofsted evidence thinking — evidence-focused, "
                    "no grades or inspection outcome predictions."
                ),
                capabilities=[
                    self._cap("regulatory_lens", "Regulatory lens", "Child voice, progress, safeguarding evidence"),
                    self._cap("evidence_map", "Evidence mapping", "What inspectors may look for"),
                ],
                allowed_sources=[*common_sources, "regulatory_framework"],
                allowed_tools=common_tools,
                risk_level="high",
                requires_citations=True,
                output_formats=["briefing", "checklist", "evidence_map"],
                safety_notice=(
                    "No inspection grades or outcome predictions. Evidence-focused guidance only. "
                    + STANDALONE_BOUNDARY_NOTICE
                ),
            ),
            OrbAgentDefinition(
                id="recording_quality",
                name="Recording Quality Agent",
                type="recording_quality",
                description=(
                    "Factual, child-centred, non-punitive recording support — drafts must be reviewed "
                    "by a responsible adult or manager."
                ),
                capabilities=[
                    self._cap("rewrite", "Draft rewrite", "Child-centred factual wording"),
                    self._cap("checklist", "Recording checklist", "What evidence to include"),
                ],
                allowed_sources=[*common_sources, "recording_quality"],
                allowed_tools=common_tools,
                risk_level="medium",
                requires_citations=True,
                output_formats=["answer", "checklist"],
                safety_notice=(
                    "Drafts must be reviewed by an adult or manager before use in records. "
                    "Avoid judgemental language."
                ),
            ),
            OrbAgentDefinition(
                id="safeguarding_reflection",
                name="Safeguarding Reflection Agent",
                type="safeguarding_reflection",
                description=(
                    "High-safety reflective support — does not decide thresholds; "
                    "recommends escalation for immediate risk."
                ),
                capabilities=[
                    self._cap("reflection", "Reflective prompts", "Structured safeguarding reflection"),
                    self._cap("escalation", "Escalation reminders", "Immediate risk and DSL guidance"),
                ],
                allowed_sources=[*common_sources, "safeguarding_principles"],
                allowed_tools=common_tools,
                risk_level="safeguarding_sensitive",
                requires_citations=True,
                output_formats=["answer", "briefing", "action_plan"],
                safety_notice=(
                    "ORB does not decide safeguarding thresholds. If there is current or immediate risk, "
                    "follow local procedures and escalate immediately to your safeguarding lead or emergency services. "
                    "Seek manager, DSL and local authority advice as appropriate."
                ),
            ),
            OrbAgentDefinition(
                id="policy_comparison",
                name="Policy Comparison Agent",
                type="policy_comparison",
                description=(
                    "Compares user-provided policy or text to knowledge sources — support only, not legal advice."
                ),
                capabilities=[
                    self._cap("compare", "Policy comparison", "Gap analysis against guidance"),
                ],
                allowed_sources=[*common_sources, "policy"],
                allowed_tools=common_tools,
                risk_level="medium",
                requires_citations=True,
                output_formats=["comparison", "briefing"],
                safety_notice=(
                    "Support only — not legal advice. Check updates with your responsible person or policy owner."
                ),
            ),
            OrbAgentDefinition(
                id="manager_briefing",
                name="Manager Briefing Agent",
                type="manager_briefing",
                description="Turns research into a concise manager briefing with risks, actions and sources.",
                capabilities=[
                    self._cap("briefing", "Manager briefing", "Short executive summary for leaders"),
                ],
                allowed_sources=common_sources,
                allowed_tools=common_tools,
                risk_level="medium",
                requires_citations=True,
                output_formats=["briefing", "action_plan"],
                safety_notice=STANDALONE_BOUNDARY_NOTICE,
            ),
            OrbAgentDefinition(
                id="therapeutic_practice",
                name="Therapeutic Practice Agent",
                type="therapeutic_practice",
                description=(
                    "Behaviour as communication, trauma-informed practice, response options and repair planning."
                ),
                capabilities=[
                    self._cap("trauma_informed", "Trauma-informed lens", "Regulation and repair thinking"),
                ],
                allowed_sources=[*common_sources, "therapeutic_practice"],
                allowed_tools=common_tools,
                risk_level="medium",
                requires_citations=True,
                output_formats=["answer", "supervision_guide", "action_plan"],
                safety_notice=STANDALONE_BOUNDARY_NOTICE,
            ),
            OrbAgentDefinition(
                id="general_research",
                name="General Research Agent",
                type="general_research",
                description="General source-backed research using available knowledge packs and library passages.",
                capabilities=[
                    self._cap("research", "General research", "Explains guidance with citations"),
                ],
                allowed_sources=common_sources,
                allowed_tools=common_tools,
                risk_level="low",
                requires_citations=True,
                output_formats=["answer", "briefing"],
                safety_notice=LIVE_WEB_NOTE,
            ),
            OrbAgentDefinition(
                id="document_analysis",
                name="Document Analysis Agent",
                type="document_analysis",
                description="Analyses user-supplied text or attachments against knowledge sources.",
                capabilities=[
                    self._cap("analyse", "Document analysis", "Structured review of pasted content"),
                ],
                allowed_sources=common_sources,
                allowed_tools=common_tools,
                risk_level="medium",
                requires_citations=True,
                output_formats=["answer", "briefing", "comparison"],
                safety_notice=STANDALONE_BOUNDARY_NOTICE,
            ),
        ]
        return {agent.type: agent for agent in agents}

    def list_agents(self) -> list[OrbAgentDefinition]:
        return list(self._agents.values())

    def get_agent(self, agent_type: OrbAgentType) -> OrbAgentDefinition | None:
        return self._agents.get(agent_type)

    def agent_available(self, agent_type: OrbAgentType) -> bool:
        return agent_type in self._agents

    def allowed_source_types(self, agent_type: OrbAgentType) -> list[str]:
        agent = self.get_agent(agent_type)
        return list(agent.allowed_sources) if agent else []

    def default_output_format(self, agent_type: OrbAgentType) -> OrbAgentOutputFormat:
        defaults: dict[OrbAgentType, OrbAgentOutputFormat] = {
            "deep_research": "briefing",
            "ofsted_research": "briefing",
            "recording_quality": "answer",
            "safeguarding_reflection": "briefing",
            "policy_comparison": "comparison",
            "manager_briefing": "briefing",
            "therapeutic_practice": "answer",
            "general_research": "answer",
            "document_analysis": "briefing",
        }
        return defaults.get(agent_type, "answer")

    def classify_agent(
        self,
        prompt: str,
        *,
        mode: str | None = None,
        attachments: list[Any] | None = None,
    ) -> tuple[OrbAgentType, str]:
        lower = _lower(prompt)
        mode_name = _lower(mode or "")

        if attachments:
            if any(_text(getattr(a, "content", None) or getattr(a, "data_url", None)) for a in attachments):
                if any(term in lower for term in ("compare", "policy", "gap")):
                    return "policy_comparison", "User attachment with comparison intent"
                return "document_analysis", "User supplied document or attachment for analysis"

        if any(phrase in lower for phrase in ("compare this policy", "compare policy", "policy comparison", "gap analysis")):
            return "policy_comparison", "Policy comparison requested"

        if any(phrase in lower for phrase in ("manager briefing", "create a briefing", "briefing for manager", "executive summary")):
            return "manager_briefing", "Manager briefing requested"

        if any(phrase in lower for phrase in ("evidence map", "Inspection evidence support", "Inspection evidence support", "inspection evidence")):
            return "ofsted_research", "Ofsted evidence mapping requested"

        if mode_name in {"ofsted lens", "ofsted"} or any(
            term in lower
            for term in ("ofsted", "sccif", "quality standards", "child voice evidence", "inspection")
        ):
            if any(term in lower for term in ("research", "briefing", "checklist", "evidence")):
                return "ofsted_research", "Ofsted-focused research or briefing"

        if any(phrase in lower for phrase in ("deep research", "research what", "research how")):
            return "deep_research", "Deep research intent"

        if any(phrase in lower for phrase in ("safeguarding review", "safeguarding concern", "does this need safeguarding", "threshold")):
            return "safeguarding_reflection", "Safeguarding reflection requested"

        if any(phrase in lower for phrase in ("daily note", "rewrite this", "record this", "recording quality", "child-centred wording")):
            return "recording_quality", "Recording quality support requested"

        if any(phrase in lower for phrase in ("therapeutic", "behaviour as communication", "trauma-informed", "repair plan")):
            return "therapeutic_practice", "Therapeutic practice support"

        if any(phrase in lower for phrase in ("action plan", "checklist", "compare", "research", "summarise guidance", "summarize guidance")):
            if "compare" in lower:
                return "policy_comparison", "Comparison-style research"
            if "briefing" in lower:
                return "manager_briefing", "Briefing-style research"
            return "deep_research", "Structured research task"

        if re.search(r"\bresearch\b", lower):
            return "general_research", "General research query"

        return "general_research", "Default general research agent"


orb_agent_registry_service = OrbAgentRegistryService()
