"""Home document upload types and knowledge architecture foundation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

OrbHomeDocumentType = Literal[
    "statement_of_purpose",
    "safeguarding_policy",
    "missing_from_care_policy",
    "behaviour_support_policy",
    "physical_intervention_policy",
    "medication_policy",
    "complaints_policy",
    "fire_safety_policy",
    "whistleblowing_policy",
    "staff_supervision_policy",
    "admission_policy",
    "placement_planning_document",
    "child_specific_plan",
    "risk_assessment",
    "behaviour_support_plan",
    "communication_plan",
    "health_plan",
    "education_plan",
    "local_authority_protocol",
    "other_home_policy",
]

OrbHomeDocumentStatus = Literal["processing", "ready", "failed", "archived"]

TextExtractStatus = Literal["pending", "processing", "ready", "failed"]

IndexingStatus = Literal["pending", "indexed", "failed", "disabled"]

OrbHomeDocumentPermission = Literal[
    "home_staff",
    "home_manager",
    "organisation_admin",
    "child_authorised_staff",
]

HOME_DOCUMENT_TYPE_LABELS: dict[str, str] = {
    "statement_of_purpose": "Statement of Purpose",
    "safeguarding_policy": "Safeguarding policy",
    "missing_from_care_policy": "Missing from care policy",
    "behaviour_support_policy": "Behaviour support policy",
    "physical_intervention_policy": "Physical intervention policy",
    "medication_policy": "Medication policy",
    "complaints_policy": "Complaints policy",
    "fire_safety_policy": "Fire safety policy",
    "whistleblowing_policy": "Whistleblowing policy",
    "staff_supervision_policy": "Staff supervision policy",
    "admission_policy": "Admission policy",
    "placement_planning_document": "Placement planning policy",
    "child_specific_plan": "Child placement plan",
    "risk_assessment": "Risk assessment",
    "behaviour_support_plan": "Behaviour support plan",
    "communication_plan": "Communication plan",
    "health_plan": "Health plan",
    "education_plan": "Education plan",
    "local_authority_protocol": "Local authority protocol",
    "other_home_policy": "Other",
}

ALLOWED_HOME_DOCUMENT_MIME_TYPES = frozenset({
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
})

ALLOWED_HOME_DOCUMENT_EXTENSIONS = frozenset({".pdf", ".docx", ".txt", ".md"})

HOME_AWARE_ANSWER_DISCLAIMER = (
    "Home document knowledge supports answers when uploaded and indexed. "
    "ORB cites home documents explicitly and never invents content from them. "
    "Safeguarding and regulatory principles are not overridden by local policy. "
    "If local policy appears to conflict with safeguarding best practice, "
    "ORB advises manager review and escalation."
)

LOCAL_POLICY_CONFLICT_ADVISORY = (
    "This should be reviewed by the manager because local procedure must not "
    "override safeguarding duties."
)

COMPLIANCE_NOT_GUARANTEED_DISCLAIMER = (
    "Following a home document does not guarantee compliance. Professional "
    "judgement and local procedure caveats always apply."
)


class OrbHomeDocumentRecord(BaseModel):
    """Canonical home document record — server-backed with audit trail."""

    model_config = ConfigDict(extra="ignore")

    document_id: str = Field(default_factory=lambda: str(uuid4()))
    home_id: str | None = None
    organisation_id: str | None = None
    child_id: str | None = None
    uploaded_by_user_id: str | None = None
    owner_user_id: str | None = None
    document_type: OrbHomeDocumentType
    title: str = Field(..., min_length=1, max_length=500)
    filename: str | None = Field(default=None, max_length=300)
    mime_type: str | None = None
    storage_uri: str | None = None
    text_extract_status: TextExtractStatus = "pending"
    indexing_status: IndexingStatus = "pending"
    version: int = 1
    archived: bool = False
    status: OrbHomeDocumentStatus = "processing"
    permission: OrbHomeDocumentPermission = "home_manager"
    access_role_policy: OrbHomeDocumentPermission = "home_manager"
    privacy_classification: str = "home_operational"
    text_extracted: bool = False
    embeddings_enabled: bool = False
    citation_label: str | None = None
    ready_for_orb_use: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    archived_at: str | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbHomeDocumentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, min_length=1, max_length=500)
    document_type: OrbHomeDocumentType | None = None
    access_role_policy: OrbHomeDocumentPermission | None = None
    privacy_classification: str | None = None


class OrbHomeDocumentListRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_type: OrbHomeDocumentType | None = None
    include_archived: bool = False
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class OrbHomeDocumentSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total: int = 0
    archived: int = 0
    ready_for_orb_use: int = 0
    by_document_type: dict[str, int] = Field(default_factory=dict)
    by_text_extract_status: dict[str, int] = Field(default_factory=dict)
    by_indexing_status: dict[str, int] = Field(default_factory=dict)
    failed_extraction_count: int = 0
    failed_indexing_count: int = 0


class OrbHomeDocumentHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "live"
    service: str = "orb_home_documents"
    persistence_status: str = "memory"
    defined_document_types: int = len(HOME_DOCUMENT_TYPE_LABELS)
    embeddings_enabled: bool = False
    canonical_route: str = "/orb/home-documents/*"
    existing_orb_knowledge_routes: str = "/orb/standalone/knowledge/*"
    existing_os_upload_route: str = "/os/documents/upload"
    client_local_store: str = "frontend-next/lib/orb/knowledge/orb-home-documents-store.ts"
    document_library_routes_status: str = "unmounted"
    convergence_map: str = "docs/audits/orb-home-documents-convergence-map.md"


class OrbHomeDocumentCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_id: str
    document_type: OrbHomeDocumentType
    citation_label: str
    source_chip: str
    used_in_answer: bool = True
    conflict_advisory: str | None = None


class OrbHomeDocumentTypeInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    value: str
    label: str


class OrbHomeDocumentFounderAnalytics(BaseModel):
    model_config = ConfigDict(extra="ignore")

    upload_count: int = 0
    by_document_type: dict[str, int] = Field(default_factory=dict)
    by_text_extract_status: dict[str, int] = Field(default_factory=dict)
    by_indexing_status: dict[str, int] = Field(default_factory=dict)
    failed_extraction_count: int = 0
    failed_indexing_count: int = 0
    organisations_with_uploads: int = 0
    identifiers_redacted: bool = True
    disclaimer: str = ""
