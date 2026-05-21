from __future__ import annotations

from fastapi import APIRouter

from life_echo.frontend.child_memory_mode.builder import LifeEchoChildMemoryModeBuilder
from life_echo.frontend.emotional_timeline.builder import LifeEchoTimelineBuilder
from life_echo.frontend.relationship_map.builder import LifeEchoRelationshipMapBuilder
from life_echo.frontend.therapeutic_insights_panel.builder import (
    LifeEchoTherapeuticInsightsPanelBuilder,
)
from life_echo.frontend.trigger_heatmap.builder import LifeEchoTriggerHeatmapBuilder
from life_echo.frontend.wellbeing_trajectory.builder import (
    LifeEchoWellbeingTrajectoryBuilder,
)
from life_echo.playback.emotional_playback_engine import LifeEchoEmotionalPlaybackEngine
from life_echo.playback.memory_sequence_builder import LifeEchoMemorySequenceBuilder
from life_echo.services import life_echo_service

router = APIRouter(prefix="/api/life-echo/experience", tags=["LifeEcho Experience"])


@router.get("/{child_id}")
def get_life_echo_experience(child_id: str):
    events = life_echo_service.get_timeline(child_id)

    return {
        "child_id": child_id,
        "timeline": LifeEchoTimelineBuilder.build(child_id, events),
        "wellbeing_trajectory": LifeEchoWellbeingTrajectoryBuilder.build(events),
        "therapeutic_insights": LifeEchoTherapeuticInsightsPanelBuilder.build(events),
        "relationship_map": LifeEchoRelationshipMapBuilder.build(events),
        "trigger_heatmap": LifeEchoTriggerHeatmapBuilder.build(events),
        "child_memory_mode": LifeEchoChildMemoryModeBuilder.build(events),
        "playback": LifeEchoEmotionalPlaybackEngine.build(events),
        "memory_chapters": LifeEchoMemorySequenceBuilder.build(events),
    }


@router.get("/{child_id}/memory-box")
def get_virtual_memory_box(child_id: str):
    events = life_echo_service.get_timeline(child_id)

    return {
        "child_id": child_id,
        "title": "LifeEcho Virtual Memory Box",
        "child_memory_mode": LifeEchoChildMemoryModeBuilder.build(events),
        "playback": LifeEchoEmotionalPlaybackEngine.build(events),
        "memory_chapters": LifeEchoMemorySequenceBuilder.build(events),
        "wellbeing_trajectory": LifeEchoWellbeingTrajectoryBuilder.build(events),
        "message": "A safe emotional memory space built from positive moments, growth, voice and relationship continuity.",
    }
