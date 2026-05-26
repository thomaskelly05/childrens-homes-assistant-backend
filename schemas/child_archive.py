"""Child formal archive — signed-off records with safe summaries only."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

ArchiveRecordStatus = Literal[
    "draft",
    "awaiting_review",
    "signed_off",
    "archived",
    "superseded",
    "restricted",
]

ArchiveRecordType = Literal[
    "recording",
    "document",
    "chronology",
    "plan",
    "review",
    "lifeecho",
    "inspection",
    "action",
    "safeguarding",
    "health",
    "education",
    "family_time",
    "missing",
    "incident",
    "other",
]


class ChildArchiveRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    child_id: int
    home_id: int | None = None
    title: str
    safe_summary: str = ""
    record_type: ArchiveRecordType = "recording"
    source_type: str
    source_id: str | None = None
    source_route: str | None = None
    event_date: str | None = None
    recorded_at: str | None = None
    signed_off_at: str | None = None
    signed_off_by_user_id: str | None = None
    signed_off_by_name: str | None = None
    author_user_id: str | None = None
    author_name: str | None = None
    author_role: str | None = None
    manager_review_required: bool = False
    safeguarding_sensitive: bool = False
    privacy_sensitive: bool = False
    chronology_event_id: str | None = None
    lifeecho_memory_id: str | None = None
    plan_impact_ids: list[str] = Field(default_factory=list)
    action_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    status: ArchiveRecordStatus = "signed_off"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChildArchiveFilter(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_id: int | None = None
    home_id: int | None = None
    record_type: ArchiveRecordType | None = None
    source_type: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    author_user_id: str | None = None
    signed_off_by_user_id: str | None = None
    tags: list[str] | None = None
    search: str | None = None
    page: int = 1
    page_size: int = 50


class ChildArchiveListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    records: list[ChildArchiveRecord] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 50


class ChildArchiveHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "child_archive_service"
    storage_mode: str = "memory"
    record_count: int = 0
    persistence_available: bool = False
