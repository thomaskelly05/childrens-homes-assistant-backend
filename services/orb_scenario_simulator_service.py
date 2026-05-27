from __future__ import annotations

from typing import Any


class OrbScenarioSimulatorService:
    """Scenario simulation cognition for standalone ORB.

    Converts user-described situations into:
    - immediate considerations
    - safeguarding thinking
    - therapeutic response
    - evidence needs
    - oversight prompts
    """

    def build(self, scenario: str) -> dict[str, Any]:
        lower = str(scenario or "").lower()
        return {
            "immediate_considerations": self._immediate(lower),
            "therapeutic_lens": self._therapeutic(lower),
            "safeguarding_lens": self._safeguarding(lower),
            "recording_and_evidence": self._evidence(lower),
            "oversight_questions": self._oversight(lower),
            "what_not_to_do": self._avoid(lower),
        }

    def prompt_addendum(self, scenario: str) -> str:
        data = self.build(scenario)
        lines = ["Scenario simulation cognition:"]
        for key, value in data.items():
            lines.append(f"- {key.replace('_', ' ').title()}:")
            for item in value:
                lines.append(f"  - {item}")
        return "\n".join(lines)

    def _immediate(self, lower: str) -> list[str]:
        base = [
            "Prioritise immediate safety and emotional containment.",
            "Slow the situation down before making assumptions.",
            "Separate known facts from interpretation.",
        ]
        if "missing" in lower:
            base.append("Consider immediate vulnerability, pull factors and who needs informing.")
        if "allegation" in lower:
            base.append("Preserve evidence and escalate through safeguarding/allegations procedures promptly.")
        if "restraint" in lower:
            base.append("Consider injury checks, debrief and whether alternatives were attempted.")
        return base

    def _therapeutic(self, lower: str) -> list[str]:
        return [
            "Consider what the behaviour or presentation may be communicating.",
            "Use calm, boundaried and trauma-informed language.",
            "Think about regulation, repair and relational safety.",
            "Avoid shame-based or punitive framing where possible.",
        ]

    def _safeguarding(self, lower: str) -> list[str]:
        points = [
            "What is known, unknown and time-critical?",
            "Who needs to know now?",
            "Does this require manager/DSL consultation?",
        ]
        if any(term in lower for term in ("police", "exploitation", "sexual", "harm", "missing", "allegation")):
            points.append("Consider external safeguarding or multi-agency involvement.")
        return points

    def _evidence(self, lower: str) -> list[str]:
        return [
            "Record the sequence before, during and after.",
            "Include child voice and adult response.",
            "Identify follow-up actions and oversight.",
            "Link to plans, risks or previous patterns where relevant.",
        ]

    def _oversight(self, lower: str) -> list[str]:
        return [
            "What should leadership know right now?",
            "Is there a repeated pattern or escalation?",
            "What review or audit may be needed?",
            "What would an inspector ask about this situation?",
        ]

    def _avoid(self, lower: str) -> list[str]:
        return [
            "Avoid leading questions or assumptions.",
            "Avoid punitive or shaming language.",
            "Avoid recording opinion as fact.",
            "Avoid delaying escalation when immediate risk may exist.",
        ]


orb_scenario_simulator_service = OrbScenarioSimulatorService()
