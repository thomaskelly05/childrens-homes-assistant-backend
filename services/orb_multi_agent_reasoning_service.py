from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class AgentPerspective:
    agent: str
    role: str
    focus: tuple[str, ...]
    questions: tuple[str, ...]
    cautions: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbMultiAgentReasoningService:
    """Multi-agent cognition synthesis for ORB.

    This is not multiple live LLM calls. It is a deterministic expert-perspective
    frame that teaches ORB to answer through several professional lenses before
    composing one coherent response.
    """

    AGENTS = {
        "inspector": AgentPerspective(
            agent="inspector",
            role="Ofsted/SCCIF scrutiny lens",
            focus=("child lived experience", "progress", "safeguarding", "leadership impact", "evidence strength"),
            questions=(
                "What would an inspector ask to understand the child's lived experience?",
                "What evidence shows impact rather than activity?",
                "Is leadership oversight visible?",
                "Is any risk repeated, normalised or weakly reviewed?",
            ),
            cautions=("Do not predict an Ofsted grade.", "Do not overstate evidence that is not visible."),
        ),
        "registered_manager": AgentPerspective(
            agent="registered_manager",
            role="Registered Manager operational judgement lens",
            focus=("immediate safety", "oversight", "actions", "staff support", "record quality"),
            questions=(
                "What do I need to know today?",
                "What needs sign-off, review or escalation?",
                "What could go wrong tonight?",
                "Which plan, risk assessment or action may need updating?",
            ),
        ),
        "responsible_individual": AgentPerspective(
            agent="responsible_individual",
            role="Provider governance and assurance lens",
            focus=("home safety", "manager support", "governance drift", "provider learning", "audit quality"),
            questions=(
                "Is the home safe and stable?",
                "Is the manager supported and challenged?",
                "Are repeated findings acted on?",
                "Is the provider learning or just documenting compliance?",
            ),
        ),
        "safeguarding": AgentPerspective(
            agent="safeguarding",
            role="Safeguarding and escalation lens",
            focus=("known facts", "unknowns", "immediate risk", "escalation", "protective action"),
            questions=(
                "What is known, unknown and time-critical?",
                "Who needs to be informed?",
                "What cannot wait?",
                "What evidence must be preserved?",
            ),
            cautions=("Do not make threshold decisions.", "Refer to local procedures where risk is present."),
        ),
        "therapeutic_lead": AgentPerspective(
            agent="therapeutic_lead",
            role="Therapeutic and relational practice lens",
            focus=("behaviour as communication", "co-regulation", "shame", "repair", "emotional containment"),
            questions=(
                "What might the child's behaviour or presentation be communicating?",
                "What regulation support is needed?",
                "Has repair happened after rupture?",
                "How can adults respond without shame or punishment?",
            ),
        ),
        "recording_auditor": AgentPerspective(
            agent="recording_auditor",
            role="Recording quality and evidence lens",
            focus=("factuality", "child voice", "adult response", "impact", "follow-up", "manager review"),
            questions=(
                "Is the record factual and respectful?",
                "Is child voice visible?",
                "Does the record show what adults did and why?",
                "Does it show outcome and follow-up?",
            ),
        ),
        "workforce_wellbeing": AgentPerspective(
            agent="workforce_wellbeing",
            role="Staff wellbeing and team culture lens",
            focus=("burnout", "debrief", "emotional availability", "team culture", "reflective capacity"),
            questions=(
                "Are adults emotionally able to respond well?",
                "Is debrief or supervision needed?",
                "Could fatigue or stress be affecting practice?",
                "What support does the team need to stay safe and reflective?",
            ),
        ),
    }

    def synthesise(self, text: str, *, mode: str | None = None) -> dict[str, Any]:
        lower = str(text or "").lower()
        selected = self._select_agents(lower, mode=mode)
        return {
            "selected_agents": [agent.to_dict() for agent in selected],
            "synthesis_rule": "Use specialist perspectives to inform one coherent, calm, practical response rather than listing separate agent outputs.",
            "priority_order": [agent.agent for agent in selected],
        }

    def prompt_addendum(self, text: str, *, mode: str | None = None) -> str:
        data = self.synthesise(text, mode=mode)
        lines = ["Multi-agent reasoning synthesis:", f"- Rule: {data['synthesis_rule']}"]
        for agent in data["selected_agents"]:
            lines.append(f"- {agent['agent']} ({agent['role']})")
            lines.append("  Focus: " + "; ".join(agent["focus"][:5]))
            lines.append("  Questions: " + "; ".join(agent["questions"][:4]))
            if agent["cautions"]:
                lines.append("  Cautions: " + "; ".join(agent["cautions"]))
        return "\n".join(lines)

    def _select_agents(self, lower: str, *, mode: str | None = None) -> list[AgentPerspective]:
        selected: list[AgentPerspective] = []
        def add(key: str) -> None:
            agent = self.AGENTS[key]
            if agent not in selected:
                selected.append(agent)

        if any(term in lower for term in ("safeguarding", "allegation", "missing", "harm", "abuse", "police", "exploitation", "lado")):
            add("safeguarding")
        if any(term in lower for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45", "evidence", "quality standard")):
            add("inspector")
        if any(term in lower for term in ("manager", "oversight", "action", "review", "sign off", "risk assessment")):
            add("registered_manager")
        if any(term in lower for term in ("provider", "responsible individual", "ri", "governance", "audit", "drift")):
            add("responsible_individual")
        if any(term in lower for term in ("trauma", "behaviour", "behavior", "repair", "co-regulation", "shame", "dysregulated", "therapeutic")):
            add("therapeutic_lead")
        if any(term in lower for term in ("record", "recording", "daily note", "incident report", "wording", "child voice")):
            add("recording_auditor")
        if any(term in lower for term in ("staff", "burnout", "tired", "overwhelmed", "debrief", "supervision", "team")):
            add("workforce_wellbeing")

        if not selected:
            add("registered_manager")
            add("therapeutic_lead")
            add("recording_auditor")
        if len(selected) < 3:
            add("inspector")
        return selected[:6]


orb_multi_agent_reasoning_service = OrbMultiAgentReasoningService()
