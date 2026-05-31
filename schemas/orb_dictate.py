from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbDictateNoteType = Literal[
    "daily_record",
    "incident_record",
    "chronology_entry",
    "handover_note",
    "keywork_summary",
    "manager_oversight_note",
    "safeguarding_concern_record",
    "missing_episode_note",
    "staff_debrief",
    "supervision_reflection",
    "learning_note",
    "action_plan",
    "reg44_prep_note",
    "ofsted_evidence_summary",
]

OrbDictateSource = Literal["dictation", "orb_voice", "paste", "upload", "template"]

OrbDictateQualityStatus = Literal["present", "missing", "weak", "review", "good", "needs_review"]

OrbDictateExportFormat = Literal["copy", "pdf", "docx", "markdown", "save"]


class OrbDictateTemplateSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    prompts: list[str] = Field(default_factory=list)
    required: bool = True


class OrbDictateTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_type: OrbDictateNoteType
    title: str
    purpose: str
    when_to_use: str
    sections: list[OrbDictateTemplateSection]
    optional_prompts: list[str] = Field(default_factory=list)
    quality_checks: list[str] = Field(default_factory=list)
    export_label: str


class OrbDictateGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_text: str = Field(..., min_length=1, max_length=120_000)
    note_type: OrbDictateNoteType = "daily_record"
    audience: str = Field(default="residential_practitioner", max_length=120)
    tone: str = Field(default="professional", max_length=80)
    include_child_voice: bool = True
    include_safeguarding: bool = True
    include_manager_oversight: bool = True
    include_actions: bool = True
    include_ofsted_lens: bool = False
    template_id: str | None = Field(default=None, max_length=120)
    source: OrbDictateSource = "dictation"
    conversation_consent_confirmed: bool | None = None


class OrbDictateQualityChecks(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_voice: OrbDictateQualityStatus = "missing"
    safeguarding: OrbDictateQualityStatus = "missing"
    manager_oversight: OrbDictateQualityStatus = "missing"
    impact: OrbDictateQualityStatus = "missing"
    recording_quality: Literal["good", "needs_review"] = "needs_review"


class OrbDictateGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_id: str | None = None
    title: str
    note_type: OrbDictateNoteType
    professional_note: str
    summary: str
    actions: list[str] = Field(default_factory=list)
    transcript: str
    ofsted_lens: str | None = None
    quality_checks: OrbDictateQualityChecks
    export_options: list[OrbDictateExportFormat] = Field(
        default_factory=lambda: ["copy", "pdf", "docx", "save"]
    )
    standalone_boundary: str
    governance_notice: str


class OrbDictateTranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str | None = Field(default=None, max_length=120_000)
    conversation_consent_confirmed: bool | None = None


class OrbDictateTranscribeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    transcript: str
    segments: list[dict[str, Any]] = Field(default_factory=list)


class OrbDictateSaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_id: str | None = None
    title: str = Field(..., min_length=1, max_length=500)
    note_type: OrbDictateNoteType
    professional_note: str = Field(..., min_length=1, max_length=500_000)
    summary: str | None = Field(default=None, max_length=8000)
    transcript: str | None = Field(default=None, max_length=500_000)
    actions: list[str] = Field(default_factory=list)
    project_id: str | None = Field(default=None, max_length=120)
    tags: list[str] = Field(default_factory=list)
    create_version: bool = True


class OrbDictateSaveResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_id: str
    saved_output_id: str | None = None
    ai_note_id: int | None = None
    version_id: int | None = None
    standalone_boundary: str
    message: str


class OrbDictateExportRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=500)
    professional_note: str = Field(..., min_length=1, max_length=500_000)
    format: Literal["pdf", "docx", "markdown"] = "pdf"
    note_type: OrbDictateNoteType | None = None


class OrbDictateNoteSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_id: str
    title: str
    note_type: OrbDictateNoteType
    updated_at: str
    source: str = "orb_dictate"


class OrbDictateNotePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str | None = Field(default=None, max_length=500)
    professional_note: str | None = Field(default=None, max_length=500_000)
    summary: str | None = Field(default=None, max_length=8000)
    create_version: bool = True
