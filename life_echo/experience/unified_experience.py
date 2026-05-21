from __future__ import annotations

from life_echo.analytics.emotional_metrics import LifeEchoEmotionalMetrics
from life_echo.frontend.child_memory_mode.builder import LifeEchoChildMemoryModeBuilder
from life_echo.frontend.emotional_timeline.builder import LifeEchoTimelineBuilder
from life_echo.frontend.memory_box.experience_builder import LifeEchoMemoryBoxExperienceBuilder
from life_echo.frontend.relationship_map.builder import LifeEchoRelationshipMapBuilder
from life_echo.frontend.therapeutic_insights_panel.builder import LifeEchoTherapeuticInsightsPanelBuilder
from life_echo.frontend.trigger_heatmap.builder import LifeEchoTriggerHeatmapBuilder
from life_echo.frontend.wellbeing_trajectory.builder import LifeEchoWellbeingTrajectoryBuilder
from life_echo.mobile.memory_feed import LifeEchoMobileMemoryFeed
from life_echo.playback.emotional_playback_engine import LifeEchoEmotionalPlaybackEngine
from life_echo.playback.memory_sequence_builder import LifeEchoMemorySequenceBuilder
from life_echo.runtime.orchestration_runtime import LifeEchoRuntime
from life_echo.schemas import LifeEchoEvent


class LifeEchoUnifiedExperience:
    """Product-level LifeEcho experience composer.

    This brings together the emotional intelligence runtime, memory box,
    child-safe memories, visualisation payloads and mobile-friendly experience
    into one stable structure for frontend and partner integrations.
    """

    @staticmethod
    def build(child_id: str, events: list[LifeEchoEvent]) -> dict:
        return {
            "product": "LifeEcho",
            "child_id": child_id,
            "experience": LifeEchoMemoryBoxExperienceBuilder.build(child_id, events),
            "runtime": LifeEchoRuntime.build_runtime_summary(events),
            "timeline": LifeEchoTimelineBuilder.build(child_id, events),
            "playback": LifeEchoEmotionalPlaybackEngine.build(events),
            "memory_chapters": LifeEchoMemorySequenceBuilder.build(events),
            "child_memory_mode": LifeEchoChildMemoryModeBuilder.build(events),
            "mobile_memory_feed": LifeEchoMobileMemoryFeed.build(events),
            "therapeutic_insights": LifeEchoTherapeuticInsightsPanelBuilder.build(events),
            "wellbeing_trajectory": LifeEchoWellbeingTrajectoryBuilder.build(events),
            "relationship_map": LifeEchoRelationshipMapBuilder.build(events),
            "trigger_heatmap": LifeEchoTriggerHeatmapBuilder.build(events),
            "analytics": LifeEchoEmotionalMetrics.calculate(events),
            "message": (
                "LifeEcho brings emotional continuity, child-safe memories, "
                "therapeutic insight and virtual memory box experiences into one place."
            ),
        }
