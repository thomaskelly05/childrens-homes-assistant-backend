from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from schemas.orb import OrbContext, OrbState


ConversationPhase = Literal[
    "idle",
    "passive_listening",
    "listening",
    "processing",
    "speaking",
    "interrupted",
    "muted",
    "unavailable",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class OrbRealtimeConversationState:
    session_id: str
    transport: str
    supports_microphone_streaming: bool
    supports_audio_playback: bool
    supports_spoken_barge_in: bool
    supports_click_interrupt: bool = True
    phase: ConversationPhase = "idle"
    partial_user_transcript: str = ""
    partial_assistant_transcript: str = ""
    interrupted_response: str | None = None
    last_user_speech_at: str | None = None
    last_assistant_audio_at: str | None = None
    reconnect_attempts: int = 0
    turn_index: int = 0
    events: list[dict[str, Any]] = field(default_factory=list)

    def snapshot(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "transport": self.transport,
            "phase": self.phase,
            "turn_index": self.turn_index,
            "partial_user_transcript": self.partial_user_transcript,
            "partial_assistant_transcript": self.partial_assistant_transcript,
            "interrupted_response": self.interrupted_response,
            "last_user_speech_at": self.last_user_speech_at,
            "last_assistant_audio_at": self.last_assistant_audio_at,
            "reconnect_attempts": self.reconnect_attempts,
            "capabilities": {
                "microphone_streaming": self.supports_microphone_streaming,
                "audio_playback": self.supports_audio_playback,
                "spoken_barge_in": self.supports_spoken_barge_in,
                "click_interrupt": self.supports_click_interrupt,
                "partial_transcript_streaming": True,
                "server_vad": self.transport == "webrtc",
                "silence_detection": True,
            },
            "recent_events": self.events[-12:],
        }


class OrbRealtimeConversationService:
    """Tracks realtime conversation state around the provider transport.

    The browser owns WebRTC media transport; the backend owns the audited turn
    state that lets Orb recover from interruptions, reconnects, and follow-ups.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, OrbRealtimeConversationState] = {}

    def start_session(
        self,
        *,
        session_id: str,
        provider_name: str,
        provider_configured: bool,
        context: OrbContext,
    ) -> dict[str, Any]:
        transport = "webrtc" if provider_name == "openai_realtime" and provider_configured else "mock_text_voice"
        state = OrbRealtimeConversationState(
            session_id=session_id,
            transport=transport,
            supports_microphone_streaming=transport == "webrtc",
            supports_audio_playback=transport == "webrtc",
            supports_spoken_barge_in=transport == "webrtc",
            phase="idle",
        )
        state.events.append(
            {
                "type": "session_started",
                "created_at": _now(),
                "context": {
                    "workspace": context.workspace,
                    "home_id": context.home_id,
                    "selected_record_type": context.selected_record_type,
                },
            }
        )
        self.sessions[session_id] = state
        return state.snapshot()

    def get(self, session_id: str) -> OrbRealtimeConversationState | None:
        return self.sessions.get(session_id)

    def note_event(self, *, session_id: str, event_type: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        if event_type in {"speech_started", "recording_on"}:
            state.phase = "listening"
            state.last_user_speech_at = _now()
            state.partial_user_transcript = ""
        elif event_type == "speech_stopped":
            state.phase = "processing"
        elif event_type == "assistant_turn":
            state.phase = "speaking"
            state.last_assistant_audio_at = _now()
        elif event_type == "mute":
            state.phase = "muted"
        elif event_type == "unmute":
            state.phase = "idle"
        elif event_type == "silence_timeout":
            state.phase = "idle"
            state.partial_user_transcript = ""
        elif event_type == "wake_listening_started":
            state.phase = "passive_listening"
        elif event_type == "wake_listening_stopped":
            state.phase = "idle"
        elif event_type == "unavailable":
            state.phase = "unavailable"
        state.events.append({"type": event_type, "metadata": metadata or {}, "created_at": _now()})
        return state.snapshot()

    def partial_user_transcript(self, *, session_id: str, text: str) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.phase = "listening"
        state.partial_user_transcript = text[-2000:]
        state.last_user_speech_at = _now()
        state.events.append({"type": "partial_user_transcript", "characters": len(text), "created_at": _now()})
        return state.snapshot()

    def assistant_response_started(self, *, session_id: str) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.phase = "speaking"
        state.partial_assistant_transcript = ""
        state.last_assistant_audio_at = _now()
        state.events.append({"type": "assistant_response_started", "created_at": _now()})
        return state.snapshot()

    def assistant_response_delta(self, *, session_id: str, delta: str) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.phase = "speaking"
        state.partial_assistant_transcript = f"{state.partial_assistant_transcript}{delta}"[-4000:]
        state.last_assistant_audio_at = _now()
        return state.snapshot()

    def assistant_response_done(self, *, session_id: str) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.phase = "idle"
        state.turn_index += 1
        state.partial_user_transcript = ""
        state.partial_assistant_transcript = ""
        state.events.append({"type": "assistant_response_done", "turn_index": state.turn_index, "created_at": _now()})
        return state.snapshot()

    def interrupt(self, *, session_id: str, source: str = "click_or_barge_in") -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.phase = "interrupted"
        state.interrupted_response = state.partial_assistant_transcript or state.interrupted_response
        state.partial_assistant_transcript = ""
        state.events.append(
            {
                "type": "interrupt",
                "source": source,
                "created_at": _now(),
                "preserved_interrupted_response": bool(state.interrupted_response),
            }
        )
        return state.snapshot()

    def reconnect(self, *, session_id: str) -> dict[str, Any]:
        state = self.sessions.get(session_id)
        if not state:
            return {}
        state.reconnect_attempts += 1
        state.phase = "processing"
        state.events.append({"type": "reconnect", "attempt": state.reconnect_attempts, "created_at": _now()})
        return state.snapshot()

    def end_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)


def orb_state_from_realtime(phase: ConversationPhase, fallback: OrbState = "idle") -> OrbState:
    mapping: dict[ConversationPhase, OrbState] = {
        "idle": "idle",
        "passive_listening": "passive_listening",
        "listening": "listening",
        "processing": "thinking",
        "speaking": "speaking",
        "interrupted": "interrupted",
        "muted": "muted",
        "unavailable": "unavailable",
    }
    return mapping.get(phase, fallback)


orb_realtime_conversation_service = OrbRealtimeConversationService()
