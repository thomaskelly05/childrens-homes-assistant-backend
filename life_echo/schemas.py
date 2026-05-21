from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class LifeEchoSource(str, Enum):
    indicare = "indicare"
    external_api = "external_api"
    manual = "manual"
    import_file = "import_file"
    webhook = "webhook"


class EmotionalTone(str, Enum):
    calm = "calm"
    anxious = "anxious"
    sad = "sad"
    angry = "angry"
    joyful = "joyful"
    proud = "proud"
    withdrawn = "withdrawn"
    dysregulated = "dysregulated"
    settled = "settled"
    unknown = "unknown"


class LifeEchoEventType(str, Enum):
    achievement = "achievement"
    daily_life = "daily_life"
    education = "education"
    family_time = "family_time"
    health = "health"
    incident = "incident"
    key_work = "key_work"
    memory = "memory"
    missing_episode = "missing_episode"
    relationship = "relationship"
    safeguarding = "safeguarding"
    sleep = "sleep"
    therapy = "therapy"
    transition = "transition"
    wellbeing = "wellbeing"
    voice_reflection = "voice_reflection"
    other = "other"


class LifeEchoVisibility(str, Enum):
    internal = "internal"
    therapeutic = "therapeutic"
    child_memory = "child_memory"
    restricted = "restricted"


class LifeEchoEventCreate(BaseModel):
    child_id: str = Field(..., description="Local child/person identifier from the source system.")
    source: LifeEchoSource = LifeEchoSource.indicare
    source_system: str = Field(default="indicare", description="System that produced the event, e.g. indicare, clearcare, mosaic.")
    source_record_id: str | None = Field(default=None, description="Original record id in the source system.")
    event_type: LifeEchoEventType = LifeEchoEventType.other
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    title: str = Field(..., min_length=1, max_length=180)
    narrative: str = Field(..., min_length=1)
    emotional_tone: EmotionalTone = EmotionalTone.unknown
    intensity: int | None = Field(default=None, ge=1, le=10, description="Optional emotional intensity from 1 to 10.")
    triggers: list[str] = Field(default_factory=list)
    protective_factors: list[str] = Field(default_factory=list)
    staff_ids: list[str] = Field(default_factory=list)
    relationship_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    visibility: LifeEchoVisibility = LifeEchoVisibility.therapeutic
    child_voice: str | None = Field(default=None, description="Optional child-friendly voice or direct wishes/feelings.")
    metadata: dict[str, Any] = Field(default_factory=dict)


class LifeEchoEvent(LifeEchoEventCreate):
    id: str = Field(default_factory=lambda: f"le_evt_{uuid4().hex}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LifeEchoInsight(BaseModel):
    child_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    summary: str
    patterns: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    needs: list[str] = Field(default_factory=list)
    suggested_reflections: list[str] = Field(default_factory=list)


class LifeEchoTimelineResponse(BaseModel):
    child_id: str
    count: int
    events: list[LifeEchoEvent]


class LifeEchoPluginManifest(BaseModel):
    name: str = "LifeEcho"
    version: str = "0.1.0"
    description: str = "Emotional continuity and therapeutic memory layer for care systems."
    api_base_path: str = "/api/life-echo"
    supported_ingest_modes: list[str] = Field(default_factory=lambda: ["api", "webhook", "adapter", "manual"])
    supported_sources: list[str] = Field(default_factory=lambda: ["indicare", "external_api", "manual", "import_file", "webhook"])
