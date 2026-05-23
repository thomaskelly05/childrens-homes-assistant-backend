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

OrbKnowledgeDocumentFamily = Literal[
    "ofsted",
    "dfe",
    "legislation",
    "safeguarding",
    "provider_policy",
    "indicare_product",
    "therapeutic_practice",
    "internal_guidance",
    "other",
]

OrbKnowledgeSourceIntegrity = Literal[
    "summary_only",
    "full_document",
    "excerpt_only",
    "user_pasted",
    "unknown",
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
    document_version_label: str | None = Field(default=None, max_length=120)
    official_source: bool = False
    source_url: str | None = Field(default=None, max_length=2000)
    canonical_url: str | None = Field(default=None, max_length=2000)
    publisher: str | None = Field(default=None, max_length=300)
    jurisdiction: str | None = Field(default=None, max_length=120)
    document_family: OrbKnowledgeDocumentFamily | str | None = None
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel = "medium"
    governance_status: OrbKnowledgeGovernanceStatus = "approved"
    source_integrity: OrbKnowledgeSourceIntegrity = "unknown"
    approved_by: str | None = Field(default=None, max_length=200)
    approved_at: str | None = None
    copyright_note: str | None = Field(default=None, max_length=2000)
    citation_style: str | None = Field(default=None, max_length=80)
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
    document_version_label: str | None = None
    official_source: bool | None = None
    source_url: str | None = None
    canonical_url: str | None = None
    publisher: str | None = None
    jurisdiction: str | None = None
    document_family: OrbKnowledgeDocumentFamily | str | None = None
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel | None = None
    governance_status: OrbKnowledgeGovernanceStatus | None = None
    source_integrity: OrbKnowledgeSourceIntegrity | None = None
    approved_by: str | None = None
    approved_at: str | None = None
    copyright_note: str | None = None
    citation_style: str | None = None
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
    document_version_label: str | None = None
    official_source: bool = False
    source_url: str | None = None
    canonical_url: str | None = None
    publisher: str | None = None
    jurisdiction: str | None = None
    document_family: str | None = None
    published_at: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel = "medium"
    governance_status: OrbKnowledgeGovernanceStatus = "approved"
    source_integrity: OrbKnowledgeSourceIntegrity = "summary_only"
    uploaded_by_user_id: str | None = None
    approved_by_user_id: str | None = None
    approved_by: str | None = None
    approved_at: str | None = None
    copyright_note: str | None = None
    citation_style: str | None = None
    notes: str | None = None


class OrbKnowledgeOfficialImportRequest(BaseModel):
    """Import an official or provider source with governance metadata."""

    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    text: str = Field(..., min_length=1, max_length=500_000)
    document_family: OrbKnowledgeDocumentFamily | str | None = None
    family_key: str | None = Field(default=None, max_length=80)
    source_type: OrbKnowledgeSourceType | None = None
    source_label: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=4000)
    publisher: str | None = Field(default=None, max_length=300)
    source_url: str | None = Field(default=None, max_length=2000)
    canonical_url: str | None = Field(default=None, max_length=2000)
    document_version_label: str | None = Field(default=None, max_length=120)
    source_version: str | None = Field(default=None, max_length=120)
    review_due_at: str | None = None
    expires_at: str | None = None
    official_source: bool | None = None
    source_integrity: OrbKnowledgeSourceIntegrity = "full_document"
    approve_now: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbKnowledgeSourceMetadataPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = None
    publisher: str | None = None
    source_url: str | None = None
    canonical_url: str | None = None
    document_family: str | None = None
    document_version_label: str | None = None
    source_version: str | None = None
    review_due_at: str | None = None
    expires_at: str | None = None
    official_source: bool | None = None
    source_integrity: OrbKnowledgeSourceIntegrity | None = None
    confidence_level: OrbKnowledgeConfidenceLevel | None = None
    copyright_note: str | None = None
    notes: str | None = None
    metadata: dict[str, Any] | None = None


class OrbKnowledgeDocumentIngestRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    text: str = Field(..., min_length=1, max_length=500_000)
    source_type: OrbKnowledgeSourceType | None = None
    source_label: str | None = Field(default=None, max_length=300)
    description: str | None = Field(default=None, max_length=4000)
    metadata: dict[str, Any] = Field(default_factory=dict)
    document_family: str | None = None
    publisher: str | None = None
    source_url: str | None = None
    source_version: str | None = None
    official_source: bool | None = None
    source_integrity: OrbKnowledgeSourceIntegrity | None = None
    approve_now: bool = False


class OrbKnowledgeChunkRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    source_id: str
    chunk_index: int
    title: str | None = None
    text: str
    heading_path: list[str] = Field(default_factory=list)
    heading: str | None = None
    section: str | None = None
    subsection: str | None = None
    page: str | None = None
    paragraph_number: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    exact_excerpt: str | None = None
    normalized_excerpt: str | None = None
    citation_anchor: str | None = None
    citation_label: str | None = None
    source_url: str | None = None
    source_version: str | None = None
    official_source: bool = False
    source_integrity: str | None = None
    governance_status: str | None = None
    confidence_level: str | None = None
    token_estimate: int | None = None
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
    exact_citation: str | None = None
    citation_anchor: str | None = None
    heading_path: list[str] = Field(default_factory=list)
    heading: str | None = None
    section: str | None = None
    subsection: str | None = None
    page: str | None = None
    paragraph_number: str | None = None
    chunk_index: int
    text: str
    excerpt: str | None = None
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
    source_integrity: str | None = None
    source_url: str | None = None
    source_version: str | None = None
    warning: str | None = None
    quote_allowed: bool = True


class OrbKnowledgeSearchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    query: str
    results: list[OrbKnowledgeSearchResult] = Field(default_factory=list)
    total: int = 0


class OrbKnowledgeCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    label: str
    exact_citation: str | None = None
    citation_anchor: str | None = None
    type: str
    basis: str
    note: str | None = None
    excerpt: str | None = None
    source_id: str | None = None
    heading_path: list[str] = Field(default_factory=list)
    heading: str | None = None
    section: str | None = None
    subsection: str | None = None
    page: str | None = None
    paragraph_number: str | None = None
    chunk_index: int | None = None
    origin: str | None = None
    live_retrieved: bool = False
    official_source: bool = False
    source_integrity: str | None = None
    source_url: str | None = None
    confidence_level: OrbKnowledgeConfidenceLevel | None = None
    governance_status: OrbKnowledgeGovernanceStatus | None = None
    source_version: str | None = None
    warning: str | None = None
    quote_allowed: bool = True
    retrieval_strategy: str | None = None
    semantic_score: float | None = None
    hybrid_score: float | None = None


class OrbKnowledgeCitationHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str
    chunk_count: int
    chunks_with_section: int
    chunks_with_page: int
    chunks_with_heading: int
    chunks_with_anchor: int
    chunks_with_exact_excerpt: int
    summary_only: bool
    governance_status: str | None = None
    official_source: bool = False
    source_integrity: str | None = None
    warnings: list[str] = Field(default_factory=list)
    health_status: str = "ok"


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
