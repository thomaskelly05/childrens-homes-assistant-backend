from __future__ import annotations

from typing import Any


class OrbTherapeuticReasoningService:
    """Adds non-clinical, trauma-informed interpretation without diagnosing."""

    def build(self, *, context: dict[str, Any], care_journey: dict[str, Any]) -> dict[str, Any]:
        themes = care_journey.get("emotional_themes") or []
        observations: list[str] = []
        if any("communication" in theme for theme in themes):
            observations.append("communication and sensory evidence should be translated into predictable daily routines")
        if any("relationships" in theme for theme in themes):
            observations.append("relationship evidence should include repair, trust-building and consistency after difficult moments")
        if any("identity" in theme for theme in themes):
            observations.append("identity and belonging work should remain led by the child's wishes and feelings")
        if care_journey.get("review_areas"):
            observations.append("concerns should be described calmly as support needs and review points, not as blame")
        if not observations:
            observations.append("the returned records need more lived-experience detail before emotional progress can be described confidently")

        return {
            "therapeutic_observations": observations[:4],
            "language_guardrails": [
                "use factual, non-diagnostic language",
                "separate recorded evidence from professional interpretation",
                "keep the child's experience central",
            ],
            "reflective_prompt": "What does the chronology show about how the child experiences routines, relationships, safety and belonging day to day?",
        }
