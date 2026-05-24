"""Structured high-risk recording templates for /record workspace."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingStructuredFieldType = Literal[
    "text",
    "textarea",
    "datetime",
    "date",
    "time",
    "select",
    "multiselect",
    "boolean",
    "checklist",
    "person_list",
    "action_list",
]


class RecordingStructuredFieldDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    field_type: RecordingStructuredFieldType = "textarea"
    description: str | None = None
    required: bool = False
    privacy_sensitive: bool = False
    safeguarding_sensitive: bool = False
    options: list[str] = Field(default_factory=list)
    placeholder: str | None = None
    guidance: str | None = None
    review_trigger: bool = False
    maps_to_summary: bool = True


class RecordingStructuredSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str | None = None
    fields: list[RecordingStructuredFieldDefinition] = Field(default_factory=list)


class RecordingStructuredTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    form_id: str
    recording_type: str | None = None
    title: str
    description: str
    high_risk: bool = True
    requires_manager_review: bool = True
    safeguarding_sensitive: bool = True
    privacy_sensitive: bool = True
    sections: list[RecordingStructuredSection] = Field(default_factory=list)
    quality_prompts: list[str] = Field(default_factory=list)
    orb_prompts: list[str] = Field(default_factory=list)
    safety_notices: list[str] = Field(default_factory=list)
    review_triggers: list[str] = Field(default_factory=list)
    version: str = "1.0"


class RecordingStructuredFormData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template_id: str
    template_version: str = "1.0"
    values: dict[str, Any] = Field(default_factory=dict)
    completion_summary: list[str] = Field(default_factory=list)
    required_missing: list[str] = Field(default_factory=list)
    review_triggers: list[str] = Field(default_factory=list)
    safety_flags: list[str] = Field(default_factory=list)
    updated_at: str | None = None


class RecordingStructuredTemplateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template: RecordingStructuredTemplate


class RecordingStructuredTemplateListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    items: list[RecordingStructuredTemplate]
    total: int


class RecordingStructuredCompletionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    valid: bool
    required_missing: list[str] = Field(default_factory=list)
    completion_summary: list[str] = Field(default_factory=list)
    review_triggers: list[str] = Field(default_factory=list)
    safety_flags: list[str] = Field(default_factory=list)
    privacy_field_ids: list[str] = Field(default_factory=list)


class RecordingStructuredValidateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    values: dict[str, Any] = Field(default_factory=dict)


class RecordingStructuredSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    values: dict[str, Any] = Field(default_factory=dict)
