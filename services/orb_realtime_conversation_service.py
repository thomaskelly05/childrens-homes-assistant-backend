from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from schemas.orb import OrbContext, OrbState
from services.orb_session_store import orb_session_store


ConversationPhase = Literal[
    "idle",
    "connecting",
    "passive_listening",
    "listening",
    "processing",
    "speaking",
    "interrupted",
    "reconnecting",
    "offline",
    "muted",
    "unavailable",
    "permission_denied",
    "expired",
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
    home_id: int | None = None
    user_id: int | None = None
    supports_click_interrupt: bool = True
    phase: ConversationPhase = "idle"
    partial_user_transcript: str = ""
    partial_assistant_transcript: str = ""
    interrupted_response: str | None = None
    last_user_speech_at: str | None = None
    last_assistant_audio_at: str | None = None
    reconnect_attempts: int = 0
    turn_index: int = 0
    temporary_conversational_memory: dict[str, Any] = field(default_factory=dict)
    active_context_references: dict[str, Any] = field(default_factory=dict)
    pending_tool_plans: list[dict[str, Any]] = field(default_factory=list)
    operational_context_snapshot: dict[str, Any] = field(default_factory=dict)
    active_websocket_bindings: list[dict[str, Any]] = field(default_factory=list)
    events: list[dict[str, Any]] = field(default_factory=list)

    def snapshot(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "home_id": self.home_id,
            "transport": self.transport,
            "phase": self.phase,
            "turn_index": self.turn_index,
            "partial_user_transcript": self.partial_user_transcript,
            "partial_assistant_transcript": self.partial_assistant_transcript,
            "interrupted_response": self.interrupted_response,
            "last_user_speech_at": self.last_user_speech_at,
            "last_assistant_audio_at": self.last_assistant_audio_at,
            "reconnect_attempts": self.reconnect_attempts,
            "temporary_conversational_memory": self.temporary_conversational_memory,
            "active_context_references": self.active_context_references,
            "pending_tool_plans": self.pending_tool_plans[-5:],
            "operational_context_snapshot": self.operational_context_snapshot,
            "active_websocket_bindings": self.active_websocket_bindings[-3:],
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

    @classmethod
    def from_snapshot(cls, payload: dict[str, Any]) -> "OrbRealtimeConversationState":
        capabilities = payload.get("capabilities") or {}
        state = cls(
            session_id=str(payload["session_id"]),
            transport=str(payload.get("transport") or "mock_text_voice"),
            supports_microphone_streaming=bool(capabilities.get("microphone_streaming")),
            supports_audio_playback=bool(capabilities.get("audio_playback")),
            supports_spoken_barge_in=bool(capabilities.get("spoken_barge_in")),
            supports_click_interrupt=bool(capabilities.get("click_interrupt", True)),
            home_id=payload.get("home_id"),
            phase=payload.get("phase") or "idle",
            partial_user_transcript=payload.get("partial_user_transcript") or "",
            partial_assistant_transcript=payload.get("partial_assistant_transcript") or "",
            interrupted_response=payload.get("interrupted_response"),
            last_user_speech_at=payload.get("last_user_speech_at"),
            last_assistant_audio_at=payload.get("last_assistant_audio_at"),
            reconnect_attempts=int(payload.get("reconnect_attempts") or 0),
            turn_index=int(payload.get("turn_index") or 0),
            temporary_conversational_memory=dict(payload.get("temporary_conversational_memory") or {}),
            active_context_references=dict(payload.get("active_context_references") or {}),
            pending_tool_plans=list(payload.get("pending_tool_plans") or []),
            operational_context_snapshot=dict(payload.get("operational_context_snapshot") or {}),
            active_websocket_bindings=list(payload.get("active_websocket_bindings") or []),
            events=list(payload.get("recent_events") or []),
        )
        return state


class OrbRealtimeConversationService:
    """Tracks realtime conversation state around the provider transport.

    The browser owns WebRTC media transport; the backend owns the audited turn
    state that lets Orb recover from interruptions, reconnects, and follow-ups.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, OrbRealtimeConversationState] = {}

    def _persist(self, state: OrbRealtimeConversationState) -> None:
        state.active_websocket_bindings = orb_session_store.socket_bindings(state.session_id)
        orb_session_store.save_realtime_state(session_id=state.session_id, state=state.snapshot())

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
            home_id=context.home_id,
            phase="idle",
            active_context_references={
                "workspace": context.workspace,
                "home_id": context.home_id,
                "selected_young_person_id": context.selected_young_person_id,
                "selected_record_id": context.selected_record_id,
                "selected_record_type": context.selected_record_type,
            },
            temporary_conversational_memory=dict(context.session_memory or {}),
            operational_context_snapshot=dict(context.operational_memory or {}),
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
        self._persist(state)
        return state.snapshot()

    def get(self, session_id: str) -> OrbRealtimeConversationState | None:
        state = self.sessions.get(session_id)
        if state:
            state.active_websocket_bindings = orb_session_store.socket_bindings(session_id)
            return state
        payload = orb_session_store.load_realtime_state(session_id)
        if not payload:
            return None
        state = OrbRealtimeConversationState.from_snapshot(payload)
        self.sessions[session_id] = state
        return state

    def note_event(self, *, session_id: str, event_type: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        state = self.get(session_id)
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
        elif event_type == "offline":
            state.phase = "offline"
        elif event_type == "permission_denied":
            state.phase = "permission_denied"
        elif event_type == "expired":
            state.phase = "expired"
        if metadata:
            active_context = metadata.get("active_context_references") or metadata.get("context")
            if isinstance(active_context, dict):
                state.active_context_references.update(active_context)
            pending_tool_plan = metadata.get("pending_tool_plan")
            if isinstance(pending_tool_plan, dict):
                state.pending_tool_plans.append(pending_tool_plan)
        state.events.append({"type": event_type, "metadata": metadata or {}, "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def partial_user_transcript(self, *, session_id: str, text: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "listening"
        state.partial_user_transcript = text[-2000:]
        state.last_user_speech_at = _now()
        state.events.append({"type": "partial_user_transcript", "characters": len(text), "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def assistant_response_started(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "speaking"
        state.partial_assistant_transcript = ""
        state.last_assistant_audio_at = _now()
        state.events.append({"type": "assistant_response_started", "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def assistant_response_delta(self, *, session_id: str, delta: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "speaking"
        state.partial_assistant_transcript = f"{state.partial_assistant_transcript}{delta}"[-4000:]
        state.last_assistant_audio_at = _now()
        self._persist(state)
        return state.snapshot()

    def assistant_response_done(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "idle"
        state.turn_index += 1
        state.partial_user_transcript = ""
        state.partial_assistant_transcript = ""
        state.events.append({"type": "assistant_response_done", "turn_index": state.turn_index, "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def interrupt(self, *, session_id: str, source: str = "click_or_barge_in") -> dict[str, Any]:
        state = self.get(session_id)
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
        self._persist(state)
        return state.snapshot()

    def reconnect(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.reconnect_attempts += 1
        state.phase = "reconnecting"
        state.events.append({"type": "reconnect", "attempt": state.reconnect_attempts, "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def end_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)
        orb_session_store.delete_realtime_state(session_id)


def orb_state_from_realtime(phase: ConversationPhase, fallback: OrbState = "idle") -> OrbState:
    mapping: dict[ConversationPhase, OrbState] = {
        "idle": "idle",
        "connecting": "connecting",
        "passive_listening": "passive_listening",
        "listening": "listening",
        "processing": "thinking",
        "speaking": "speaking",
        "interrupted": "interrupted",
        "reconnecting": "reconnecting",
        "offline": "offline",
        "muted": "muted",
        "unavailable": "unavailable",
        "permission_denied": "permission_denied",
        "expired": "expired",
    }
    return mapping.get(phase, fallback)


orb_realtime_conversation_service = OrbRealtimeConversationService()
