"""Child-centred chronology story built from signed-off archive — safe summaries only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ChronologyStorySectionKind = Literal["month", "theme", "summary"]


class ChronologyStoryEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    event_date: str | None = None
    title: str
    safe_summary: str = ""
    record_type: str = "recording"
    author_name: str | None = None
    signed_off_by_name: str | None = None
    source_route: str | None = None
    archive_record_id: str | None = None
    plan_impacts: list[str] = Field(default_factory=list)
    lifeecho_suggestion: str | None = None
    tags: list[str] = Field(default_factory=list)
    safeguarding_sensitive: bool = False


class ChronologyStoryFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int
    date_from: str | None = None
    date_to: str | None = None
    record_type: str | None = None
    author_user_id: str | None = None
    plan_impact: bool | None = None
    safeguarding_sensitive: bool | None = None
    lifeecho_memories: bool | None = None
    search: str | None = None


class ChronologyStorySection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    kind: ChronologyStorySectionKind
    label: str
    events: list[ChronologyStoryEvent] = Field(default_factory=list)
    summary: str | None = None


class ChronologyStoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int
    sections: list[ChronologyStorySection] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    safe_story_summary: str = ""
    total_events: int = 0
