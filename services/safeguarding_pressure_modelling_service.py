from __future__ import annotations

from typing import Any


class SafeguardingPressureModellingService:
    """Models cumulative safeguarding pressure and operational saturation."""

    def analyse(
        self,
        *,
        repeated_incidents: int = 0,
        missing_episodes: int = 0,
        unresolved_safeguarding_actions: int = 0,
        workforce_fatigue: int = 0,
        emotional_volatility: int = 0,
    ) -> dict[str, Any]:
        pressure = (
            repeated_incidents
            + missing_episodes * 2
            + unresolved_safeguarding_actions * 2
            + workforce_fatigue
            + emotional_volatility
        )
        return {
            "pressure_index": pressure,
            "pressure_state": self._state(pressure),
            "risk_of_normalisation": pressure >= 8,
            "core_questions": [
                "Are repeated concerns becoming normalised?",
                "Could emotional fatigue reduce professional curiosity?",
                "What risks are escalating over time rather than resolving?",
                "What support or escalation is needed now?",
            ],
            "recommended_actions": self._actions(pressure),
        }

    def prompt_addendum(
        self,
        *,
        repeated_incidents: int = 0,
        missing_episodes: int = 0,
        unresolved_safeguarding_actions: int = 0,
        workforce_fatigue: int = 0,
        emotional_volatility: int = 0,
    ) -> str:
        data = self.analyse(
            repeated_incidents=repeated_incidents,
            missing_episodes=missing_episodes,
            unresolved_safeguarding_actions=unresolved_safeguarding_actions,
            workforce_fatigue=workforce_fatigue,
            emotional_volatility=emotional_volatility,
        )
        lines = [
            "Safeguarding pressure modelling:",
            f"- Pressure state: {data['pressure_state']}",
            f"- Pressure index: {data['pressure_index']}",
        ]
        if data["risk_of_normalisation"]:
            lines.append("- Warning: repeated safeguarding pressure may be becoming normalised.")
        lines.append("- Recommended actions:")
        for action in data["recommended_actions"]:
            lines.append(f"  - {action}")
        return "\n".join(lines)

    def _state(self, pressure: int) -> str:
        if pressure >= 12:
            return "critical_pressure"
        if pressure >= 7:
            return "elevated_pressure"
        if pressure >= 3:
            return "watch_pressure"
        return "stable_or_unclear"

    def _actions(self, pressure: int) -> list[str]:
        if pressure >= 12:
            return [
                "Immediate safeguarding leadership review.",
                "Increase oversight frequency.",
                "Review staffing resilience and escalation pathways.",
                "Reassess risk management and protective planning.",
            ]
        if pressure >= 7:
            return [
                "Review repeated themes and escalation effectiveness.",
                "Increase reflective oversight.",
                "Support workforce emotional resilience.",
            ]
        return [
            "Maintain reflective safeguarding oversight.",
            "Track emerging concerns early.",
        ]


safeguarding_pressure_modelling_service = SafeguardingPressureModellingService()
