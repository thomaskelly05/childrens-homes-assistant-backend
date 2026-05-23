"""Registry of standalone ORB agents — no OS record access."""

from __future__ import annotations

from schemas.orb_agents import OrbAgentCapability, OrbAgentDefinition

DOCUMENT_ANALYSIS_AGENT = OrbAgentDefinition(
    id="document_analysis",
    name="Document Analysis Agent",
    agent_type="document_analysis",
    description=(
        "Analyses user-uploaded standalone documents: explain, summarise, action plans, "
        "briefings, policy comparison, and regulatory lenses."
    ),
    capabilities=[
        OrbAgentCapability(id="explain", label="Explain document"),
        OrbAgentCapability(id="summarise", label="Summarise document"),
        OrbAgentCapability(id="action_plan", label="Create action plan"),
        OrbAgentCapability(id="policy_comparison", label="Policy comparison"),
        OrbAgentCapability(id="ofsted_lens", label="Ofsted lens"),
        OrbAgentCapability(id="safeguarding_lens", label="Safeguarding lens"),
        OrbAgentCapability(id="recording_lens", label="Recording lens"),
        OrbAgentCapability(id="manager_briefing", label="Manager briefing"),
        OrbAgentCapability(id="staff_briefing", label="Staff briefing"),
    ],
    allowed_sources=["user_uploaded", "knowledge_library", "source_packs"],
    standalone_only=True,
    os_linked=False,
    care_record_access=False,
)

DEEP_RESEARCH_AGENT = OrbAgentDefinition(
    id="deep_research",
    name="Deep Research Agent",
    agent_type="deep_research",
    description="Deep research across ORB Knowledge Library and uploaded documents.",
    capabilities=[
        OrbAgentCapability(id="research", label="Deep research"),
        OrbAgentCapability(id="guidance_lookup", label="Guidance lookup"),
    ],
    allowed_sources=["knowledge_library", "source_packs", "user_uploaded"],
    standalone_only=True,
    os_linked=False,
    care_record_access=False,
)

GENERAL_AGENT = OrbAgentDefinition(
    id="general_assistant",
    name="General Assistant",
    agent_type="general_assistant",
    description="Broad ChatGPT-class standalone assistant with care specialist knowledge.",
    capabilities=[
        OrbAgentCapability(id="chat", label="General chat"),
        OrbAgentCapability(id="reflect", label="Reflective practice"),
    ],
    allowed_sources=["knowledge_library", "source_packs", "built_in"],
    standalone_only=True,
    os_linked=False,
    care_record_access=False,
)

_AGENTS: dict[str, OrbAgentDefinition] = {
    DOCUMENT_ANALYSIS_AGENT.id: DOCUMENT_ANALYSIS_AGENT,
    DEEP_RESEARCH_AGENT.id: DEEP_RESEARCH_AGENT,
    GENERAL_AGENT.id: GENERAL_AGENT,
}


class OrbAgentRegistryService:
    def list_agents(self) -> list[OrbAgentDefinition]:
        return list(_AGENTS.values())

    def get_agent(self, agent_id: str) -> OrbAgentDefinition | None:
        return _AGENTS.get(agent_id)

    def get_document_analysis_agent(self) -> OrbAgentDefinition:
        return DOCUMENT_ANALYSIS_AGENT


orb_agent_registry_service = OrbAgentRegistryService()
