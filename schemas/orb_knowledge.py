"""Pydantic models for standalone ORB Knowledge Library (no OS record access)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbKnowledgeSourceType = Literal[
    "product_context",
    "regulatory_framework",
    "policy",
    "practice_guidance",
    "therapeutic_practice",
    "recording_quality",
    "safeguarding_principles",
    "general_knowledge",
    "user_uploaded",
]

OrbKnowledgeSourceStatus = Literal["draft", "indexed", "failed", "archived"]

OrbKnowledgeSourceOrigin = Literal["built_in", "user_uploaded", "admin_added", "seeded"]

OrbKnowledgeConfidenceLevel = Literal["low", "medium", "high", "official"]

OrbKnowledgeGovernanceStatus = Literal[
    "draft",
    "approved",
    "needs_review",
    "expired",
    "archived",
]


class OrbKnowledgeSourceCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=4000)
    source_type: OrbKnowledgeSourceType = "user_uploaded"
    source_label: str | None = Field(default=None, max_length=300)
    file_name: str | None = Field(default=None, max_length=300)
    file_type: str | None = Field(default=None, max_length=80)
    reliability: str | None = Field(default=None, max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_version: str | None = Field(default=None, max_length=120)
    official_source: bool = False
    source_url: str | None = Field(default=None, max_length=2000)
    publisher: str | None = Field(default=None, max_length=300)
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel = "medium"
    governance_status: OrbKnowledgeGovernanceStatus = "approved"
    approved_by: str | None = Field(default=None, max_length=200)
    approved_at: str | None = None
    notes: str | None = Field(default=None, max_length=4000)


class OrbKnowledgeSourceUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=4000)
    source_type: OrbKnowledgeSourceType | None = None
    status: OrbKnowledgeSourceStatus | None = None
    source_label: str | None = Field(default=None, max_length=300)
    metadata: dict[str, Any] | None = None
    source_version: str | None = None
    official_source: bool | None = None
    source_url: str | None = None
    publisher: str | None = None
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel | None = None
    governance_status: OrbKnowledgeGovernanceStatus | None = None
    approved_by: str | None = None
    approved_at: str | None = None
    notes: str | None = None


class OrbKnowledgeSourceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: str | None = None
    source_type: OrbKnowledgeSourceType
    status: OrbKnowledgeSourceStatus = "indexed"
    origin: OrbKnowledgeSourceOrigin = "built_in"
    file_name: str | None = None
    file_type: str | None = None
    source_label: str | None = None
    reliability: str | None = None
    live_retrieved: bool = False
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_version: str | None = None
    official_source: bool = False
    source_url: str | None = None
    publisher: str | None = None
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel = "medium"
    governance_status: OrbKnowledgeGovernanceStatus = "approved"
    approved_by: str | None = None
    approved_at: str | None = None
    notes: str | None = None


class OrbKnowledgeDocumentIngestRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    text: str = Field(..., min_length=1, max_length=500_000)
    source_type: OrbKnowledgeSourceType | None = None
    source_label: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=4000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbKnowledgeChunkRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    source_id: str
    chunk_index: int
    title: str | None = None
    text: str
    section: str | None = None
    page: str | None = None
    token_estimate: int | None = None
    citation_label: str | None = None
    source_type: OrbKnowledgeSourceType | None = None
    keywords: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    embedding: list[float] | None = None
    embedding_model: str | None = None
    embedding_created_at: str | None = None
    semantic_keywords: list[str] = Field(default_factory=list)
    canonical_terms: list[str] = Field(default_factory=list)
    confidence_score: float | None = None


class OrbKnowledgeSearchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str = Field(..., min_length=1, max_length=8000)
    source_type: OrbKnowledgeSourceType | None = None
    limit: int = Field(default=8, ge=1, le=24)


class OrbKnowledgeSearchResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str
    source_title: str
    source_type: OrbKnowledgeSourceType
    citation_label: str
    section: str | None = None
    page: str | None = None
    chunk_index: int
    text: str
    score: float
    match_reason: str
    live_retrieved: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    keyword_score: float | None = None
    semantic_score: float | None = None
    hybrid_score: float | None = None
    confidence_score: float | None = None
    source_confidence: OrbKnowledgeConfidenceLevel | None = None
    governance_status: OrbKnowledgeGovernanceStatus | None = None
    official_source: bool = False
    warning: str | None = None


class OrbKnowledgeSearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str
    results: list[OrbKnowledgeSearchResult] = Field(default_factory=list)
    total: int = 0


class OrbKnowledgeCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    type: str
    basis: str
    note: str | None = None
    source_id: str | None = None
    section: str | None = None
    page: str | None = None
    chunk_index: int | None = None
    origin: str | None = None
    live_retrieved: bool = False
    official_source: bool = False
    confidence_level: OrbKnowledgeConfidenceLevel | None = None
    governance_status: OrbKnowledgeGovernanceStatus | None = None
    source_version: str | None = None
    warning: str | None = None
    retrieval_strategy: str | None = None
    semantic_score: float | None = None
    hybrid_score: float | None = None


class OrbKnowledgeHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str
    storage: str
    source_count: int
    chunk_count: int
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False


class OrbKnowledgeLibrarySummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_count: int
    chunk_count: int
    by_type: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)
    standalone_only: bool = True
    os_linked: bool = False
    care_record_access: bool = False
