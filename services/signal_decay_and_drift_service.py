from __future__ import annotations

from typing import Any


class SignalDecayAndDriftService:
    """Temporal operational cognition.

    Models:
    - repeated concerns increasing significance
    - protective factors reducing risk weight
    - unresolved actions increasing drift
    - time-sensitive operational deterioration
    """

    def analyse(self, *, repeated_events: int = 0, unresolved_actions: int = 0, protective_factors: int = 0, days_since_last_event: int | None = None) -> dict[str, Any]:
        risk_weight = repeated_events * 2
        risk_weight += unresolved_actions * 2
        risk_weight -= protective_factors
        if days_since_last_event is not None:
            if days_since_last_event > 30:
                risk_weight -= 1
            elif days_since_last_event < 3:
                risk_weight += 2
        state = self._state(risk_weight)
        return {
            "risk_weight": risk_weight,
            "state": state,
            "interpretation": self._interpretation(state),
            "core_principles": [
                "Repeated concerns matter more than isolated events.",
                "Resolved concerns should gradually reduce in significance.",
                "Protective relationships and stability matter.",
                "Unresolved actions can indicate governance drift.",
            ],
        }

    def prompt_addendum(self, *, repeated_events: int = 0, unresolved_actions: int = 0, protective_factors: int = 0, days_since_last_event: int | None = None) -> str:
        data = self.analyse(
            repeated_events=repeated_events,
            unresolved_actions=unresolved_actions,
            protective_factors=protective_factors,
            days_since_last_event=days_since_last_event,
        )
        return (
            "Signal decay and drift cognition:\n"
            f"- State: {data['state']}\n"
            f"- Interpretation: {data['interpretation']}\n"
            f"- Risk weight: {data['risk_weight']}"
        )

    def _state(self, weight: int) -> str:
        if weight >= 8:
            return "high_drift_risk"
        if weight >= 4:
            return "emerging_drift_risk"
        if weight <= 0:
            return "protective_or_stable"
        return "watch_state"

    def _interpretation(self, state: str) -> str:
        return {
            "high_drift_risk": "Repeated concerns and unresolved issues may indicate operational drift or escalating vulnerability.",
            "emerging_drift_risk": "Patterns may be emerging and should be reviewed proactively.",
            "watch_state": "Some operational concern is visible but may not yet indicate systemic drift.",
            "protective_or_stable": "Protective factors or stability signals currently outweigh concern indicators.",
        }.get(state, "Operational state unclear.")


signal_decay_and_drift_service = SignalDecayAndDriftService()
