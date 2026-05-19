from __future__ import annotations

from typing import Any


class OrbRmReflectionService:
    """Produces reflective RM prompts from converged ORB cognition."""

    def build(self, cognition: dict[str, Any], trajectory: dict[str, Any]) -> dict[str, Any]:
        themes = list(cognition.get("themes") or [])
        prompts: list[str] = []

        prompts.append("What has changed for the child, not only what adults completed?")

        if "risk review" in themes:
            prompts.append("Do chronology, risk plans and management oversight align clearly?")

        if "relationship safety" in themes:
            prompts.append("Which relationships appear most protective for the child right now?")

        if trajectory.get("trajectory") == "increasing_operational_pressure":
            prompts.append("What support or oversight may reduce current operational pressure?")

        if cognition.get("pressure_signal_count", 0) > cognition.get("positive_signal_count", 0):
            prompts.append("Are staff responding consistently during periods of dysregulation or uncertainty?")

        prompts.append("Is the child’s voice visible across daily care, reviews and planning?")

        return {
            "rm_reflection_prompts": prompts[:6],
            "reflection_summary": "Reflective prompts generated from live operational cognition and trajectory signals.",
        }


orb_rm_reflection_service = OrbRmReflectionService()
