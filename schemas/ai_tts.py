"""TTS governance and synthesis schemas (NR-1 Phase 2B)."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.data_protection import AIPrivacyDecision


class TtsProviderName(StrEnum):
    OPENAI = "openai"
    ELEVENLABS = "elevenlabs"
    MOCK = "mock"


FEATURE_ORB_PREMIUM_TTS = "orb_premium_tts"


class AiTtsGovernanceContext(BaseModel):
    """Safe governance metadata for governed TTS egress (no raw spoken text)."""

    model_config = ConfigDict(extra="ignore")

    feature: str
    surface: str
    route: str
    source: str
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int | None = None
    text_len: int
    redaction_applied: bool
    privacy_decision: AIPrivacyDecision
    provider_preference: str | None = None
    voice_id: str | None = None
    voice_style: str | None = None
    model: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _require_tts_governance_fields(self) -> "AiTtsGovernanceContext":
        if not str(self.feature or "").strip():
            raise ValueError("governance feature is required")
        if not str(self.surface or "").strip():
            raise ValueError("governance surface is required")
        if not str(self.route or "").strip():
            raise ValueError("governance route is required")
        if not str(self.source or "").strip():
            raise ValueError("governance source is required")
        if self.feature != FEATURE_ORB_PREMIUM_TTS:
            raise ValueError("tts_feature_invalid")
        if self.text_len < 1:
            raise ValueError("governance text_len is required")
        return self


class AiTtsSynthesisRequest(BaseModel):
    """Provider synthesis input after Phase 2A redaction/minimisation."""

    model_config = ConfigDict(extra="ignore")

    text: str
    provider: TtsProviderName
    model: str
    voice_id: str
    voice_style: str
    audio_format: str = "mp3"
    speed: float | None = None
    openai_voice: str | None = None
    elevenlabs_voice_id: str | None = None
    timeout_seconds: float = 20.0
    context: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiTtsSynthesisResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audio_bytes: bytes
    content_type: str
    provider: TtsProviderName
    model: str
    voice_id: str
    latency_ms: int
    audio_bytes_len: int
    error: str | None = None
    error_code: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
