"""Handover workspace drafts — secure shift notes separate from formal handover_records."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

HandoverDraftStatus = Literal["draft", "ready_for_review", "completed", "archived"]
HandoverDraftScope = Literal["home", "child", "shift", "user"]

HandoverReviewStatus = Literal[
    "draft",
    "awaiting_review",
    "changes_requested",
    "approved",
    "safeguarding_review_required",
    "completed",
    "archived",
]

HandoverFormalStatus = Literal["not_attempted", "created", "not_wired", "failed"]

REVIEW_ACTIONS = Literal[
    "approve",
    "request_changes",
    "mark_safeguarding_review_required",
    "mark_reviewed",
    "complete_after_approval",
]


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
    review_status: HandoverReviewStatus = "draft"
    review_comments: str | None = None
    reviewed_by_user_id: str | None = None
    reviewed_by_name: str | None = None
    reviewed_at: str | None = None
    approved_at: str | None = None
    completed_by_user_id: str | None = None
    completed_at: str | None = None
    formal_record_created: bool = False
    formal_record_id: str | None = None
    formal_record_type: str | None = None
    formal_status: HandoverFormalStatus = "not_attempted"
    timeline_linked: bool = False
    linked_timeline_id: str | None = None
    safeguarding_review_required: bool = False
    manager_review_required: bool = False
    review_required_reason: str | None = None
    completion_warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    created_by_user_id: str | None = None
    created_by_name: str | None = None
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
    review_status: HandoverReviewStatus = "draft"
    title: str
    body: str = ""
    sections: list[dict[str, Any]] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    route: str = "/handover"
    metadata: dict[str, Any] = Field(default_factory=dict)
    formal_record_created: bool = False
    formal_record_id: str | None = None
    formal_status: HandoverFormalStatus = "not_attempted"
    timeline_linked: bool = False
    linked_timeline_id: str | None = None
    completion_warnings: list[str] = Field(default_factory=list)
    draft: HandoverDraftRecord | None = None


class HandoverReviewActionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: REVIEW_ACTIONS
    comments: str | None = None


class HandoverReviewQueueItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft_id: str
    title: str
    shift_label: str | None = None
    child_id: int | None = None
    child_name: str | None = None
    home_id: int | None = None
    review_status: HandoverReviewStatus
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    safe_summary: str
    flags: list[str] = Field(default_factory=list)
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    route: str = "/handover/reviews"
    updated_at: str | None = None


class HandoverReviewQueueResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[HandoverReviewQueueItem] = Field(default_factory=list)
    total: int = 0
    counts: dict[str, int] = Field(default_factory=dict)
    storage_mode: str = "memory"


class HandoverReviewDetail(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft: HandoverDraftRecord
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    review_prompts: list[str] = Field(default_factory=list)
    formal_target: dict[str, Any] = Field(default_factory=dict)
    timeline_status: dict[str, Any] = Field(default_factory=dict)
    linked_intelligence: list[dict[str, Any]] = Field(default_factory=list)
    safety_notice: str = (
        "Handover review supports safe shift communication. Manager judgement remains required."
    )


class HandoverReviewActionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    draft_id: str
    action: str
    review_status: HandoverReviewStatus
    status: HandoverDraftStatus
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    formal_record_created: bool = False
    formal_record_id: str | None = None
    formal_status: HandoverFormalStatus = "not_attempted"
    timeline_linked: bool = False
    linked_timeline_id: str | None = None
    completion_warnings: list[str] = Field(default_factory=list)
    draft: HandoverDraftRecord | None = None


class HandoverFormalTarget(BaseModel):
    model_config = ConfigDict(extra="ignore")

    draft_id: str
    can_create_formal_record: bool = False
    formal_status: HandoverFormalStatus = "not_wired"
    formal_record_type: str | None = None
    route_hint: str | None = None
    warnings: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
