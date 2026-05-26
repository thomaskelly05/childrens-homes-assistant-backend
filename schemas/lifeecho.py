"""LifeEcho memory layer — separate from statutory archive, review before publish."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

LifeEchoMemoryStatus = Literal["suggested", "approved", "rejected", "published"]
LifeEchoMemoryKind = Literal[
    "achievement",
    "positive_moment",
    "interest",
    "relationship",
    "milestone",
    "child_voice",
    "photo",
    "event",
    "other",
]


class LifeEchoMemory(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    child_id: int
    home_id: int | None = None
    title: str
    safe_summary: str = ""
    kind: LifeEchoMemoryKind = "positive_moment"
    status: LifeEchoMemoryStatus = "approved"
    archive_record_id: str | None = None
    photo_path: str | None = None
    event_date: str | None = None
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    approved_by_user_id: str | None = None
    approved_at: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class LifeEchoMemorySuggestion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    child_id: int
    home_id: int | None = None
    title: str
    safe_summary: str = ""
    kind: LifeEchoMemoryKind = "positive_moment"
    archive_record_id: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    status: LifeEchoMemoryStatus = "suggested"
    review_required: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


class LifeEchoUploadRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    safe_summary: str = ""
    kind: LifeEchoMemoryKind = "photo"
    photo_path: str | None = None
    event_date: str | None = None
    tags: list[str] = Field(default_factory=list)


class LifeEchoMemoryFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int
    status: LifeEchoMemoryStatus | None = None
    kind: LifeEchoMemoryKind | None = None
    include_suggestions: bool = True
    page: int = 1
    page_size: int = 50


class LifeEchoListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    memories: list[LifeEchoMemory] = Field(default_factory=list)
    suggestions: list[LifeEchoMemorySuggestion] = Field(default_factory=list)
    total: int = 0
