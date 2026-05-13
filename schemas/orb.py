from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


OrbBrain = Literal["care_assistant", "inspector"]
OrbSelectedMode = Literal["auto", "care", "inspector"]
OrbState = Literal[
    "idle",
    "listening",
    "thinking",
    "speaking",
    "interrupted",
    "muted",
    "private",
    "recording",
    "dictation",
    "safeguarding_sensitive",
    "inspection",
    "error",
]
OrbActivationMode = Literal["press_to_talk", "hey_indicare_placeholder", "keyboard_shortcut"]
OrbEventType = Literal[
    "session_started",
    "user_text",
    "partial_transcript",
    "speech_started",
    "speech_stopped",
    "assistant_turn",
    "interrupt",
    "mute",
    "unmute",
    "privacy_on",
    "privacy_off",
    "recording_on",
    "recording_off",
    "dictation_on",
    "dictation_off",
    "confirmation",
    "draft_saved",
    "draft_cancelled",
    "error",
]


class OrbVoiceProfile(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str = "IndiCare British Female"
    provider_voice: str = "shimmer"
    accent: str = "British"
    tone: str = "calm, warm, professional"
    speed: str = "medium"
    expressiveness: str = "natural but not theatrical"
    use_case: str = "children's home operational support"
    voice_style: str | None = None
    formality: str = "professional"
    accessibility_mode: bool = False
    quiet_mode: bool = False
    concise_mode: bool = False
    inspection_mode: bool = False


class OrbPreferences(BaseModel):
    model_config = ConfigDict(extra="allow")

    activation_mode: OrbActivationMode = "press_to_talk"
    wake_phrase: str = "Hey IndiCare"
    concise_answers: bool = True
    read_citations_aloud: bool = False
    show_citations: bool = True
    confirm_before_writing_records: bool = True
    safeguarding_sensitive_mode: bool = True
    private_mode: bool = False
    do_not_store_transcript: bool = False
    transcript_retention_days: int | None = 30
    quiet_hours: dict[str, Any] = Field(default_factory=dict)
    keyboard_shortcut: str = "Ctrl+Shift+Space"


class OrbContext(BaseModel):
    model_config = ConfigDict(extra="allow")

    route: str | None = None
    workspace: str | None = None
    page_title: str | None = None
    selected_young_person_id: int | None = None
    selected_record_id: str | None = None
    selected_record_type: str | None = None
    home_id: int | None = None
    home_scope: dict[str, Any] = Field(default_factory=dict)
    current_record_summary: str | None = None
    assistant_context: dict[str, Any] = Field(default_factory=dict)


class OrbSessionStartRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    selected_mode: OrbSelectedMode = "auto"
    current_state: OrbState = "idle"
    context: OrbContext = Field(default_factory=OrbContext)
    voice_profile: OrbVoiceProfile = Field(default_factory=OrbVoiceProfile)
    preferences: OrbPreferences = Field(default_factory=OrbPreferences)
    provider: str | None = None
    conversation_id: str | None = None
    workspace_context: dict[str, Any] = Field(default_factory=dict)


class OrbModeDecision(BaseModel):
    model_config = ConfigDict(extra="allow")

    brain: OrbBrain
    assistant_mode: str
    reason: str
    tone: str
    safety_flags: list[str] = Field(default_factory=list)
    requires_citations: bool = True
    requires_confirmation_before_write: bool = True
    selected_mode: OrbSelectedMode = "auto"


class OrbVoiceDraft(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    draft_type: str
    title: str
    content: str
    status: Literal["draft", "pending_confirmation", "approved", "cancelled"] = "pending_confirmation"
    requires_confirmation: bool = True
    source_citations: list[dict[str, Any]] = Field(default_factory=list)
    requested_action: str | None = None
    approved_by_user_id: int | None = None
    approved_at: str | None = None
    audit_note: str = "Voice-generated draft requires explicit adult approval before saving."


class OrbTranscriptEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    created_at: str
    state: OrbState = "idle"
    partial: bool = False
    interrupted: bool = False
    citations: list[dict[str, Any]] = Field(default_factory=list)
    mode_decision: OrbModeDecision | None = None
    draft: OrbVoiceDraft | None = None


class OrbSessionSummary(BaseModel):
    model_config = ConfigDict(extra="allow")

    session_id: str
    state: OrbState
    mode_decision: OrbModeDecision | None = None
    started_at: str
    ended_at: str | None = None
    transcript_entries: int = 0
    citations_used: list[dict[str, Any]] = Field(default_factory=list)
    records_retrieved: list[dict[str, Any]] = Field(default_factory=list)
    records_changed: list[dict[str, Any]] = Field(default_factory=list)
    pending_drafts: list[OrbVoiceDraft] = Field(default_factory=list)
    privacy: OrbPreferences = Field(default_factory=OrbPreferences)


class OrbSessionStartResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool = True
    session_id: str
    provider: str
    provider_configured: bool
    state: OrbState
    wake_phrase: str = "Hey IndiCare"
    voice_profile: OrbVoiceProfile
    preferences: OrbPreferences
    mode_decision: OrbModeDecision
    provider_session: dict[str, Any] = Field(default_factory=dict)
    realtime: dict[str, Any] = Field(default_factory=dict)
    transcript_storage_policy: dict[str, Any] = Field(default_factory=dict)


class OrbSessionEventRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: OrbEventType
    text: str | None = None
    partial: bool = False
    state: OrbState | None = None
    selected_mode: OrbSelectedMode | None = None
    context: OrbContext | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbSessionEventResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: bool = True
    session_id: str
    state: OrbState
    mode_decision: OrbModeDecision
    transcript: list[OrbTranscriptEntry] = Field(default_factory=list)
    assistant_turn: OrbTranscriptEntry | None = None
    pending_write_confirmation: OrbVoiceDraft | None = None
    citations: list[dict[str, Any]] = Field(default_factory=list)
    related_records: list[dict[str, Any]] = Field(default_factory=list)
    suggested_actions: list[dict[str, Any]] = Field(default_factory=list)
    evidence_gaps: list[dict[str, Any]] = Field(default_factory=list)
    regulatory_links: list[dict[str, Any]] = Field(default_factory=list)
    operational_insights: dict[str, Any] = Field(default_factory=dict)
    provider_event: dict[str, Any] = Field(default_factory=dict)


class OrbInterruptResponse(BaseModel):
    ok: bool = True
    session_id: str
    state: OrbState = "interrupted"
    message: str = "Orb was interrupted. The next user turn is now active."


class OrbTranscriptResponse(BaseModel):
    ok: bool = True
    session_id: str
    transcript: list[OrbTranscriptEntry] = Field(default_factory=list)
    storage_policy: dict[str, Any] = Field(default_factory=dict)

