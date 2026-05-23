"""Standalone ORB saved intelligence outputs — project artefacts, no OS records."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

OrbSavedOutputType = Literal[
    "action_plan",
    "document_review",
    "manager_briefing",
    "staff_briefing",
    "deep_research",
    "policy_comparison",
    "ofsted_evidence_map",
    "recording_rewrite",
    "safeguarding_reflection",
    "therapeutic_practice",
    "general_research",
    "checklist",
    "supervision_guide",
    "intelligence_note",
]

OrbSavedOutputStatus = Literal["draft", "saved", "archived", "pinned"]

OrbSavedOutputVisibility = Literal["standalone_private", "standalone_project"]

OrbSavedOutputCreatedFrom = Literal[
    "chat",
    "document_analysis",
    "agent",
    "deep_research",
    "manual",
]

OrbSavedOutputExportFormat = Literal["markdown", "plain_text", "json", "html"]


class OrbSavedOutputSaveOptions(BaseModel):
    """Optional save flags on intelligence-producing requests."""

    model_config = ConfigDict(extra="ignore")

    save_output: bool = False
    project_id: str | None = Field(default=None, max_length=120)
    project_name: str | None = Field(default=None, max_length=500)
    profile_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    title: str | None = Field(default=None, max_length=500)
    output_type: OrbSavedOutputType | None = None
    status: OrbSavedOutputStatus = "saved"


class OrbSavedOutputCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    type: OrbSavedOutputType = "general_research"
    status: OrbSavedOutputStatus = "saved"
    visibility: OrbSavedOutputVisibility = "standalone_project"
    project_id: str | None = Field(default=None, max_length=120)
    project_name: str | None = Field(default=None, max_length=500)
    profile_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    summary: str | None = Field(default=None, max_length=8000)
    content_markdown: str | None = Field(default=None, max_length=500_000)
    content_json: dict[str, Any] = Field(default_factory=dict)
    intelligence_output: dict[str, Any] = Field(default_factory=dict)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    quality: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] = Field(default_factory=dict)
    retrieval_context: dict[str, Any] = Field(default_factory=dict)
    created_from: OrbSavedOutputCreatedFrom = "manual"
    created_from_id: str | None = Field(default=None, max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbSavedOutputUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, max_length=500)
    type: OrbSavedOutputType | None = None
    status: OrbSavedOutputStatus | None = None
    visibility: OrbSavedOutputVisibility | None = None
    project_id: str | None = Field(default=None, max_length=120)
    project_name: str | None = Field(default=None, max_length=500)
    profile_ids: list[str] | None = None
    tags: list[str] | None = None
    summary: str | None = Field(default=None, max_length=8000)
    content_markdown: str | None = Field(default=None, max_length=500_000)
    content_json: dict[str, Any] | None = None
    metadata: dict[str, Any] | None = None


class OrbSavedOutputRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    type: OrbSavedOutputType
    status: OrbSavedOutputStatus = "saved"
    visibility: OrbSavedOutputVisibility = "standalone_project"
    project_id: str | None = None
    project_name: str | None = None
    profile_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    summary: str | None = None
    content_markdown: str | None = None
    content_json: dict[str, Any] = Field(default_factory=dict)
    intelligence_output: dict[str, Any] = Field(default_factory=dict)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    citations: list[dict[str, Any]] = Field(default_factory=list)
    quality: dict[str, Any] = Field(default_factory=dict)
    model_routing: dict[str, Any] = Field(default_factory=dict)
    retrieval_context: dict[str, Any] = Field(default_factory=dict)
    created_from: OrbSavedOutputCreatedFrom = "manual"
    created_from_id: str | None = None
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    archived_at: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbSavedOutputListRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    project_id: str | None = None
    output_type: OrbSavedOutputType | None = None
    status: OrbSavedOutputStatus | None = None
    tag: str | None = None
    search: str | None = Field(default=None, max_length=500)
    include_archived: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class OrbSavedOutputSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: OrbSavedOutputType
    status: OrbSavedOutputStatus
    project_id: str | None = None
    project_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    summary: str | None = None
    source_count: int = 0
    quality_score: float | None = None
    created_at: str
    updated_at: str
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbSavedOutputListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[OrbSavedOutputSummary] = Field(default_factory=list)
    total: int = 0
    limit: int = 50
    offset: int = 0


class OrbSavedOutputExportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    format: OrbSavedOutputExportFormat = "markdown"


class OrbSavedOutputExportResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    output_id: str
    format: OrbSavedOutputExportFormat
    content: str
    filename: str
    standalone_notice: str


class OrbSavedOutputReuseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    instruction: str | None = Field(default=None, max_length=4000)


class OrbSavedOutputReuseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    output_id: str
    suggested_prompt: str
    output_summary: str
    source_count: int
    safety_notice: str


class OrbSavedOutputHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "ready"
    service: str = "orb_saved_outputs"
    storage_mode: str = "memory"
    output_count: int = 0
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbIntelligenceSaveContext(BaseModel):
    """Returned alongside intelligence outputs when save is available."""

    model_config = ConfigDict(extra="ignore")

    available: bool = True
    saved: bool = False
    output_id: str | None = None
    project_id: str | None = None
    type: OrbSavedOutputType | None = None


class OrbIntelligenceSaveHints(BaseModel):
    model_config = ConfigDict(extra="ignore")

    save_available: bool = True
    suggested_output_type: OrbSavedOutputType
    suggested_title: str
    suggested_tags: list[str] = Field(default_factory=list)
