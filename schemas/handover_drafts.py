"""Handover workspace drafts — secure shift notes separate from formal handover_records."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

HandoverDraftStatus = Literal["draft", "ready_for_review", "completed", "archived"]
HandoverDraftScope = Literal["home", "child", "shift", "user"]


class HandoverDraftSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    body: str = ""
    prompts: list[str] = Field(default_factory=list)
    intelligence_item_ids: list[str] = Field(default_factory=list)


class HandoverDraftRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = "Shift handover"
    scope: HandoverDraftScope = "home"
    shift_label: str | None = None
    child_id: int | None = None
    home_id: int | None = None
    body: str = ""
    sections: list[HandoverDraftSection | dict[str, Any]] = Field(default_factory=list)
    source_context: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class HandoverDraftUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    shift_label: str | None = None
    body: str | None = None
    sections: list[HandoverDraftSection | dict[str, Any]] | None = None
    source_context: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class HandoverDraftRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    scope: HandoverDraftScope = "home"
    shift_label: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    body: str = ""
    sections: list[dict[str, Any]] = Field(default_factory=list)
    source_context: dict[str, Any] = Field(default_factory=dict)
    status: HandoverDraftStatus = "draft"
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    reviewed_by_user_id: str | None = None
    reviewed_at: str | None = None
    completed_by_user_id: str | None = None
    completed_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    warnings: list[str] = Field(default_factory=list)


class HandoverDraftListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[HandoverDraftRecord] = Field(default_factory=list)
    total: int = 0
    storage_mode: str = "memory"


class HandoverDraftResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    draft_id: str
    status: HandoverDraftStatus
    title: str
    body: str = ""
    sections: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    route: str = "/handover"
    metadata: dict[str, Any] = Field(default_factory=dict)
    draft: HandoverDraftRecord | None = None
