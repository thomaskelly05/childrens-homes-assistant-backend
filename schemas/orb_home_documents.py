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
    "placement_planning_document": "Placement planning document",
    "child_specific_plan": "Child-specific plan (authorised)",
    "risk_assessment": "Risk assessment",
    "behaviour_support_plan": "Behaviour support plan",
    "communication_plan": "Communication plan",
    "health_plan": "Health plan",
    "education_plan": "Education plan",
    "local_authority_protocol": "Local authority protocol",
    "other_home_policy": "Other home policy",
}

HOME_AWARE_ANSWER_DISCLAIMER = (
    "Home document knowledge supports answers when uploaded and indexed. "
    "ORB cites home documents explicitly and never invents content from them. "
    "Safeguarding and regulatory principles are not overridden by local policy. "
    "If local policy appears to conflict with safeguarding best practice, "
    "ORB advises manager review and escalation."
)


class OrbHomeDocumentRecord(BaseModel):
    """Planned home document record — converges ORB knowledge library and OS document upload."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    home_id: str | None = None
    organisation_id: str | None = None
    child_id: str | None = None
    document_type: OrbHomeDocumentType
    title: str = Field(..., min_length=1, max_length=500)
    file_name: str | None = Field(default=None, max_length=300)
    version: int = 1
    status: OrbHomeDocumentStatus = "processing"
    permission: OrbHomeDocumentPermission = "home_manager"
    text_extracted: bool = False
    embeddings_enabled: bool = False
    citation_label: str | None = None
    uploaded_by_user_id: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    archived_at: str | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbHomeDocumentCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_id: str
    document_type: OrbHomeDocumentType
    citation_label: str
    used_in_answer: bool = True
    conflict_advisory: str | None = None


class OrbHomeDocumentHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "foundation"
    service: str = "orb_home_documents"
    defined_document_types: int = len(HOME_DOCUMENT_TYPE_LABELS)
    existing_orb_knowledge_routes: str = "/orb/standalone/knowledge/*"
    existing_os_upload_route: str = "/os/documents/upload"
    client_local_store: str = "frontend-next/lib/orb/knowledge/orb-home-documents-store.ts"
    persistence_status: str = "convergence_planned"
