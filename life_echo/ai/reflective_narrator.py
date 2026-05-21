from __future__ import annotations


class LifeEchoReflectiveNarrator:
    """Builds emotionally reflective narrative summaries for playback journeys."""

    @staticmethod
    def build(*, child_name: str, memories: list[dict]) -> dict:
        emotional_themes = sorted(
            {
                memory.get("emotional_tone", "reflective")
                for memory in memories
            }
        )

        return {
            "child_name": child_name,
            "memory_count": len(memories),
            "themes": emotional_themes,
            "narrative": (
                f"{child_name} has experienced moments of growth, reflection "
                f"and emotional development across {len(memories)} preserved memories."
            ),
        }
