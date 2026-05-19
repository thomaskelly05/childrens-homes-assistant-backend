from __future__ import annotations

from typing import Any


class OrbOperationalAtmosphereService:
    """Summarises the current home/child operational atmosphere from existing context.

    This is not a prediction engine. It turns permitted records, actions and
    cognition signals into a calm operational state summary for ORB/RM review.
    """

    def build(
        self,
        *,
        context: dict[str, Any],
        cognition: dict[str, Any] | None = None,
        trajectory: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        cognition = cognition or {}
        trajectory = trajectory or {}
        chronology_count = len(context.get("chronology") or [])
        safeguarding_count = len(context.get("safeguarding") or [])
        action_count = len(context.get("actions") or [])
        workforce = context.get("workforce") or {}
        pressure = int(cognition.get("pressure_signal_count") or 0)
        positive = int(cognition.get("positive_signal_count") or 0)
        overdue = int(trajectory.get("overdue_action_count") or 0)

        indicators: list[str] = []
        stability: list[str] = []

        if safeguarding_count:
            indicators.append("safeguarding visibility is present in this evidence window")
        if overdue:
            indicators.append("open or overdue actions may need management attention")
        if pressure > positive:
            indicators.append("pressure signals are more visible than stability signals")
        if workforce:
            indicators.append("workforce context is available for whole-home review")
        if chronology_count >= 5:
            stability.append("chronology is sufficiently populated for reflective pattern review")
        if positive >= pressure and positive:
            stability.append("positive or stabilising signals are visible")

        atmosphere = "mixed_operational_picture"
        if safeguarding_count >= 3 or overdue >= 5 or pressure >= positive + 3:
            atmosphere = "heightened_operational_pressure"
        elif positive > pressure and safeguarding_count == 0:
            atmosphere = "calm_or_stabilising_picture"
        elif chronology_count == 0 and action_count == 0:
            atmosphere = "limited_live_evidence"

        return {
            "atmosphere": atmosphere,
            "chronology_count": chronology_count,
            "safeguarding_count": safeguarding_count,
            "action_count": action_count,
            "pressure_signal_count": pressure,
            "positive_signal_count": positive,
            "operational_pressure_indicators": indicators[:5],
            "stability_indicators": stability[:5],
            "manager_summary": self._summary(atmosphere, indicators, stability),
        }

    def _summary(self, atmosphere: str, indicators: list[str], stability: list[str]) -> str:
        if atmosphere == "heightened_operational_pressure":
            return "The current evidence window appears more pressured than settled and should be calmly reviewed by the manager."
        if atmosphere == "calm_or_stabilising_picture":
            return "The current evidence window appears more settled, with stabilising signals visible."
        if atmosphere == "limited_live_evidence":
            return "There is not enough live evidence in this scope to describe the home atmosphere safely."
        if indicators or stability:
            return "The current evidence window is mixed; review pressure and stability signals together before drawing conclusions."
        return "No clear operational atmosphere could be described from the current context."


orb_operational_atmosphere_service = OrbOperationalAtmosphereService()
