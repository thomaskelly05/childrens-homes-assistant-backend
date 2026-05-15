from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from schemas.orb import OrbContext, OrbState
from services.orb_conversation_policy import orb_conversation_policy
from services.orb_session_store import orb_session_store
from services.realtime_scaling_service import realtime_scaling_service


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


def _normalised_child_id(value: Any) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


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
    last_phase_changed_at: str = field(default_factory=_now)
    silence_awareness: dict[str, Any] = field(default_factory=dict)
    emotional_cadence: dict[str, Any] = field(default_factory=dict)
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
            "last_phase_changed_at": self.last_phase_changed_at,
            "silence_awareness": self.silence_awareness,
            "emotional_cadence": self.emotional_cadence,
            "reconnect_attempts": self.reconnect_attempts,
            "temporary_conversational_memory": self.temporary_conversational_memory,
            "active_context_references": self.active_context_references,
            "selected_young_person_id": self.active_context_references.get("selected_young_person_id"),
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
                "response_chunk_pacing": True,
                "reconnect_continuation": True,
                "child_scope_reconciliation": True,
            },
            "realtime_continuity": realtime_scaling_service.reconnect_plan(
                attempts=self.reconnect_attempts,
                last_sequence=self.turn_index,
            ),
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
            last_phase_changed_at=payload.get("last_phase_changed_at") or _now(),
            silence_awareness=dict(payload.get("silence_awareness") or {}),
            emotional_cadence=dict(payload.get("emotional_cadence") or {}),
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
                    "selected_young_person_id": context.selected_young_person_id,
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
            if state.phase == "speaking" and state.partial_assistant_transcript:
                state.interrupted_response = state.partial_assistant_transcript
                state.partial_assistant_transcript = ""
                state.events.append(
                    {
                        "type": "conversational_overlap_smoothed",
                        "created_at": _now(),
                        "preserved_interrupted_response": True,
                        "repair_style": "stop_speaking_and_follow_user",
                    }
                )
            state.phase = "listening"
            state.last_phase_changed_at = _now()
            state.last_user_speech_at = _now()
            state.partial_user_transcript = ""
        elif event_type == "speech_stopped":
            state.phase = "processing"
            state.last_phase_changed_at = _now()
        elif event_type == "assistant_turn":
            state.phase = "speaking"
            state.last_phase_changed_at = _now()
            state.last_assistant_audio_at = _now()
        elif event_type == "mute":
            state.phase = "muted"
            state.last_phase_changed_at = _now()
        elif event_type == "unmute":
            state.phase = "idle"
            state.last_phase_changed_at = _now()
        elif event_type == "silence_timeout":
            state.phase = "idle"
            state.last_phase_changed_at = _now()
            state.partial_user_transcript = ""
            cadence = metadata.get("emotional_cadence") if isinstance(metadata, dict) else {}
            state.silence_awareness = {
                "last_timeout_at": _now(),
                "prompt": (cadence or {}).get("silence_prompt") or "Take your time.",
                "recovered_without_losing_context": True,
                "response_style": "present_without_pushing",
            }
        elif event_type == "wake_listening_started":
            state.phase = "passive_listening"
            state.last_phase_changed_at = _now()
        elif event_type == "wake_listening_stopped":
            state.phase = "idle"
            state.last_phase_changed_at = _now()
        elif event_type == "unavailable":
            state.phase = "unavailable"
            state.last_phase_changed_at = _now()
        elif event_type == "offline":
            state.phase = "offline"
            state.last_phase_changed_at = _now()
        elif event_type == "permission_denied":
            state.phase = "permission_denied"
            state.last_phase_changed_at = _now()
        elif event_type == "expired":
            state.phase = "expired"
            state.last_phase_changed_at = _now()
        if metadata:
            active_context = metadata.get("active_context_references") or metadata.get("context")
            if isinstance(active_context, dict):
                if self._context_matches_child_scope(state, active_context):
                    state.active_context_references.update(active_context)
                else:
                    state.events.append({
                        "type": "context_scope_rejected",
                        "created_at": _now(),
                        "reason": "Realtime context attempted to switch child inside a bound Orb session.",
                    })
            pending_tool_plan = metadata.get("pending_tool_plan")
            if isinstance(pending_tool_plan, dict):
                state.pending_tool_plans.append(pending_tool_plan)
            cadence = metadata.get("emotional_cadence")
            if isinstance(cadence, dict):
                state.emotional_cadence.update(cadence)
        state.events.append({"type": event_type, "metadata": metadata or {}, "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def _context_matches_child_scope(self, state: OrbRealtimeConversationState, active_context: dict[str, Any]) -> bool:
        current_child = _normalised_child_id(state.active_context_references.get("selected_young_person_id"))
        incoming_child = _normalised_child_id(active_context.get("selected_young_person_id"))
        return not current_child or not incoming_child or current_child == incoming_child

    def partial_user_transcript(self, *, session_id: str, text: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "listening"
        state.last_phase_changed_at = _now()
        state.partial_user_transcript = text[-2000:]
        state.last_user_speech_at = _now()
        state.events.append({"type": "partial_user_transcript", "characters": len(text), "created_at": _now()})
        self._persist(state)
        return state.snapshot()

    def reconcile_user_transcript(self, *, session_id: str, final_text: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {"text": final_text, "reconciled": False}
        partial = state.partial_user_transcript.strip()
        final = final_text.strip()
        reconciled = final
        if partial and final and not final.lower().startswith(partial.lower()) and partial.lower() not in final.lower():
            reconciled = f"{partial} {final}".strip()
        elif partial and not final:
            reconciled = partial
        state.temporary_conversational_memory["last_reconciled_user_text"] = reconciled
        state.events.append(
            {
                "type": "transcript_reconciled",
                "created_at": _now(),
                "partial_characters": len(partial),
                "final_characters": len(final),
                "changed": reconciled != final,
            }
        )
        self._persist(state)
        return {"text": reconciled, "reconciled": True, "changed": reconciled != final, "partial": partial}

    def assistant_response_started(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "speaking"
        state.last_phase_changed_at = _now()
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
        state.last_phase_changed_at = _now()
        state.partial_assistant_transcript = f"{state.partial_assistant_transcript}{delta}"[-4000:]
        state.last_assistant_audio_at = _now()
        if not any(event.get("type") == "assistant_first_partial" for event in state.events[-4:]):
            state.events.append({"type": "assistant_first_partial", "created_at": _now(), "characters": len(delta)})
        self._persist(state)
        return state.snapshot()

    def assistant_response_done(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        state.phase = "idle"
        state.last_phase_changed_at = _now()
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
        state.last_phase_changed_at = _now()
        state.interrupted_response = state.partial_assistant_transcript or state.interrupted_response
        state.partial_assistant_transcript = ""
        state.events.append(
            {
                "type": "interrupt",
                "source": source,
                "created_at": _now(),
                "preserved_interrupted_response": bool(state.interrupted_response),
                "continuation_ready": bool(state.interrupted_response),
                "continuation_prompt": orb_conversation_policy.continuation_prompt(
                    interrupted_response=state.interrupted_response,
                    user_text=state.partial_user_transcript,
                ),
                "repair_style": "pause_resume_from_user_intent",
            }
        )
        self._persist(state)
        return state.snapshot()

    def reconnect(self, *, session_id: str) -> dict[str, Any]:
        state = self.get(session_id)
        if not state:
            return {}
        previous_phase = state.phase
        state.reconnect_attempts += 1
        state.phase = "reconnecting"
        state.last_phase_changed_at = _now()
        state.events.append({
            "type": "reconnect",
            "attempt": state.reconnect_attempts,
            "created_at": _now(),
            "continuity": realtime_scaling_service.reconnect_plan(
                attempts=state.reconnect_attempts,
                last_sequence=state.turn_index,
            ),
            "context_continuation": {
                "selected_young_person_id": state.active_context_references.get("selected_young_person_id"),
                "last_phase": previous_phase,
                "resume_without_cross_child_lookup": True,
                "interrupted_response_available": bool(state.interrupted_response),
                "continuity_message": "Reconnecting without changing the active child context.",
                "user_copy": "Voice paused. I can continue in text while audio reconnects.",
            },
        })
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
