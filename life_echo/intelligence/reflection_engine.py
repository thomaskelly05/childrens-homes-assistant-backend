from __future__ import annotations

from life_echo.schemas import LifeEchoEvent


class LifeEchoReflectionEngine:
    """Generates therapeutic reflection prompts for staff teams."""

    @staticmethod
    def build_reflections(events: list[LifeEchoEvent]) -> list[str]:
        if not events:
            return [
                "What positive memories or emotional moments could be captured today?"
            ]

        reflections: list[str] = [
            "What may the child be communicating emotionally through recent behaviours?",
            "Have positive achievements been recognised alongside incidents?",
            "Which adults appear to increase feelings of safety or regulation?",
            "Are there environmental or sensory triggers emerging over time?",
        ]

        latest = events[-1]

        if latest.child_voice:
            reflections.append(
                "How has the child’s own voice and wishes been incorporated into planning?"
            )

        if latest.triggers:
            reflections.append(
                f"Recent triggers identified: {', '.join(latest.triggers)}."
            )

        if latest.protective_factors:
            reflections.append(
                "How can identified protective factors be strengthened further?"
            )

        return reflections
