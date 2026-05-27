from __future__ import annotations

from typing import Any


class OrbRecordToActionService:
    """Converts records/scenarios into operational thinking prompts.

    This is guidance support only. It does not make safeguarding threshold decisions.
    """

    ACTION_RULES = {
        "missing": {
            "actions": [
                "Review missing-from-care chronology and patterns.",
                "Consider return-home conversation and emotional formulation.",
                "Review exploitation/contextual safeguarding risks.",
                "Check whether risk assessment and placement plans need updating.",
            ],
            "oversight": [
                "Manager review of repeated episodes.",
                "Multi-agency communication where relevant.",
            ],
        },
        "allegation": {
            "actions": [
                "Preserve factual information and exact wording.",
                "Escalate through safeguarding/allegations procedures.",
                "Separate allegation from assumption or conclusion.",
            ],
            "oversight": [
                "Manager/DSL review.",
                "Consider LADO/local safeguarding consultation.",
            ],
        },
        "restraint": {
            "actions": [
                "Review antecedents, alternatives attempted and proportionality.",
                "Ensure debrief and emotional repair happen.",
                "Consider whether plans need updating.",
            ],
            "oversight": [
                "Manager review and reduction planning.",
                "Pattern analysis for repeated interventions.",
            ],
        },
        "complaint": {
            "actions": [
                "Capture child voice clearly.",
                "Review whether advocacy is needed.",
                "Evidence response and outcome.",
            ],
            "oversight": [
                "Leadership review for repeated themes.",
                "Quality assurance learning review.",
            ],
        },
        "safeguarding": {
            "actions": [
                "Clarify known facts, concerns and unknowns.",
                "Identify immediate safety actions.",
                "Record who was informed and when.",
            ],
            "oversight": [
                "Manager/DSL oversight.",
                "Check follow-up and review actions.",
            ],
        },
    }

    DEFAULT_ACTIONS = [
        "Check whether the record clearly explains before, during and after.",
        "Check whether child voice and adult response are visible.",
        "Identify whether follow-up or oversight is needed.",
    ]

    def analyse(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        matched: dict[str, Any] = {}
        for trigger, config in self.ACTION_RULES.items():
            if trigger in lower:
                matched[trigger] = config
        if not matched:
            matched["general"] = {
                "actions": self.DEFAULT_ACTIONS,
                "oversight": ["Consider whether manager review is needed."],
            }
        return {
            "record_to_action": matched,
            "boundary": "ORB supports reflective operational thinking and does not replace local safeguarding procedures or management decisions.",
        }

    def prompt_addendum(self, text: str) -> str:
        analysis = self.analyse(text)
        lines = ["Record-to-action cognition:"]
        for key, value in analysis["record_to_action"].items():
            lines.append(f"- Trigger area: {key}")
            lines.append("  Suggested actions:")
            for item in value["actions"]:
                lines.append(f"    - {item}")
            lines.append("  Oversight considerations:")
            for item in value["oversight"]:
                lines.append(f"    - {item}")
        lines.append(f"- Boundary: {analysis['boundary']}")
        return "\n".join(lines)


orb_record_to_action_service = OrbRecordToActionService()
