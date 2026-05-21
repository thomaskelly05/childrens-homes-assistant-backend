from __future__ import annotations

from life_echo.ai.chronology_summary_engine import (
    LifeEchoChronologySummaryEngine,
)
from life_echo.ai.escalation_prediction_engine import (
    LifeEchoEscalationPredictionEngine,
)
from life_echo.ai.resilience_growth_engine import (
    LifeEchoResilienceGrowthEngine,
)
from life_echo.ai.therapeutic_analysis_engine import (
    LifeEchoTherapeuticAnalysisEngine,
)
from life_echo.ai.transition_risk_engine import (
    LifeEchoTransitionRiskEngine,
)
from life_echo.intelligence.orchestrator import LifeEchoOrchestrator
from life_echo.schemas import LifeEchoEvent


class LifeEchoRuntime:
    """Unified runtime orchestration layer for LifeEcho intelligence."""

    @staticmethod
    def build_runtime_summary(events: list[LifeEchoEvent]) -> dict:
        return {
            "orchestration": LifeEchoOrchestrator.build_summary(events),
            "therapeutic_analysis": (
                LifeEchoTherapeuticAnalysisEngine.analyse(events)
            ),
            "chronology_summary": (
                LifeEchoChronologySummaryEngine.summarise(events)
            ),
            "resilience_growth": (
                LifeEchoResilienceGrowthEngine.analyse(events)
            ),
            "transition_risk": (
                LifeEchoTransitionRiskEngine.analyse(events)
            ),
            "escalation_prediction": (
                LifeEchoEscalationPredictionEngine.predict(events)
            ),
        }
