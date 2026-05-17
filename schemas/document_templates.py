from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class DocumentScope(StrEnum):
    CHILD = "child"
    HOME = "home"
    STAFF = "staff"


class DocumentStatus(StrEnum):
    DRAFT = "draft"
    AUTOSAVED = "autosaved"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    AMENDMENT_REQUESTED = "amendment_requested"
    APPROVED = "approved"
    ESCALATED = "escalated"
    ARCHIVED = "archived"


class DocumentSectionTemplate(BaseModel):
    section_id: str
    title: str
    purpose: str
    prompts: list[str] = Field(default_factory=list)
    required: bool = True
    therapeutic_guidance: list[str] = Field(default_factory=list)
    evidence_links: list[str] = Field(default_factory=list)
    chronology_links: list[str] = Field(default_factory=list)


class DocumentTemplate(BaseModel):
    template_id: str
    title: str
    category: str
    scope: DocumentScope
    description: str
    review_frequency: str
    owner_role: str
    required_sections: list[DocumentSectionTemplate]
    optional_sections: list[DocumentSectionTemplate] = Field(default_factory=list)
    regulatory_links: list[str] = Field(default_factory=list)
    quality_standard_links: list[str] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    evidence_requirements: list[str] = Field(default_factory=list)
    chronology_requirements: list[str] = Field(default_factory=list)
    signoff_requirements: list[str] = Field(default_factory=list)
    export_profile: dict[str, Any] = Field(default_factory=dict)
    orb_prompt_pack: list[str] = Field(default_factory=list)
    child_voice_prompts: list[str] = Field(default_factory=list)
    therapeutic_guidance: list[str] = Field(default_factory=list)
    inspection_relevance: str
    workflow: dict[str, Any] = Field(default_factory=dict)


class DocumentInstance(BaseModel):
    document_id: str | None = None
    template_id: str
    title: str
    scope: DocumentScope
    child_id: int | str | None = None
    home_id: int | str | None = None
    staff_id: int | str | None = None
    status: DocumentStatus = DocumentStatus.DRAFT
    sections: dict[str, str] = Field(default_factory=dict)
    links: list[dict[str, Any]] = Field(default_factory=list)
    review: dict[str, Any] = Field(default_factory=dict)
    signatures: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentCreateRequest(BaseModel):
    template_id: str
    title: str | None = None
    child_id: int | str | None = None
    home_id: int | str | None = None
    staff_id: int | str | None = None
    sections: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentUpdateRequest(BaseModel):
    title: str | None = None
    sections: dict[str, str] | None = None
    links: list[dict[str, Any]] | None = None
    metadata: dict[str, Any] | None = None
    status: DocumentStatus | None = None
    version_reason: str = "manual_save"
