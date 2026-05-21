from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class TimelineNode:
    id: str
    title: str
    timestamp: str
    emotional_tone: str
    event_type: str
    description: str
    tags: list[str] = field(default_factory=list)


@dataclass
class EmotionalTimelineView:
    child_id: str
    nodes: list[TimelineNode]
    wellbeing_trajectory: str
    dominant_emotion: str
