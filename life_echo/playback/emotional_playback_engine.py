from __future__ import annotations

from life_echo.schemas import LifeEchoEvent


class LifeEchoEmotionalPlaybackEngine:
    """Builds immersive emotional playback journeys from timeline events."""

    @staticmethod
    def build(events: list[LifeEchoEvent]) -> dict:
        ordered = sorted(events, key=lambda event: event.occurred_at)

        scenes = []

        for event in ordered:
            scenes.append(
                {
                    "scene_id": event.id,
                    "title": event.title,
                    "timestamp": event.occurred_at.isoformat(),
                    "emotional_tone": event.emotional_tone.value,
                    "narrative": event.narrative,
                    "transition": "fade",
                    "ambient_style": (
                        "warm"
                        if event.emotional_tone.value
                        in {"calm", "settled", "joyful", "proud"}
                        else "reflective"
                    ),
                }
            )

        return {
            "mode": "emotional_playback",
            "scene_count": len(scenes),
            "scenes": scenes,
        }
