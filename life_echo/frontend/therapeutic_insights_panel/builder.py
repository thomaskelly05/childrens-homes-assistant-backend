from __future__ import annotations

from life_echo.runtime.orchestration_runtime import LifeEchoRuntime
from life_echo.schemas import LifeEchoEvent


class LifeEchoTherapeuticInsightsPanelBuilder:
    """Builds frontend-ready therapeutic insight dashboards."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        runtime = LifeEchoRuntime.build_runtime_summary(events)

        return {
            "summary": runtime.get("therapeutic_analysis", {}),
            "risk": runtime.get("orchestration", {}).get("risk", {}),
            "wellbeing": runtime.get("orchestration", {}).get(
                "wellbeing",
                {},
            ),
            "stability": runtime.get("orchestration", {}).get(
                "stability",
                {},
            ),
            "resilience": runtime.get("resilience_growth", {}),
            "escalation_prediction": runtime.get(
                "escalation_prediction",
                {},
            ),
        }
