from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


PartnerAssistantMode = Literal[
    "guidance",
    "recording_support",
    "chronology",
    "reg45_review",
    "safeguarding_review",
    "summary",
    "general",
]

SafeguardingLevel = Literal["none", "standard", "concern", "urgent"]


class PartnerAssistantContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host_system: str | None = Field(default=None, max_length=120)
    organisation_id: str | None = Field(default=None, max_length=120)
    home_id: str | int | None = None
    young_person_id: str | int | None = None
    record_type: str | None = Field(default=None, max_length=80)
    record_id: str | int | None = None
    user_id: str | int | None = None
    user_role: str | None = Field(default=None, max_length=120)
    page_url: str | None = Field(default=None, max_length=500)


class PartnerAssistantDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=160)
    content: str = Field(..., min_length=1, max_length=12000)
    source_type: str | None = Field(default=None, max_length=80)
    source_id: str | int | None = None
    date: str | None = Field(default=None, max_length=40)


class PartnerAssistantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=4000)
    mode: PartnerAssistantMode = "general"
    context: PartnerAssistantContext = Field(default_factory=PartnerAssistantContext)
    documents: list[PartnerAssistantDocument] = Field(default_factory=list, max_length=25)
    conversation_id: str | None = Field(default=None, max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PartnerAssistantCitation(BaseModel):
    title: str
    source_type: str | None = None
    source_id: str | int | None = None
    url: str | None = None
    excerpt: str | None = None


class PartnerAssistantSuggestedAction(BaseModel):
    label: str
    action_type: str
    payload: dict[str, Any] = Field(default_factory=dict)


class PartnerAssistantResponse(BaseModel):
    answer: str
    mode: PartnerAssistantMode
    safeguarding_level: SafeguardingLevel = "standard"
    follow_up_required: bool = False
    citations: list[PartnerAssistantCitation] = Field(default_factory=list)
    suggested_actions: list[PartnerAssistantSuggestedAction] = Field(default_factory=list)
    audit_id: str
    conversation_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
