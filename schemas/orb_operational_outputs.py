"""OS-linked operational ORB outputs — briefings, reviews and action plans."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

OrbOperationalOutputType = Literal[
    "manager_briefing",
    "safeguarding_theme_review",
    "record_quality_review",
    "ofsted_evidence_briefing",
    "action_priority_plan",
    "staff_support_briefing",
    "child_journey_summary",
    "governance_briefing",
    "handover_intelligence",
    "inspection_preparation",
    "operational_note",
]

OrbOperationalOutputStatus = Literal["draft", "saved", "archived"]

OrbOperationalOutputReviewStatus = Literal[
    "not_required",
    "review_required",
    "awaiting_review",
    "reviewed",
    "escalated",
    "dismissed",
]

OrbOperationalOutputVisibility = Literal[
    "operational_private",
    "home_leadership",
    "provider_leadership",
    "manager_review",
]

OrbOperationalOutputCreatedFrom = Literal[
    "operational_orb",
    "manager_daily_brief",
    "record_quality",
    "safeguarding_themes",
    "ofsted_evidence",
    "actions",
    "manual",
]

OrbOperationalOutputExportFormat = Literal["markdown", "plain_text", "json", "html"]


class OrbOperationalOutputSaveOptions(BaseModel):
    """Optional save flags on operational ORB requests."""

    model_config = ConfigDict(extra="ignore")

    save_output: bool = False
    output_type: OrbOperationalOutputType | None = None
    visibility: OrbOperationalOutputVisibility = "operational_private"
    tags: list[str] = Field(default_factory=list)
    title: str | None = Field(default=None, max_length=500)
    status: OrbOperationalOutputStatus = "saved"


class OrbOperationalOutputCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    type: OrbOperationalOutputType = "operational_note"
    status: OrbOperationalOutputStatus = "saved"
    review_status: OrbOperationalOutputReviewStatus = "not_required"
    visibility: OrbOperationalOutputVisibility = "operational_private"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    provider_id: int | None = None
    scope_label: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=8000)
    content_markdown: str | None = Field(default=None, max_length=500_000)
    content_json: dict[str, Any] = Field(default_factory=dict)
    intelligence_output: dict[str, Any] = Field(default_factory=dict)
    context_cards: list[dict[str, Any]] = Field(default_factory=list)
    evidence_items: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    draft_actions: list[dict[str, Any]] = Field(default_factory=list)
    review_prompts: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    evaluation: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] = Field(default_factory=dict)
    retrieval_context: dict[str, Any] = Field(default_factory=dict)
    audit_reference: str | None = Field(default=None, max_length=120)
    linked_action_ids: list[str] = Field(default_factory=list)
    linked_review_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    priority: str | None = Field(default=None, max_length=40)
    created_from: OrbOperationalOutputCreatedFrom = "operational_orb"
    care_record_access: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbOperationalOutputUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, max_length=500)
    type: OrbOperationalOutputType | None = None
    status: OrbOperationalOutputStatus | None = None
    review_status: OrbOperationalOutputReviewStatus | None = None
    visibility: OrbOperationalOutputVisibility | None = None
    tags: list[str] | None = None
    summary: str | None = Field(default=None, max_length=8000)
    content_markdown: str | None = Field(default=None, max_length=500_000)
    content_json: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None
    linked_action_ids: list[str] | None = None


class OrbOperationalOutputRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    type: OrbOperationalOutputType
    status: OrbOperationalOutputStatus = "saved"
    review_status: OrbOperationalOutputReviewStatus = "not_required"
    visibility: OrbOperationalOutputVisibility = "operational_private"
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    provider_id: int | None = None
    created_by_user_id: str | None = None
    created_by_name: str | None = None
    created_by_role: str | None = None
    scope_label: str | None = None
    summary: str | None = None
    content_markdown: str | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    intelligence_output: dict[str, Any] = Field(default_factory=dict)
    context_cards: list[dict[str, Any]] = Field(default_factory=list)
    evidence_items: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    draft_actions: list[dict[str, Any]] = Field(default_factory=list)
    review_prompts: list[dict[str, Any]] = Field(default_factory=list)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    evaluation: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] = Field(default_factory=dict)
    retrieval_context: dict[str, Any] = Field(default_factory=dict)
    audit_reference: str | None = None
    linked_action_ids: list[str] = Field(default_factory=list)
    linked_review_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    priority: str | None = None
    created_from: OrbOperationalOutputCreatedFrom = "operational_orb"
    standalone_only: bool = False
    os_linked: bool = True
    permissioned_context: bool = True
    care_record_access: bool = False
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    archived_at: str | None = None
    reviewed_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbOperationalOutputListRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    output_type: OrbOperationalOutputType | None = None
    status: OrbOperationalOutputStatus | None = None
    review_status: OrbOperationalOutputReviewStatus | None = None
    visibility: OrbOperationalOutputVisibility | None = None
    home_id: int | None = None
    child_id: int | None = None
    staff_id: int | None = None
    tag: str | None = None
    search: str | None = Field(default=None, max_length=500)
    include_archived: bool = False
    awaiting_review_only: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class OrbOperationalOutputSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: OrbOperationalOutputType
    status: OrbOperationalOutputStatus
    review_status: OrbOperationalOutputReviewStatus
    visibility: OrbOperationalOutputVisibility
    home_id: int | None = None
    child_id: int | None = None
    scope_label: str | None = None
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    linked_action_count: int = 0
    created_by_name: str | None = None
    created_at: str
    updated_at: str


class OrbOperationalOutputListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OrbOperationalOutputSummary] = Field(default_factory=list)
    total: int = 0
    limit: int = 50
    offset: int = 0


class OrbOperationalOutputExportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    format: OrbOperationalOutputExportFormat = "markdown"


class OrbOperationalOutputExportResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    output_id: str
    format: OrbOperationalOutputExportFormat
    content: str
    filename: str
    os_linked_notice: str


class OrbOperationalOutputReviewRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    visibility: OrbOperationalOutputVisibility = "manager_review"
    review_note: str | None = Field(default=None, max_length=4000)
    escalate: bool = False


class OrbOperationalOutputActionLinkRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action_ids: list[str] = Field(default_factory=list)


class OrbOperationalOutputHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    storage_mode: str = "memory"
    output_count: int = 0
    os_linked: bool = True
    standalone_only: bool = False
    permissioned_context: bool = True


class OrbOperationalOutputSaveContext(BaseModel):
    """Envelope returned when saving from operational ORB."""

    model_config = ConfigDict(extra="ignore")

    available: bool = True
    saved: bool = False
    output_id: str | None = None
    type: OrbOperationalOutputType | None = None
    review_status: OrbOperationalOutputReviewStatus | None = None
    visibility: OrbOperationalOutputVisibility | None = None


class OrbOperationalOutputSaveHints(BaseModel):
    model_config = ConfigDict(extra="ignore")

    save_available: bool = False
    suggested_output_type: OrbOperationalOutputType = "operational_note"
    suggested_title: str = "Operational output"
    suggested_tags: list[str] = Field(default_factory=list)
