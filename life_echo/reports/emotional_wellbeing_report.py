from __future__ import annotations

from life_echo.ai.therapeutic_analysis_engine import (
    LifeEchoTherapeuticAnalysisEngine,
)
from life_echo.intelligence.wellbeing_engine import LifeEchoWellbeingEngine
from life_echo.schemas import LifeEchoEvent


class LifeEchoEmotionalWellbeingReport:
    """Builds emotional wellbeing and therapeutic overview reports."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        wellbeing = LifeEchoWellbeingEngine.calculate(events)
        therapeutic = LifeEchoTherapeuticAnalysisEngine.analyse(events)

        return {
            "report_type": "emotional_wellbeing",
            "wellbeing": wellbeing,
            "therapeutic_analysis": therapeutic,
            "event_count": len(events),
        }
