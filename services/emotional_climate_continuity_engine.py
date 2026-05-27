from __future__ import annotations

from collections import Counter
from typing import Any


class EmotionalClimateContinuityEngine:
    """Models emotional climate continuity across residential environments.

    Tracks relational warmth, emotional fatigue, repair and containment themes.
    This is reflective operational intelligence, not behavioural surveillance.
    """

    WARM_TERMS = {
        "calm",
        "repair",
        "regulated",
        "supported",
        "safe",
        "warm",
        "listened",
        "reassured",
    }

    STRAIN_TERMS = {
        "burnout",
        "overwhelmed",
        "angry",
        "shouting",
        "unsafe",
        "distressed",
        "tired",
        "argument",
        "restraint",
    }

    def analyse(self, *, narratives: list[str] | None = None) -> dict[str, Any]:
        narratives = narratives or []
        warm_hits = Counter()
        strain_hits = Counter()

        for narrative in narratives:
            lower = str(narrative or "").lower()
            for term in self.WARM_TERMS:
                if term in lower:
                    warm_hits[term] += 1
            for term in self.STRAIN_TERMS:
                if term in lower:
                    strain_hits[term] += 1

        warm_total = sum(warm_hits.values())
        strain_total = sum(strain_hits.values())

        if warm_total > strain_total * 1.5:
            climate = "stable_supportive"
        elif strain_total > warm_total * 1.5:
            climate = "strained_under_pressure"
        else:
            climate = "mixed_regulation_state"

        return {
            "climate": climate,
            "warmth_indicators": dict(warm_hits),
            "strain_indicators": dict(strain_hits),
            "guidance": self._guidance(climate=climate),
            "reflective_prompts": self._prompts(climate=climate),
            "institutional_meaning": self._meaning(climate=climate),
        }

    def prompt_addendum(self, *, narratives: list[str] | None = None) -> str:
        result = self.analyse(narratives=narratives)
        lines = [
            "Emotional climate continuity:",
            f"- Climate: {result['climate']}",
        ]
        if result["strain_indicators"]:
            lines.append("- Strain indicators present")
        if result["warmth_indicators"]:
            lines.append("- Warmth indicators present")
        return "\n".join(lines)

    def _guidance(self, *, climate: str) -> list[str]:
        if climate == "strained_under_pressure":
            return [
                "Pause and consider adult emotional capacity and containment.",
                "Review whether staff need support, reflection or supervision.",
                "Look for signs of relational drift or emotional fatigue.",
            ]
        if climate == "stable_supportive":
            return [
                "Protect and reinforce emotionally safe relational practice.",
                "Notice what is helping the environment remain stable.",
            ]
        return [
            "Emotional signals appear mixed; continue reflective oversight.",
        ]

    def _prompts(self, *, climate: str) -> list[str]:
        prompts = [
            "How emotionally safe does the environment currently feel?",
            "What support may adults or children need right now?",
        ]
        if climate == "strained_under_pressure":
            prompts.extend([
                "Has emotional fatigue started affecting practice or containment?",
                "Where may repair or regulation now be needed?",
            ])
        return prompts

    def _meaning(self, *, climate: str) -> str:
        if climate == "strained_under_pressure":
            return "Relational pressure may be increasing across the environment."
        if climate == "stable_supportive":
            return "Relational warmth and emotional containment appear more visible."
        return "Emotional climate appears mixed or transitional."


emotional_climate_continuity_engine = EmotionalClimateContinuityEngine()
