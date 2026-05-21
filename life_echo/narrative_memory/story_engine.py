from __future__ import annotations

from life_echo.emotional_atmosphere.atmosphere_engine import (
    LifeEchoAtmosphereEngine,
)
from life_echo.schemas import LifeEchoEvent


class LifeEchoNarrativeStoryEngine:
    """Builds reflective emotional narratives from LifeEcho journeys."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        atmosphere = LifeEchoAtmosphereEngine.build(events)

        description = atmosphere.get("description", "")
        themes = atmosphere.get("themes", [])
        protective = atmosphere.get("protective_factors", [])

        narrative = [
            "LifeEcho identified a developing emotional journey across recorded memories.",
            description,
        ]

        if themes:
            narrative.append(
                f"Recurring themes included: {', '.join(themes[:3])}."
            )

        if protective:
            narrative.append(
                f"Protective experiences appeared connected to: {', '.join(protective[:3])}."
            )

        narrative.append(
            "The journey reflects moments of challenge, growth, connection and emotional continuity."
        )

        return {
            "title": "LifeEcho Reflective Narrative",
            "narrative": narrative,
            "atmosphere": atmosphere,
        }
