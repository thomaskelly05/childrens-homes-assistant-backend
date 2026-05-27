from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class InspectorQuestion:
    category: str
    question: str
    why_it_matters: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbInspectorBrainService:
    """Inspection-style cognition layer for standalone ORB.

    This does not predict inspection outcomes.
    It teaches ORB to think like a reflective inspector, RM and RI.
    """

    CORE_QUESTIONS = [
        InspectorQuestion("child_experience", "What is the child’s lived experience here?", "Inspection focuses on real experiences, not paperwork alone."),
        InspectorQuestion("progress", "What progress is the child making and what evidence shows this?", "Progress and outcomes matter more than activity counts."),
        InspectorQuestion("safeguarding", "Is safeguarding understood, acted on and reviewed?", "Weak escalation or oversight can leave children unsafe."),
        InspectorQuestion("recording", "Is the record factual, child-centred and professionally curious?", "Records should support understanding, not just compliance."),
        InspectorQuestion("leadership", "Is leadership oversight visible and meaningful?", "Leaders should know what is happening and act on it."),
        InspectorQuestion("drift", "Are patterns reducing, repeating or escalating?", "Repeated issues may indicate drift or weak plans."),
        InspectorQuestion("child_voice", "Can the child’s voice, wishes and feelings be seen?", "Children should influence the care they receive."),
        InspectorQuestion("impact", "What changed because adults acted?", "Impact matters more than task completion."),
        InspectorQuestion("evidence", "Would this evidence withstand scrutiny during inspection or review?", "Weak evidence weakens confidence in practice."),
        InspectorQuestion("oversight", "What requires manager or provider oversight right now?", "Good oversight prevents escalation and drift."),
    ]

    RM_QUESTIONS = [
        "What do I need to know today?",
        "Which child is escalating or withdrawing?",
        "Which records are weak or incomplete?",
        "What has not been signed off?",
        "What pattern might I be missing?",
        "What would I be challenged on during inspection?",
    ]

    RI_QUESTIONS = [
        "Is the home safe and stable?",
        "Is leadership effective and supported?",
        "Are repeated findings leading to learning?",
        "Are audits meaningful or performative?",
        "Are children safer because of this service?",
    ]

    def prompt_addendum(self, message: str) -> str:
        lines = ["Inspector / RM / RI cognition:"]
        for question in self.CORE_QUESTIONS:
            lines.append(f"- {question.question} ({question.why_it_matters})")
        lines.append("- Registered Manager thinking: " + "; ".join(self.RM_QUESTIONS))
        lines.append("- Responsible Individual thinking: " + "; ".join(self.RI_QUESTIONS))
        return "\n".join(lines)

    def context_payload(self) -> dict[str, Any]:
        return {
            "core_questions": [item.to_dict() for item in self.CORE_QUESTIONS],
            "rm_questions": self.RM_QUESTIONS,
            "ri_questions": self.RI_QUESTIONS,
        }


orb_inspector_brain_service = OrbInspectorBrainService()
