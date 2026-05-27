from __future__ import annotations

from typing import Any


class OrbEvidenceReasoningService:
    """Evidence reasoning spine for standalone ORB.

    Core reasoning model:
    see the record → understand the child → check the regulation → identify the risk
    → coach the adult → create the action → evidence the oversight → prepare for inspection.
    """

    REASONING_CHAIN = [
        "See the record or scenario clearly.",
        "Understand the child, context and lived experience.",
        "Check relevant safeguarding, regulatory and therapeutic considerations.",
        "Identify risks, patterns, escalation needs and missing information.",
        "Coach the adult toward safer, calmer, more child-centred practice.",
        "Identify actions, follow-up and who needs oversight.",
        "Evidence the management, safeguarding and review trail.",
        "Prepare for scrutiny, learning and inspection readiness.",
    ]

    EVIDENCE_NETWORK = {
        "incident": ["chronology", "risk assessment", "manager review", "follow-up action"],
        "missing_episode": ["chronology", "return home conversation", "risk update", "multi-agency review"],
        "safeguarding_concern": ["chronology", "referral/escalation", "safety planning", "oversight"],
        "restraint": ["debrief", "behaviour support plan", "manager review", "reduction planning"],
        "complaint": ["child voice", "response", "outcome", "learning review"],
        "supervision": ["practice reflection", "wellbeing", "actions", "competence review"],
    }

    def prompt_addendum(self) -> str:
        lines = ["Evidence reasoning spine:"]
        for step in self.REASONING_CHAIN:
            lines.append(f"- {step}")
        lines.append("- Evidence networks:")
        for source, links in self.EVIDENCE_NETWORK.items():
            lines.append(f"  - {source} should connect to: {', '.join(links)}")
        return "\n".join(lines)

    def context_payload(self) -> dict[str, Any]:
        return {
            "reasoning_chain": self.REASONING_CHAIN,
            "evidence_network": self.EVIDENCE_NETWORK,
        }


orb_evidence_reasoning_service = OrbEvidenceReasoningService()
