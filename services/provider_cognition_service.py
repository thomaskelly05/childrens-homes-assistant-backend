from __future__ import annotations

from collections import Counter
from typing import Any


class ProviderCognitionService:
    """Provider-wide institutional cognition foundations.

    Supports provider-level reflection across homes, safeguarding themes,
    workforce strain, evidence drift and inspection readiness.
    """

    HIGH_PRESSURE_TERMS = {
        "missing",
        "restraint",
        "allegation",
        "agency staff",
        "burnout",
        "unsafe",
        "police",
        "high risk",
    }

    POSITIVE_TERMS = {
        "repair",
        "stable",
        "warm",
        "improved",
        "regulated",
        "supported",
    }

    def analyse(self, *, home_summaries: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        home_summaries = home_summaries or []

        pressure = Counter()
        positives = Counter()
        home_signals = []

        for summary in home_summaries:
            text = str(summary.get("summary") or "").lower()
            home_name = summary.get("home_name") or "Unknown home"

            matched_pressure = [term for term in self.HIGH_PRESSURE_TERMS if term in text]
            matched_positive = [term for term in self.POSITIVE_TERMS if term in text]

            for item in matched_pressure:
                pressure[item] += 1
            for item in matched_positive:
                positives[item] += 1

            home_signals.append(
                {
                    "home_name": home_name,
                    "pressure_indicators": matched_pressure,
                    "protective_indicators": matched_positive,
                }
            )

        provider_state = self._state(pressure_total=sum(pressure.values()), positive_total=sum(positives.values()))

        return {
            "provider_state": provider_state,
            "home_signals": home_signals,
            "provider_pressure_themes": dict(pressure),
            "provider_protective_themes": dict(positives),
            "provider_reflective_questions": self._questions(provider_state=provider_state),
            "governance_guidance": self._guidance(provider_state=provider_state),
            "future_provider_capabilities": [
                "cross-home safeguarding drift detection",
                "provider-wide emotional climate awareness",
                "inspection trajectory cognition",
                "workforce fragility awareness",
                "organisational learning continuity",
            ],
        }

    def prompt_addendum(self, *, home_summaries: list[dict[str, Any]] | None = None) -> str:
        result = self.analyse(home_summaries=home_summaries)
        return "\n".join(
            [
                "Provider cognition:",
                f"- Provider state: {result['provider_state']}",
                f"- Pressure themes: {len(result['provider_pressure_themes'])}",
                f"- Protective themes: {len(result['provider_protective_themes'])}",
            ]
        )

    def _state(self, *, pressure_total: int, positive_total: int) -> str:
        if pressure_total > positive_total * 1.5:
            return "provider_under_pressure"
        if positive_total > pressure_total * 1.5:
            return "provider_stable_supportive"
        return "provider_mixed_operational_state"

    def _questions(self, *, provider_state: str) -> list[str]:
        questions = [
            "What patterns are repeating across homes?",
            "Where is leadership visibility strongest or weakest?",
            "Where are children experiencing the greatest instability?",
        ]
        if provider_state == "provider_under_pressure":
            questions.extend([
                "Are workforce pressures affecting safeguarding quality?",
                "Where may organisational support or intervention now be needed?",
            ])
        return questions

    def _guidance(self, *, provider_state: str) -> list[str]:
        if provider_state == "provider_under_pressure":
            return [
                "Consider provider-level review of workforce strain and safeguarding pressure.",
                "Review whether repeated themes are appearing across homes.",
                "Ensure leadership oversight remains emotionally and operationally containing.",
            ]
        if provider_state == "provider_stable_supportive":
            return [
                "Capture and reinforce protective practice patterns across homes.",
                "Identify what is supporting relational stability and workforce resilience.",
            ]
        return [
            "Continue reflective provider-level oversight and trend monitoring.",
        ]


provider_cognition_service = ProviderCognitionService()
