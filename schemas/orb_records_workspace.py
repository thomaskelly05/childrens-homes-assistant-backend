"""ORB Records & Documents workspace foundation schemas.

Converges standalone ORB saved outputs with IndiCare OS recording drafts.
This pass defines the data model plan — persistence wiring is a follow-up pass.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

OrbRecordWorkspaceSection = Literal[
    "my_drafts",
    "my_records",
    "my_documents",
    "saved_templates",
    "recently_generated",
    "needs_review",
    "finalised",
    "archived",
]

OrbRecordItemStatus = Literal["draft", "reviewed", "finalised", "archived"]

OrbRecordSourceStation = Literal[
    "chat", "dictate", "voice", "write", "templates", "communicate", "records", "manual"
]

OrbRecordPrivacyClassification = Literal[
    "standard",
    "sensitive",
    "safeguarding",
    "high_risk",
    "minimised",
]

OrbRecordRetentionPolicy = Literal[
    "operational_draft",
    "care_record_linked",
    "inspection_evidence",
    "governance",
    "standalone_artefact",
]


class OrbRecordWorkspaceItem(BaseModel):
    """Planned unified workspace item — owner-scoped, home-aware."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    owner_user_id: str
    home_id: str | None = None
    organisation_id: str | None = None
    child_id: str | None = None
    workspace_section: OrbRecordWorkspaceSection = "my_drafts"
    category: str | None = None
    template_id: str | None = None
    source_station: OrbRecordSourceStation = "manual"
    title: str = Field(..., min_length=1, max_length=500)
    body: str | None = Field(default=None, max_length=500_000)
    status: OrbRecordItemStatus = "draft"
    privacy_classification: OrbRecordPrivacyClassification = "standard"
    retention_policy: OrbRecordRetentionPolicy = "operational_draft"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    reviewed_at: str | None = None
    exported_at: str | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)
    retention_metadata: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbRecordWorkspaceListRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section: OrbRecordWorkspaceSection | None = None
    status: OrbRecordItemStatus | None = None
    template_id: str | None = None
    source_station: OrbRecordSourceStation | None = None
    search: str | None = Field(default=None, max_length=500)
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class OrbRecordWorkspaceHealth(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str = "foundation"
    service: str = "orb_records_workspace"
    sections: list[str] = Field(
        default_factory=lambda: [
            "my_drafts",
            "my_records",
            "my_documents",
            "saved_templates",
            "recently_generated",
            "needs_review",
            "finalised",
            "archived",
        ]
    )
    persistence_status: str = "planned"
    os_recording_drafts_integration: str = "convergence_planned"
    standalone_saved_outputs_integration: str = "existing_schemas_orb_saved_outputs"
