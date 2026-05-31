from __future__ import annotations

"""Shared ORB Residential realtime voice event and capability schemas."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

VoiceProviderType = Literal[
    "browser_fallback",
    "websocket_realtime",
    "webrtc_realtime",
    "openai_realtime",
]
VoiceSessionStatus = Literal["ready", "not_configured", "error"]
VoiceLatencyClass = Literal["fallback", "standard", "realtime"]
VoiceTransportRequest = Literal["auto", "websocket", "webrtc", "openai", "browser_fallback"]

CLIENT_EVENT_TYPES = frozenset(
    {
        "session.start",
        "audio.chunk",
        "audio.end",
        "transcript.text",
        "user.interrupt",
        "session.stop",
        "ping",
    }
)

SERVER_EVENT_TYPES = frozenset(
    {
        "session.ready",
        "stt.partial",
        "stt.final",
        "assistant.delta",
        "tts.start",
        "tts.audio",
        "tts.end",
        "vad.speech_start",
        "vad.speech_end",
        "interrupted",
        "error",
        "pong",
    }
)


class VoiceProviderCapabilities(BaseModel):
    model_config = ConfigDict(extra="ignore")

    provider: str = "none"
    supportsStreamingStt: bool = False
    supportsStreamingTts: bool = False
    supportsBargeIn: bool = True
    supportsVad: bool = False
    supportsDuplex: bool = False
    supportsServerAudio: bool = False
    latencyClass: VoiceLatencyClass = "fallback"


class OrbVoiceSessionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mode: str = Field(default="conversational", max_length=80)
    voice_id: str = Field(default="orb_british_female", max_length=80)
    transport: VoiceTransportRequest = "auto"


class OrbVoiceOpenAISession(BaseModel):
    model_config = ConfigDict(extra="ignore")

    model: str | None = None
    client_secret: dict[str, Any] | None = None
    voice: str | None = None


class OrbVoiceSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    provider: VoiceProviderType
    status: VoiceSessionStatus
    mode: str = "conversational"
    voice_id: str = "orb_british_female"
    selected_voice_profile: str = "orb_british_female"
    profile_label: str | None = None
    provider_voice: str | None = None
    websocket_url: str | None = None
    webrtc_offer_url: str | None = None
    openai_session: OrbVoiceOpenAISession | None = None
    capabilities: VoiceProviderCapabilities
    message: str | None = None
    fallback_reason: str | None = None


class VoiceRealtimeEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: str
    session_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
    message: str | None = None


def validate_client_event(payload: dict[str, Any]) -> VoiceRealtimeEvent:
    event_type = str(payload.get("type") or "").strip()
    if event_type not in CLIENT_EVENT_TYPES:
        raise ValueError(f"Unsupported client event type: {event_type}")
    return VoiceRealtimeEvent(
        type=event_type,
        session_id=str(payload.get("session_id") or "").strip() or None,
        data=dict(payload.get("data") or payload.get("payload") or {}),
        message=payload.get("message"),
    )
