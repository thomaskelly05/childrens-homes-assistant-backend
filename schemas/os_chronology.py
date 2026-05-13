from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OSResponse(BaseModel):
    success: bool = True
    data: Any
    meta: dict[str, Any] | None = None


class OSErrorEnvelope(BaseModel):
    success: bool = False
    error: dict[str, Any]


class OSChronologyItem(BaseModel):
    id: str
    source_type: str
    source_id: str
    date_time: str
    title: str
    summary: str
    full_text: str | None = None
    young_person_ids: list[str] = Field(default_factory=list)
    staff_ids: list[str] = Field(default_factory=list)
    home_id: str | None = None
    category: str = "care_record"
    severity: str = "medium"
    tags: list[str] = Field(default_factory=list)
    safeguarding_flags: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    regulation_links: list[dict[str, Any]] = Field(default_factory=list)
    sccif_links: list[str] = Field(default_factory=list)
    quality_standard_links: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    action_ids: list[str] = Field(default_factory=list)
    document_ids: list[str] = Field(default_factory=list)
    report_ids: list[str] = Field(default_factory=list)
    created_by: str | None = None
    citation_label: str
    source_url: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class OSChronologyPage(BaseModel):
    items: list[OSChronologyItem]
    page: int
    page_size: int
    total: int
    has_more: bool

