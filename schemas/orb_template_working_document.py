"""Canonical ORB template working document schema.

Every ORB template can open as an editable, saveable working document in ORB Write
and transfer across Chat, Voice, Dictate, Communicate and Records.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from schemas.orb_home_documents import COMPLIANCE_NOT_GUARANTEED_DISCLAIMER, HOME_AWARE_ANSWER_DISCLAIMER
from schemas.orb_records_workspace import OrbRecordSourceStation
from services.orb_therapeutic_template_factory_service import REVIEW_BEFORE_USE

OrbTemplateDocumentType = Literal[
    "short_record",
    "long_record",
    "report",
    "audit",
    "tracker",
    "care_plan_contribution",
    "risk_assessment",
    "evidence_pack",
    "letter",
    "communication_pack",
    "supervision_document",
    "action_plan",
    "chronology",
    "review_document",
]

OrbTemplateSectionType = Literal[
    "narrative",
    "checklist",
    "table",
    "chart",
    "action_plan",
    "reflection",
    "evidence",
    "signatures",
]

OrbTemplateFieldType = Literal[
    "text",
    "long_text",
    "date",
    "time",
    "select",
    "multi_select",
    "checkbox",
    "person_reference",
    "child_reference",
    "staff_reference",
    "home_reference",
    "regulation_reference",
    "risk_level",
    "status",
]

OrbTemplateTableType = Literal[
    "action_plan_table",
    "risk_matrix_table",
    "chronology_table",
    "evidence_tracker_table",
    "audit_checklist_table",
    "medication_audit_table",
    "incident_review_table",
    "supervision_action_table",
    "complaints_tracker_table",
    "education_progress_table",
    "health_appointments_table",
    "missing_from_care_tracker",
    "reg_44_evidence_table",
    "reg_45_action_table",
    "sccif_evidence_tracker",
    "staff_training_tracker",
    "location_risk_table",
    "home_document_reference_table",
]

OrbTemplateChartType = Literal[
    "incident_trend_line_chart",
    "missing_episode_trend_chart",
    "restraint_frequency_chart",
    "medication_error_trend_chart",
    "complaint_theme_bar_chart",
    "supervision_completion_chart",
    "training_completion_chart",
    "reg_45_action_completion_chart",
    "audit_score_chart",
    "placement_stability_timeline",
    "education_attendance_chart",
    "health_appointment_completion_chart",
    "safeguarding_theme_chart",
]

OrbTemplateExportOption = Literal["copy", "print", "pdf", "word", "provider_system_paste"]

WORKING_DOCUMENT_REVIEW_REMINDER = REVIEW_BEFORE_USE

WORKING_DOCUMENT_SAFETY_STANDARDS = (
    "Distinguish observation from interpretation. Keep the child central. "
    "Include child voice where relevant. Avoid judgemental or punitive language. "
    "Support professional judgement. Adult review is required before saving or finalising. "
    "ORB does not diagnose, claim compliance, or replace manager/social worker/health/"
    "safeguarding decisions. Home documents must not override safeguarding duties."
)


class OrbTemplateSourceChip(BaseModel):
    model_config = ConfigDict(extra="ignore")

    chip_id: str
    label: str
    chip_type: Literal["practice_anchor", "regulation_anchor", "home_document", "template_source"] = (
        "practice_anchor"
    )
    reference_id: str | None = None
    metadata_only: bool = True


class OrbTemplateWorkingDocumentField(BaseModel):
    model_config = ConfigDict(extra="ignore")

    field_id: str
    label: str
    field_type: OrbTemplateFieldType = "text"
    required: bool = False
    options: list[str] = Field(default_factory=list)
    value: str | list[str] | bool | None = None
    guidance: str | None = None


class OrbTemplateWorkingDocumentTable(BaseModel):
    model_config = ConfigDict(extra="ignore")

    table_id: str
    table_type: OrbTemplateTableType
    title: str
    columns: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    editable: bool = True
    guidance: str | None = None
    empty_state_guidance: str | None = None


class OrbTemplateWorkingDocumentChart(BaseModel):
    model_config = ConfigDict(extra="ignore")

    chart_id: str
    chart_type: OrbTemplateChartType
    title: str
    source_table_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    optional: bool = True
    has_data: bool = False
    empty_state_guidance: str = (
        "No data yet — add rows to the linked table to generate this chart. "
        "Do not invent data."
    )


class OrbTemplateWorkingDocumentSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section_id: str
    heading: str
    guidance: str | None = None
    prompt: str | None = None
    body: str = ""
    required: bool = True
    section_type: OrbTemplateSectionType = "narrative"
    orb_assist_enabled: bool = True
    home_document_context_enabled: bool = False
    sort_order: int = 0


class OrbTemplateWorkingDocument(BaseModel):
    """Editable working document built from a canonical ORB template."""

    model_config = ConfigDict(extra="ignore")

    document_id: str = Field(default_factory=lambda: str(uuid4()))
    template_id: str
    title: str
    description: str | None = None
    document_type: OrbTemplateDocumentType = "long_record"
    lifecycle_group: str | None = None
    category: str | None = None
    station_availability: list[str] = Field(default_factory=list)
    safeguarding_level: str = "standard"
    regulation_anchors: list[str] = Field(default_factory=list)
    home_document_context_allowed: bool = False
    allowed_home_document_types: list[str] = Field(default_factory=list)
    sections: list[OrbTemplateWorkingDocumentSection] = Field(default_factory=list)
    fields: list[OrbTemplateWorkingDocumentField] = Field(default_factory=list)
    tables: list[OrbTemplateWorkingDocumentTable] = Field(default_factory=list)
    charts: list[OrbTemplateWorkingDocumentChart] = Field(default_factory=list)
    action_plans: list[OrbTemplateWorkingDocumentTable] = Field(default_factory=list)
    review_prompts: list[str] = Field(default_factory=list)
    child_voice_prompts: list[str] = Field(default_factory=list)
    therapeutic_guidance: list[str] = Field(default_factory=list)
    what_to_avoid: list[str] = Field(default_factory=list)
    source_chips: list[OrbTemplateSourceChip] = Field(default_factory=list)
    linked_home_document_ids: list[str] = Field(default_factory=list)
    home_document_chips: list[OrbTemplateSourceChip] = Field(default_factory=list)
    save_destination: str = "records_drafts"
    export_options: list[OrbTemplateExportOption] = Field(
        default_factory=lambda: ["copy", "print", "pdf", "word"]
    )
    review_before_use_reminder: str = WORKING_DOCUMENT_REVIEW_REMINDER
    compliance_disclaimer: str = COMPLIANCE_NOT_GUARANTEED_DISCLAIMER
    home_document_disclaimer: str = HOME_AWARE_ANSWER_DISCLAIMER
    safety_standards: str = WORKING_DOCUMENT_SAFETY_STANDARDS
    rendered_body: str = ""
    source_station: OrbRecordSourceStation = "write"
    status: Literal["draft", "reviewed", "finalised", "archived"] = "draft"
    owner_user_id: str | None = None
    home_id: str | None = None
    child_id: str | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbTemplateWorkingDocumentBuildRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    template_id: str = Field(..., min_length=1, max_length=120)
    title: str | None = None
    source_station: OrbRecordSourceStation = "write"
    context_text: str | None = None
    home_id: str | None = None
    child_id: str | None = None
    owner_user_id: str | None = None
    linked_home_document_ids: list[str] = Field(default_factory=list)


class OrbTemplateWorkingDocumentSaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document: OrbTemplateWorkingDocument
    workspace_section: str = "my_drafts"


class OrbTemplateSectionOrbHelpRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_id: str
    section_id: str
    instruction: str = Field(..., min_length=1, max_length=2000)
    current_body: str | None = None
