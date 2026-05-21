from __future__ import annotations

from life_echo.frontend.child_memory_mode.builder import (
    LifeEchoChildMemoryModeBuilder,
)
from life_echo.frontend.emotional_ui.theme_engine import LifeEchoThemeEngine
from life_echo.playback.emotional_playback_engine import (
    LifeEchoEmotionalPlaybackEngine,
)
from life_echo.schemas import LifeEchoEvent


class LifeEchoMemoryBoxExperienceBuilder:
    """Builds the immersive emotional memory box experience payload."""

    @staticmethod
    def build(child_id: str, events: list[LifeEchoEvent]) -> dict:
        playback = LifeEchoEmotionalPlaybackEngine.build(events)
        memories = LifeEchoChildMemoryModeBuilder.build(events)

        dominant_tone = (
            events[-1].emotional_tone.value
            if events
            else "calm"
        )

        theme = LifeEchoThemeEngine.resolve(dominant_tone)

        return {
            "child_id": child_id,
            "experience_type": "virtual_memory_box",
            "theme": theme,
            "playback": playback,
            "memories": memories,
            "welcome_message": (
                "Welcome to your LifeEcho memory space. "
                "A safe place for memories, growth, relationships and important moments."
            ),
        }
