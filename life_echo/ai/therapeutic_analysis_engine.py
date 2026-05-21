from __future__ import annotations

from life_echo.intelligence.orchestrator import LifeEchoOrchestrator
from life_echo.schemas import LifeEchoEvent


class LifeEchoTherapeuticAnalysisEngine:
    """Produces high-level therapeutic summaries from emotional continuity data."""

    @staticmethod
    def analyse(events: list[LifeEchoEvent]) -> dict:
        orchestration = LifeEchoOrchestrator.build_summary(events)

        wellbeing = orchestration.get("wellbeing", {})
        risk = orchestration.get("risk", {})
        stability = orchestration.get("stability", {})

        narrative = []

        trajectory = wellbeing.get("trajectory", "unknown")
        risk_level = risk.get("risk_level", "unknown")
        stability_level = stability.get("stability", "unknown")

        narrative.append(
            f"Wellbeing trajectory currently appears {trajectory}."
        )
        narrative.append(
            f"Current emotional safeguarding profile is assessed as {risk_level}."
        )
        narrative.append(
            f"Placement continuity indicators currently appear {stability_level}."
        )

        if risk_level == "high":
            narrative.append(
                "Increased therapeutic reflection and multi-agency oversight may be required."
            )

        if trajectory == "improving":
            narrative.append(
                "Recent emotional continuity suggests strengthening regulation or safety."
            )

        return {
            "analysis": narrative,
            "orchestration": orchestration,
        }
