from __future__ import annotations

from typing import Any


class ProviderWideCognitionService:
    """Provider-wide governance and organisational cognition.

    Focus:
    - cross-home drift
    - repeated safeguarding themes
    - workforce fragility
    - inspection readiness
    - provider learning
    """

    def analyse(
        self,
        *,
        homes_under_pressure: int = 0,
        repeated_findings: int = 0,
        safeguarding_events: int = 0,
        overdue_actions: int = 0,
        staffing_concerns: int = 0,
    ) -> dict[str, Any]:
        risk_index = (
            homes_under_pressure * 2
            + repeated_findings * 2
            + safeguarding_events
            + overdue_actions
            + staffing_concerns
        )
        return {
            "provider_risk_index": risk_index,
            "provider_state": self._state(risk_index),
            "core_questions": [
                "Are repeated themes being acted on across homes?",
                "Where is governance strongest and weakest?",
                "Are homes learning from each other?",
                "Is workforce pressure affecting safeguarding or stability?",
                "What would a provider-wide inspector lens identify?",
            ],
            "recommended_focus": self._focus(risk_index),
        }

    def prompt_addendum(
        self,
        *,
        homes_under_pressure: int = 0,
        repeated_findings: int = 0,
        safeguarding_events: int = 0,
        overdue_actions: int = 0,
        staffing_concerns: int = 0,
    ) -> str:
        data = self.analyse(
            homes_under_pressure=homes_under_pressure,
            repeated_findings=repeated_findings,
            safeguarding_events=safeguarding_events,
            overdue_actions=overdue_actions,
            staffing_concerns=staffing_concerns,
        )
        lines = [
            "Provider-wide cognition:",
            f"- Provider state: {data['provider_state']}",
            f"- Risk index: {data['provider_risk_index']}",
            "- Recommended focus:",
        ]
        for item in data["recommended_focus"]:
            lines.append(f"  - {item}")
        return "\n".join(lines)

    def _state(self, risk_index: int) -> str:
        if risk_index >= 12:
            return "provider_under_pressure"
        if risk_index >= 6:
            return "emerging_provider_risk"
        return "provider_stable_or_unclear"

    def _focus(self, risk_index: int) -> list[str]:
        if risk_index >= 12:
            return [
                "Increase provider oversight visibility.",
                "Review safeguarding and workforce pressure urgently.",
                "Escalate repeated governance themes.",
                "Stabilise leadership and action tracking.",
            ]
        if risk_index >= 6:
            return [
                "Review repeated themes across homes.",
                "Strengthen audit follow-through.",
                "Review workforce resilience and support.",
            ]
        return [
            "Maintain reflective governance and provider learning.",
            "Track emerging themes early.",
        ]


provider_wide_cognition_service = ProviderWideCognitionService()
