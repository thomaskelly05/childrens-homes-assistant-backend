from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from schemas.orb_identity import OrbIdentityMetadata


OrbBrain = Literal[
    "care_brain",
    "inspector_brain",
    "general_assistant_brain",
    "web_research_brain",
    "productivity_brain",
    "report_writer_brain",
    "voice_recording_brain",
]
OrbSelectedMode = Literal["auto", "care", "inspector", "general"]
OrbState = Literal[
    "idle",
    "connecting",
    "passive_listening",
    "listening",
    "thinking",
    "speaking",
    "interrupted",
    "reconnecting",
    "offline",
    "muted",
    "unavailable",
    "permission_denied",
    "expired",
    "private",
    "recording",
    "dictation",
    "safeguarding_sensitive",
    "inspection",
    "error",
]
OrbActivationMode = Literal[
    "click_tap_orb",
    "push_to_talk",
    "press_to_talk",
    "keyboard_shortcut",
    "wake_word_placeholder",
    "hey_indicare_placeholder",
]
OrbEventType = Literal[
    "session_started",
    "user_text",
    "partial_transcript",
    "speech_started",
    "speech_stopped",
    "audio_delta",
    "response_started",
    "response_delta",
    "response_done",
    "silence_timeout",
    "reconnect",
    "wake_listening_started",
    "wake_listening_stopped",
    "wake_word_detected",
    "operational_event",
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

    profile_id: str = "amelia_british_female_calm"
    name: str = "Amelia"
    provider_voice: str = "shimmer"
    accent: str = "British female, neutral UK with a soft North East warmth where possible"
    tone: str = "calm, concise, warm, professional, emotionally steady and human"
    tone_profile: str = "british_female_calm_care_companion"
    product_name: str = "ORB powered by IndiCare"
    speed: str = "medium-slow"
    speaking_speed: str = "medium-slow"
    expressiveness: str = "natural, reassuring and lightly warm; never theatrical"
    use_case: str = "children's home operational voice support"
    voice_style: str | None = "british_female_care_companion"
    formality: str = "professional but human"
    accessibility_mode: bool = False
    quiet_mode: bool = False
    concise_mode: bool = False
    inspection_mode: bool = False


class OrbPreferences(BaseModel):
    model_config = ConfigDict(extra="allow")

    activation_mode: OrbActivationMode = "click_tap_orb"
    wake_phrase: str = "Hey IndiCare"
    voice_style: str = "british_female_care_companion"
    speaking_speed: str = "medium-slow"
    response_detail: Literal["concise", "balanced", "detailed"] = "concise"
    concise_answers: bool = True
    read_citations_aloud: bool = False
    show_citations: bool = True
    confirm_before_writing_records: bool = True
    quiet_mode: bool = False
    inspection_challenge_mode: bool = False
    safeguarding_sensitive_mode: bool = True
    private_mode: bool = False
    do_not_store_transcript: bool = False
    transcript_retention_days: int | None = 30
    quiet_hours: dict[str, Any] = Field(default_factory=dict)
    keyboard_shortcut: str = "Ctrl+Shift+Space"
    default_home_id: int | None = None
    default_shift_context: dict[str, Any] = Field(default_factory=dict)
    captions_enabled: bool = False
    privacy_mode_label: Literal["standard", "private", "do_not_store"] = "standard"
    wake_word_enabled: bool = False
    wake_word_local_only_acknowledged: bool = False
    headset_preference: Literal["system_default", "speaker", "headset", "bluetooth"] = "system_default"
    microphone_mode: Literal["push_to_talk", "open_mic"] = "push_to_talk"
    interruption_sensitivity: Literal["low", "medium", "high"] = "medium"
    ambient_noise_sensitivity: Literal["low", "medium", "high"] = "medium"


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
    current_child: dict[str, Any] = Field(default_factory=dict)
    current_shift: dict[str, Any] = Field(default_factory=dict)
    current_task: dict[str, Any] = Field(default_factory=dict)
    session_memory: dict[str, Any] = Field(default_factory=dict)
    operational_memory: dict[str, Any] = Field(default_factory=dict)
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
    identity_metadata: OrbIdentityMetadata | None = None


class OrbModeDecision(BaseModel):
    model_config = ConfigDict(extra="allow")

    brain: OrbBrain
    assistant_mode: str
    reason: str
    tone: str
    safety_flags: list[str] = Field(default_factory=list)
    requires_citations: bool = True
    requires_confirmation_before_write: bool = True
    requires_external_tool: bool = False
    allow_general_knowledge: bool = False
    care_scope_required: bool = True
    tool_categories: list[str] = Field(default_factory=list)
    memory_updates: dict[str, Any] = Field(default_factory=dict)
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
    tools_used: list[dict[str, Any]] = Field(default_factory=list)
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
    expires_at: str | None = None
    wake_phrase: str = "Hey IndiCare"
    voice_profile: OrbVoiceProfile
    preferences: OrbPreferences
    mode_decision: OrbModeDecision
    provider_session: dict[str, Any] = Field(default_factory=dict)
    realtime: dict[str, Any] = Field(default_factory=dict)
    realtime_state: dict[str, Any] = Field(default_factory=dict)
    memory_snapshot: dict[str, Any] = Field(default_factory=dict)
    wake_word: dict[str, Any] = Field(default_factory=dict)
    operational_event_subscriptions: dict[str, Any] = Field(default_factory=dict)
    transcript_storage_policy: dict[str, Any] = Field(default_factory=dict)
    identity_metadata: OrbIdentityMetadata | None = None


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
    tools_used: list[dict[str, Any]] = Field(default_factory=list)
    tool_orchestration: dict[str, Any] = Field(default_factory=dict)
    operational_insights: dict[str, Any] = Field(default_factory=dict)
    realtime_state: dict[str, Any] = Field(default_factory=dict)
    memory_snapshot: dict[str, Any] = Field(default_factory=dict)
    provider_event: dict[str, Any] = Field(default_factory=dict)
    identity_metadata: OrbIdentityMetadata | None = None


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
