from __future__ import annotations

from life_echo.child_memory import LifeEchoChildMemoryBuilder
from life_echo.intelligence.pattern_engine import LifeEchoPatternEngine
from life_echo.intelligence.reflection_engine import LifeEchoReflectionEngine
from life_echo.intelligence.relationship_engine import (
    LifeEchoRelationshipEngine,
)
from life_echo.intelligence.risk_signals import LifeEchoRiskSignals
from life_echo.intelligence.stability_engine import LifeEchoStabilityEngine
from life_echo.intelligence.wellbeing_engine import LifeEchoWellbeingEngine
from life_echo.schemas import LifeEchoEvent


class LifeEchoOrchestrator:
    """Combines all LifeEcho intelligence engines into one unified view."""

    @staticmethod
    def build_summary(events: list[LifeEchoEvent]) -> dict:
        patterns = LifeEchoPatternEngine.detect_patterns(events)
        reflections = LifeEchoReflectionEngine.build_reflections(events)
        relationships = LifeEchoRelationshipEngine.analyse_relationships(events)
        wellbeing = LifeEchoWellbeingEngine.calculate(events)
        risk = LifeEchoRiskSignals.analyse(events)
        stability = LifeEchoStabilityEngine.analyse(events)
        memories = LifeEchoChildMemoryBuilder.build(events)

        return {
            "patterns": patterns,
            "reflections": reflections,
            "relationships": relationships,
            "wellbeing": wellbeing,
            "risk": risk,
            "stability": stability,
            "child_memory_timeline": memories,
            "event_count": len(events),
            "summary": {
                "wellbeing_trajectory": wellbeing.get("trajectory"),
                "risk_level": risk.get("risk_level"),
                "stability": stability.get("stability"),
            },
        }
