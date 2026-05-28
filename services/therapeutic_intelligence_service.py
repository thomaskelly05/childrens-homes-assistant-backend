from __future__ import annotations

"""Therapeutic reflection intelligence for ORB Residential.

Trauma-informed, behaviour-as-communication support without diagnosis.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class TherapeuticIntelligenceResult:
    reframe_prompts: list[str]
    regulation_support: list[str]
    relationship_prompts: list[str]
    behaviour_as_communication: list[str]
    guardrails: list[str] = field(
        default_factory=lambda: [
            "ORB does not diagnose or label children.",
            "Support co-regulation and relational repair; avoid punitive framing.",
        ]
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class TherapeuticIntelligenceService:
    def reflect(self, notes: str) -> TherapeuticIntelligenceResult:
        text = str(notes or "").strip()
        lowered = text.lower()

        reframe: list[str] = [
            "What might this behaviour be communicating about unmet need, fear or overwhelm?",
            "What happened before and after — what regulated or dysregulated the situation?",
        ]
        regulation: list[str] = [
            "Name feelings safely without forcing disclosure.",
            "Prioritise calm adult presence and predictable routines after distress.",
        ]
        relationship: list[str] = [
            "How can the next interaction repair trust without minimising the child's experience?",
        ]
        behaviour: list[str] = []

        if any(word in lowered for word in ("aggressive", "hit", "kick", "swear", "refused")):
            behaviour.append("Consider whether the behaviour was fight/flight/freeze/fawn in context of triggers.")
        if any(word in lowered for word in ("withdraw", "silent", "shutdown", "isolate")):
            behaviour.append("Withdrawal may signal overwhelm — avoid interpreting as defiance without context.")
        if any(word in lowered for word in ("anxious", "worried", "scared")):
            behaviour.append("Anxiety may present as restlessness, controlling behaviour or seeking reassurance.")

        return TherapeuticIntelligenceResult(
            reframe_prompts=reframe,
            regulation_support=regulation,
            relationship_prompts=relationship,
            behaviour_as_communication=behaviour,
        )

    def build_prompt_block(self, notes: str) -> str:
        result = self.reflect(notes)
        lines = [
            "THERAPEUTIC REFLECTION FRAME (trauma-informed, no diagnosis):",
            "",
            "Reframe prompts:",
            *[f"- {item}" for item in result.reframe_prompts],
            "",
            "Regulation support:",
            *[f"- {item}" for item in result.regulation_support],
            "",
            "Behaviour as communication:",
            *(
                [f"- {item}" for item in result.behaviour_as_communication]
                or ["- Explore triggers, unmet needs and felt safety"]
            ),
        ]
        return "\n".join(lines)


therapeutic_intelligence_service = TherapeuticIntelligenceService()
