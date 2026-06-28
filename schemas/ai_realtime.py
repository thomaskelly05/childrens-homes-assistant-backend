"""Realtime session governance and provider schemas (NR-1 Phase 2C)."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.data_protection import AIPrivacyDecision


class RealtimeProviderName(StrEnum):
    OPENAI = "openai"
    MOCK = "mock"


class AiRealtimeSessionPurpose(StrEnum):
    ORB_VOICE_CONVERSATIONAL = "orb_voice_conversational"
    ORB_VOICE_TRANSCRIPTION = "orb_voice_transcription"
    ORB_DICTATE_TRANSCRIPTION = "orb_dictate_transcription"
    ORB_OPERATIONAL_CONVERSATIONAL = "orb_operational_conversational"


FEATURE_ORB_REALTIME_VOICE_SESSION = "orb_realtime_voice_session"
FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION = "orb_realtime_transcription_session"
FEATURE_ORB_DICTATE_REALTIME_SESSION = "orb_dictate_realtime_session"
FEATURE_ORB_OPERATIONAL_REALTIME_SESSION = "orb_operational_realtime_session"

REALTIME_GOVERNANCE_CLASSIFICATION = "external_ai_realtime_session"

ALLOWED_REALTIME_FEATURES = frozenset(
    {
        FEATURE_ORB_REALTIME_VOICE_SESSION,
        FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION,
        FEATURE_ORB_DICTATE_REALTIME_SESSION,
        FEATURE_ORB_OPERATIONAL_REALTIME_SESSION,
    }
)

PURPOSE_TO_FEATURE: dict[str, str] = {
    AiRealtimeSessionPurpose.ORB_VOICE_CONVERSATIONAL.value: FEATURE_ORB_REALTIME_VOICE_SESSION,
    AiRealtimeSessionPurpose.ORB_VOICE_TRANSCRIPTION.value: FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION,
    AiRealtimeSessionPurpose.ORB_DICTATE_TRANSCRIPTION.value: FEATURE_ORB_DICTATE_REALTIME_SESSION,
    AiRealtimeSessionPurpose.ORB_OPERATIONAL_CONVERSATIONAL.value: FEATURE_ORB_OPERATIONAL_REALTIME_SESSION,
}


class AiRealtimeGovernanceContext(BaseModel):
    """Safe governance metadata for governed realtime session egress (no raw instructions)."""

    model_config = ConfigDict(extra="ignore")

    feature: str
    surface: str
    route: str
    purpose: str
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int | None = None
    instructions_len: int
    orb_session_id: str | None = None
    privacy_decision: AIPrivacyDecision | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_realtime_governance(self) -> "AiRealtimeGovernanceContext":
        if not str(self.feature or "").strip():
            raise ValueError("governance feature is required")
        if not str(self.surface or "").strip():
            raise ValueError("governance surface is required")
        if not str(self.route or "").strip():
            raise ValueError("governance route is required")
        if self.feature not in ALLOWED_REALTIME_FEATURES:
            raise ValueError("realtime_feature_invalid")
        if self.instructions_len < 0:
            raise ValueError("governance instructions_len is required")
        return self


class AiRealtimeSessionRequest(BaseModel):
    """Provider realtime session input after governance redaction."""

    model_config = ConfigDict(extra="ignore")

    provider: RealtimeProviderName
    model: str
    instructions: str
    purpose: str
    voice: str | None = None
    transcription_only: bool = False
    orb_session_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiRealtimeSessionResponse(BaseModel):
    """Client-safe ephemeral realtime session payload."""

    model_config = ConfigDict(extra="forbid")

    configured: bool
    provider: RealtimeProviderName
    model: str | None = None
    session: dict[str, Any] | None = None
    voice: str | None = None
    expires_at: Any | None = None
    issued_at: str | None = None
    provider_latency_ms: float | None = None
    provider_endpoint: str | None = None
    refresh_recommended_seconds: int | None = None
    fallback_text_mode: bool = False
    retryable: bool = False
    retry_after_seconds: int | None = None
    error: str | None = None
    error_code: str | None = None
    unavailable_reason: str | None = None
    status: int | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
