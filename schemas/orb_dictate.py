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
    "team_meeting",
    "investigation_meeting",
    "strategy_multi_agency_prep",
    "meeting_notes",
    "professional_consultation",
    "home_visit_note",
    "assessment_notes",
    "supervision_discussion",
    "multi_agency_discussion",
    "strategy_safeguarding_discussion",
]

OrbDictateSpeakerSource = Literal["diarised", "manual", "transcript_named", "unknown"]

OrbDictateActionPointStatus = Literal["pending", "confirmed", "dismissed"]

OrbDictateMode = Literal[
    "rough_note",
    "team_meeting",
    "staff_debrief",
    "investigation_meeting",
    "reflective_supervision",
    "strategy_multi_agency_prep",
    "handover",
]

OrbDictateSegmentSource = Literal["live", "upload", "paste", "orb_voice"]

OrbDictateSource = Literal["dictation", "orb_voice", "paste", "upload", "template"]

OrbDictateQualityStatus = Literal["present", "missing", "weak", "review", "good", "needs_review"]

OrbDictateExportFormat = Literal["copy", "pdf", "docx", "markdown", "save"]

OrbDictateEditMode = Literal[
    "spelling_grammar",
    "therapeutic_rewrite",
    "ofsted_ready",
    "inspection_evidence_support",
    "factual_tone",
    "professional_language",
    "child_voice",
    "safeguarding_lens",
    "manager_oversight",
    "chronology_conversion",
    "handover_conversion",
    "concise_summary",
    "action_plan",
    "ri_summary",
    "missing_information",
    "recording_quality_review",
    "less_judgemental",
    "parent_friendly",
    "sccif_lens",
    "professional_curiosity",
    "evidence_of_impact",
    "manager_note",
    "safeguarding_concern",
    "supervision_reflection",
]


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


class OrbDictateParticipant(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    role: str | None = None
    organisation: str | None = None
    initials: str | None = None
    introduced_by: Literal["self", "manual", "import", "unknown"] = "unknown"


class OrbDictateTranscriptSegment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    speaker_id: str | None = None
    speaker_label: str
    text: str
    started_at: str | None = None
    ended_at: str | None = None
    confidence: float | None = None
    source: OrbDictateSegmentSource = "paste"
    is_direct_quote: bool = False
    needs_review: bool = False


class OrbDictateSpeakerSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")

    known_speakers: int = 0
    unknown_speakers: int = 0
    needs_review: bool = True


class OrbDictateSpeaker(BaseModel):
    """Converged speaker model — detection vs adult-confirmed identification."""

    model_config = ConfigDict(extra="ignore")

    speaker_id: str
    display_label: str
    confirmed_name: str | None = None
    confirmed_role: str | None = None
    confidence: float | None = None
    source: OrbDictateSpeakerSource = "unknown"
    is_confirmed: bool = False


class OrbDictateActionPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    action: str
    owner: str = "Not stated"
    deadline: str = "Not stated"
    status: OrbDictateActionPointStatus = "pending"
    source_segment_id: str | None = None
    source_label: str | None = None
    management_oversight: bool = False


class OrbDictateGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_text: str = Field(..., min_length=1, max_length=120_000)
    note_type: OrbDictateNoteType = "daily_record"
    mode: OrbDictateMode | None = None
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
    consent_confirmed: bool | None = None
    investigation_boundary_confirmed: bool | None = None
    participants: list[OrbDictateParticipant] = Field(default_factory=list)
    segments: list[OrbDictateTranscriptSegment] = Field(default_factory=list)


class OrbDictateQualityChecks(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_voice: OrbDictateQualityStatus = "missing"
    safeguarding: OrbDictateQualityStatus = "missing"
    manager_oversight: OrbDictateQualityStatus = "missing"
    impact: OrbDictateQualityStatus = "missing"
    recording_quality: Literal["good", "needs_review"] = "needs_review"
    factual_clarity: OrbDictateQualityStatus = "missing"
    staff_response: OrbDictateQualityStatus = "missing"
    professional_curiosity: OrbDictateQualityStatus = "missing"
    chronology_relevance: OrbDictateQualityStatus = "missing"
    plan_risk_review: OrbDictateQualityStatus = "missing"
    recording_tone: OrbDictateQualityStatus = "missing"
    non_judgemental_language: OrbDictateQualityStatus = "missing"
    evidence_of_action: OrbDictateQualityStatus = "missing"
    follow_up_review_date: OrbDictateQualityStatus = "missing"


class OrbDictateGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_id: str | None = None
    title: str
    note_type: OrbDictateNoteType
    professional_note: str
    summary: str
    actions: list[str] = Field(default_factory=list)
    structured_actions: list[OrbDictateActionPoint] = Field(default_factory=list)
    speakers: list[OrbDictateSpeaker] = Field(default_factory=list)
    transcript: str
    ofsted_lens: str | None = None
    quality_checks: OrbDictateQualityChecks
    export_options: list[OrbDictateExportFormat] = Field(
        default_factory=lambda: ["copy", "pdf", "docx", "save"]
    )
    standalone_boundary: str
    governance_notice: str
    participants: list[OrbDictateParticipant] = Field(default_factory=list)
    segments: list[OrbDictateTranscriptSegment] = Field(default_factory=list)
    speaker_summary: OrbDictateSpeakerSummary | None = None
    speaker_boundary_notice: str | None = None
    brain_metadata: dict[str, Any] | None = None


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


class OrbDictateEditRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    document_text: str = Field(..., min_length=1, max_length=500_000)
    instruction: str = Field(default="", max_length=4000)
    note_type: OrbDictateNoteType = "daily_record"
    mode: OrbDictateEditMode | None = None
    participants: list[OrbDictateParticipant] = Field(default_factory=list)
    segments: list[OrbDictateTranscriptSegment] = Field(default_factory=list)
    quality_checks: dict[str, Any] = Field(default_factory=dict)
    preserve_facts: bool = True
    standalone_boundary: bool = True
    template_id: str | None = Field(default=None, max_length=80)
    transcript_privacy_mode: str | None = Field(default="internal_working", max_length=40)
    working_transcript: str | None = Field(default=None, max_length=120_000)
    original_transcript: str | None = Field(default=None, max_length=120_000)
    redacted_transcript: str | None = Field(default=None, max_length=120_000)
    people_to_confirm: list[dict[str, Any]] = Field(default_factory=list)


class OrbDictateEditResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    revised_text: str
    change_summary: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    quality_checks: OrbDictateQualityChecks
    suggested_actions: list[str] = Field(default_factory=list)
    version_label: str
    standalone_boundary: str
    brain_metadata: dict[str, Any] | None = None


class OrbDictateAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_text: str = Field(..., min_length=1, max_length=120_000)
    note_type: OrbDictateNoteType = "daily_record"
    mode: OrbDictateMode | None = None
    record_type_id: str | None = Field(default=None, max_length=80)
    template_id: str | None = Field(default=None, max_length=80)


class OrbDictateBrainSuggestion(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    category: Literal["wording", "safeguarding", "missing", "action", "oversight", "evidence"] = "wording"
    label: str
    detail: str
    status: Literal["suggested", "accepted", "rejected", "applied"] = "suggested"


class OrbDictateAnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    detected_record_type: str
    record_type_id: str | None = None
    required_sections: list[str] = Field(default_factory=list)
    orb_will_check: list[str] = Field(default_factory=list)
    safeguarding_concerns: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    professional_wording_suggestions: list[OrbDictateBrainSuggestion] = Field(default_factory=list)
    recommended_next_actions: list[str] = Field(default_factory=list)
    possible_outputs: list[str] = Field(default_factory=list)
    recording_quality_score: Literal["good", "needs_review"] = "needs_review"
    recording_quality_guidance: str = ""
    child_voice_check: str = ""
    ofsted_evidence_check: str | None = None
    manager_oversight_note: str | None = None
    quality_checks: OrbDictateQualityChecks
    standalone_boundary: str
    brain_metadata: dict[str, Any] | None = None


class OrbDictatePrepareWriteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    note_type: OrbDictateNoteType = "daily_record"
    record_type_id: str | None = Field(default=None, max_length=80)
    template_id: str | None = Field(default=None, max_length=80)
    transcript: str = Field(default="", max_length=120_000)
    professional_note: str = Field(default="", max_length=500_000)
    missing_prompts: list[str] = Field(default_factory=list)


class OrbDictatePrepareWriteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    note_type: OrbDictateNoteType
    record_type_id: str | None = None
    record_type_label: str | None = None
    document_headings: list[str] = Field(default_factory=list)
    structured_body: str
    section_prompts: list[str] = Field(default_factory=list)
    quality_checks: OrbDictateQualityChecks
    standalone_boundary: str
    brain_metadata: dict[str, Any] | None = None


class OrbDictateFinaliseRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_text: str = Field(..., min_length=1, max_length=120_000)
    note_type: OrbDictateNoteType = "daily_record"
    mode: OrbDictateMode | None = None
    template_id: str | None = None
    record_type_id: str | None = Field(default=None, max_length=80)
    transcript: str | None = None
    accepted_suggestions: list[OrbDictateBrainSuggestion] = Field(default_factory=list)
    adult_edits: str | None = None
    participants: list[OrbDictateParticipant] = Field(default_factory=list)
    segments: list[OrbDictateTranscriptSegment] = Field(default_factory=list)
    include_child_voice: bool = True
    include_safeguarding: bool = True
    include_manager_oversight: bool = True
    include_actions: bool = True
    include_ofsted_lens: bool = False
    consent_confirmed: bool | None = None
    investigation_boundary_confirmed: bool | None = None


class OrbDictateFinaliseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    note_type: OrbDictateNoteType
    record_type_id: str | None = None
    record_type_label: str | None = None
    document_headings: list[str] = Field(default_factory=list)
    professional_note: str
    summary: str
    transcript: str
    quality_checks: OrbDictateQualityChecks
    review_required_statement: str
    standalone_boundary: str
    governance_notice: str
    timestamp: str
    template_id: str | None = None
    accepted_suggestions: list[OrbDictateBrainSuggestion] = Field(default_factory=list)
