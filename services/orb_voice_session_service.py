from __future__ import annotations

import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol

import httpx

from schemas.orb import (
    OrbContext,
    OrbInterruptResponse,
    OrbModeDecision,
    OrbPreferences,
    OrbSelectedMode,
    OrbSessionEventRequest,
    OrbSessionEventResponse,
    OrbSessionStartRequest,
    OrbSessionStartResponse,
    OrbSessionSummary,
    OrbState,
    OrbTranscriptEntry,
    OrbTranscriptResponse,
    OrbVoiceDraft,
    OrbVoiceProfile,
)
from services.assistant_context_service import build_shared_assistant_context
from services.assistant_prompt_policy import assert_safe_assistant_message
from services.assistant_response_service import AssistantResponseService
from services.audit_event_service import record_audit_event
from services.operational_intelligence_service import build_orb_operational_intelligence_snapshot
from services.orb_mode_router import route_orb_mode
from services.orb_persona_policy import persona_instruction, spoken_acknowledgement, transcript_storage_policy


OPENAI_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/sessions"
DEFAULT_REALTIME_MODEL = os.getenv("INDICARE_REALTIME_MODEL", "gpt-4o-realtime-preview")
ALLOWED_SYNTHETIC_VOICES = {"alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"}
WRITE_INTENT_TERMS = {
    "create",
    "save",
    "assign",
    "mark complete",
    "complete this action",
    "write a record",
    "daily note",
    "incident record",
    "safeguarding record",
    "turn this into",
    "link this to",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _user_id(current_user: dict[str, Any]) -> int | None:
    try:
        value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
        return int(value) if value is not None else None
    except Exception:
        return None


def _provider_voice(profile: OrbVoiceProfile) -> str:
    voice = str(profile.provider_voice or "shimmer").strip().lower()
    return voice if voice in ALLOWED_SYNTHETIC_VOICES else "shimmer"


def _assistant_context_from_orb(context: OrbContext, decision: OrbModeDecision, conversation_id: str | None) -> dict[str, Any]:
    base = dict(context.assistant_context or {})
    base.update(
        {
            "route": context.route or base.get("route"),
            "current_route": context.route or base.get("current_route"),
            "workspace_type": context.workspace or base.get("workspace_type"),
            "current_workspace_type": context.workspace or base.get("current_workspace_type"),
            "page_title": context.page_title or base.get("page_title"),
            "selected_young_person_id": context.selected_young_person_id or base.get("selected_young_person_id"),
            "selected_record_id": context.selected_record_id or base.get("selected_record_id"),
            "selected_record_type": context.selected_record_type or base.get("selected_record_type"),
            "home_id": context.home_id or base.get("home_id"),
            "home_scope": context.home_scope or base.get("home_scope"),
            "selected_record_summary": context.current_record_summary or base.get("selected_record_summary"),
            "conversation_id": conversation_id or base.get("conversation_id"),
            "assistant_mode": decision.assistant_mode,
            "assistant_surface": "orb",
        }
    )
    return {key: value for key, value in base.items() if value not in (None, "", [], {})}


def _write_intent(message: str) -> bool:
    text = message.lower()
    return any(term in text for term in WRITE_INTENT_TERMS)


def _draft_type(message: str) -> str:
    text = message.lower()
    if "safeguarding" in text:
        return "safeguarding_record"
    if "incident" in text:
        return "incident_record"
    if "action" in text or "assign" in text:
        return "action"
    if "handover" in text:
        return "handover"
    return "care_record"


class VoiceProvider(Protocol):
    name: str

    def configured(self) -> bool:
        ...

    async def start_session(self, *, request: OrbSessionStartRequest, decision: OrbModeDecision, current_user: dict[str, Any]) -> dict[str, Any]:
        ...

    async def event(self, *, session_id: str, event: OrbSessionEventRequest) -> dict[str, Any]:
        ...

    async def interrupt(self, *, session_id: str) -> dict[str, Any]:
        ...

    async def end(self, *, session_id: str) -> dict[str, Any]:
        ...


class MockVoiceProvider:
    name = "mock_voice"

    def configured(self) -> bool:
        return True

    async def start_session(self, *, request: OrbSessionStartRequest, decision: OrbModeDecision, current_user: dict[str, Any]) -> dict[str, Any]:
        return {
            "provider": self.name,
            "mock": True,
            "transport": "browser_media_recorder_text_fallback",
            "instructions": persona_instruction(decision, request.voice_profile),
            "supports_interruptions": True,
            "supports_partial_transcript": True,
        }

    async def event(self, *, session_id: str, event: OrbSessionEventRequest) -> dict[str, Any]:
        return {"provider": self.name, "accepted": True, "event_type": event.type, "session_id": session_id}

    async def interrupt(self, *, session_id: str) -> dict[str, Any]:
        return {"provider": self.name, "interrupted": True, "session_id": session_id}

    async def end(self, *, session_id: str) -> dict[str, Any]:
        return {"provider": self.name, "ended": True, "session_id": session_id}


class OpenAIRealtimeVoiceProvider:
    name = "openai_realtime"

    def configured(self) -> bool:
        return bool(os.getenv("OPENAI_API_KEY"))

    async def start_session(self, *, request: OrbSessionStartRequest, decision: OrbModeDecision, current_user: dict[str, Any]) -> dict[str, Any]:
        api_key = os.getenv("OPENAI_API_KEY")
        body = {
            "model": DEFAULT_REALTIME_MODEL,
            "voice": _provider_voice(request.voice_profile),
            "instructions": persona_instruction(decision, request.voice_profile),
            "modalities": ["audio", "text"],
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.48,
                "prefix_padding_ms": 280,
                "silence_duration_ms": 520,
            },
        }
        if not api_key:
            return {"provider": self.name, "configured": False, "env_gated": True, "request_body": body}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                OPENAI_REALTIME_SESSION_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "OpenAI-Beta": "realtime=v1",
                },
                json=body,
            )
        if response.status_code >= 400:
            return {"provider": self.name, "configured": True, "error": "realtime_session_failed", "status": response.status_code}
        return {"provider": self.name, "configured": True, "session": response.json(), "model": DEFAULT_REALTIME_MODEL, "voice": body["voice"]}

    async def event(self, *, session_id: str, event: OrbSessionEventRequest) -> dict[str, Any]:
        return {"provider": self.name, "accepted": True, "event_type": event.type, "session_id": session_id}

    async def interrupt(self, *, session_id: str) -> dict[str, Any]:
        return {"provider": self.name, "interrupted": True, "session_id": session_id}

    async def end(self, *, session_id: str) -> dict[str, Any]:
        return {"provider": self.name, "ended": True, "session_id": session_id}


@dataclass
class OrbSessionRecord:
    id: str
    user_id: int | None
    current_user: dict[str, Any]
    context: OrbContext
    preferences: OrbPreferences
    voice_profile: OrbVoiceProfile
    selected_mode: OrbSelectedMode
    mode_decision: OrbModeDecision
    provider_name: str
    state: OrbState
    started_at: str = field(default_factory=_now)
    ended_at: str | None = None
    transcript: list[OrbTranscriptEntry] = field(default_factory=list)
    pending_drafts: list[OrbVoiceDraft] = field(default_factory=list)
    citations_used: list[dict[str, Any]] = field(default_factory=list)
    related_records: list[dict[str, Any]] = field(default_factory=list)
    records_changed: list[dict[str, Any]] = field(default_factory=list)


class OrbVoiceSessionService:
    """In-memory Orb voice/session foundation layered over the shared assistant core.

    The store is intentionally process-local for the first foundation. Durable transcript
    storage and retention enforcement can later replace this without changing the route contract.
    """

    def __init__(self, assistant_response_service: AssistantResponseService | None = None) -> None:
        self.assistant_response_service = assistant_response_service or AssistantResponseService()
        self.sessions: dict[str, OrbSessionRecord] = {}
        self.providers: dict[str, VoiceProvider] = {
            "openai_realtime": OpenAIRealtimeVoiceProvider(),
            "mock_voice": MockVoiceProvider(),
        }

    def _provider(self, requested: str | None = None) -> VoiceProvider:
        if requested and requested in self.providers:
            provider = self.providers[requested]
            if provider.configured() or requested == "mock_voice":
                return provider
        openai = self.providers["openai_realtime"]
        return openai if openai.configured() else self.providers["mock_voice"]

    def get_session(self, session_id: str) -> OrbSessionRecord:
        session = self.sessions.get(session_id)
        if not session:
            raise KeyError(session_id)
        return session

    async def start_session(self, *, request: OrbSessionStartRequest, current_user: dict[str, Any]) -> OrbSessionStartResponse:
        session_id = _id("orb_session")
        decision = route_orb_mode(message=None, current_user=current_user, selected_mode=request.selected_mode, context=request.context)
        provider = self._provider(request.provider)
        provider_session = await provider.start_session(request=request, decision=decision, current_user=current_user)
        state: OrbState = "private" if request.preferences.private_mode else request.current_state
        session = OrbSessionRecord(
            id=session_id,
            user_id=_user_id(current_user),
            current_user=current_user,
            context=request.context,
            preferences=request.preferences,
            voice_profile=request.voice_profile,
            selected_mode=request.selected_mode,
            mode_decision=decision,
            provider_name=provider.name,
            state=state,
        )
        session.transcript.append(
            OrbTranscriptEntry(
                id=_id("orb_turn"),
                role="system",
                content="Orb session started. Wake phrase foundation: Hey IndiCare. Raw audio is not stored by default.",
                created_at=_now(),
                state=state,
                mode_decision=decision,
            )
        )
        self.sessions[session_id] = session
        record_audit_event(
            event_type="orb_voice_session",
            action="start",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata={
                "mode": decision.model_dump(),
                "workspace_context": request.workspace_context,
                "provider": provider.name,
                "raw_audio_stored": False,
                "transcript_policy": transcript_storage_policy(
                    request.preferences.do_not_store_transcript,
                    request.preferences.transcript_retention_days,
                ),
            },
        )
        return OrbSessionStartResponse(
            session_id=session_id,
            provider=provider.name,
            provider_configured=provider.configured(),
            state=state,
            voice_profile=request.voice_profile,
            preferences=request.preferences,
            mode_decision=decision,
            provider_session=provider_session,
            realtime={
                "transport": "webrtc" if provider.name == "openai_realtime" and provider.configured() else "mock_text_voice",
                "supports_interruptions": True,
                "fallback_text_mode": True,
                "wake_phrase_foundation": "Hey IndiCare placeholder; real wake-word detection is not enabled server-side.",
            },
            transcript_storage_policy=transcript_storage_policy(
                request.preferences.do_not_store_transcript,
                request.preferences.transcript_retention_days,
            ),
        )

    async def handle_event(
        self,
        *,
        session_id: str,
        event: OrbSessionEventRequest,
        conn: Any,
        current_user: dict[str, Any],
    ) -> OrbSessionEventResponse:
        session = self.get_session(session_id)
        context = event.context or session.context
        selected_mode = event.selected_mode or session.selected_mode
        message = event.text or ""
        decision = route_orb_mode(message=message, current_user=current_user, selected_mode=selected_mode, context=context)
        session.mode_decision = decision
        session.context = context
        session.selected_mode = selected_mode
        provider_event = await self._provider(session.provider_name).event(session_id=session_id, event=event)

        if event.type == "partial_transcript":
            session.state = "listening"
            if message and not session.preferences.do_not_store_transcript:
                session.transcript.append(
                    OrbTranscriptEntry(id=_id("orb_turn"), role="user", content=message, created_at=_now(), state="listening", partial=True, mode_decision=decision)
                )
            return self._event_response(session, decision, provider_event=provider_event)

        if event.state:
            session.state = event.state
        elif event.type in {"speech_started", "recording_on"}:
            session.state = "recording" if event.type == "recording_on" else "listening"
        elif event.type == "dictation_on":
            session.state = "dictation"
        elif event.type == "mute":
            session.state = "muted"
        elif event.type == "privacy_on":
            session.state = "private"

        if event.type != "user_text" or not message.strip():
            record_audit_event(
                event_type="orb_voice_session",
                action=event.type,
                actor=current_user,
                resource_type="orb_session",
                resource_id=session_id,
                metadata={"mode": decision.model_dump(), "state": session.state, "raw_audio_stored": False},
            )
            return self._event_response(session, decision, provider_event=provider_event)

        safe_message = assert_safe_assistant_message(message)
        if not session.preferences.do_not_store_transcript:
            session.transcript.append(
                OrbTranscriptEntry(id=_id("orb_turn"), role="user", content=safe_message, created_at=_now(), state="listening", mode_decision=decision)
            )
        session.state = "thinking"

        shared_context = build_shared_assistant_context(
            current_user=current_user,
            requested_context=_assistant_context_from_orb(context, decision, session.id),
            mode=decision.assistant_mode,
            conversation_id=session.id,
        )
        assistant_data = self.assistant_response_service.query(
            conn,
            message=safe_message,
            context=shared_context,
            current_user=current_user,
        )
        citations = list(assistant_data.get("citations") or [])
        related_records = list(assistant_data.get("related_records") or [])
        session.citations_used.extend(citations[:12])
        session.related_records.extend(related_records[:12])

        answer = assistant_data.get("answer") or "I do not have enough evidence in the records to answer that."
        answer = f"{spoken_acknowledgement(decision, safe_message)}\n\n{answer}"
        pending_draft: OrbVoiceDraft | None = None
        if _write_intent(safe_message):
            pending_draft = OrbVoiceDraft(
                id=_id("orb_draft"),
                draft_type=_draft_type(safe_message),
                title=f"Orb draft: {_draft_type(safe_message).replace('_', ' ').title()}",
                content=answer,
                source_citations=citations,
                requested_action=safe_message[:500],
                approved_by_user_id=None,
            )
            session.pending_drafts.append(pending_draft)
            answer = (
                f"{answer}\n\nI can draft that. Do you want me to save it? "
                "Nothing will be written until you review and confirm."
            )

        assistant_turn = OrbTranscriptEntry(
            id=_id("orb_turn"),
            role="assistant",
            content=answer,
            created_at=_now(),
            state="speaking" if not pending_draft else "safeguarding_sensitive" if "safeguarding_sensitive" in decision.safety_flags else "speaking",
            citations=citations,
            mode_decision=decision,
            draft=pending_draft,
        )
        if not session.preferences.do_not_store_transcript:
            session.transcript.append(assistant_turn)
        session.state = assistant_turn.state

        operational_insights = build_orb_operational_intelligence_snapshot(current_user=current_user, context=context.model_dump())
        record_audit_event(
            event_type="orb_voice_session",
            action="assistant_turn",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata={
                "mode": decision.model_dump(),
                "workspace_context": context.model_dump(),
                "records_retrieved": related_records[:30],
                "citations_used": citations[:30],
                "pending_write_confirmation": pending_draft.model_dump() if pending_draft else None,
                "raw_audio_stored": False,
                "transcript_stored": not session.preferences.do_not_store_transcript,
            },
        )

        return self._event_response(
            session,
            decision,
            assistant_turn=assistant_turn,
            pending_write_confirmation=pending_draft,
            citations=citations,
            related_records=related_records,
            suggested_actions=list(assistant_data.get("suggested_actions") or []),
            evidence_gaps=list(assistant_data.get("evidence_gaps") or []),
            regulatory_links=list(assistant_data.get("regulatory_links") or []),
            operational_insights=operational_insights,
            provider_event=provider_event,
        )

    async def interrupt(self, *, session_id: str, current_user: dict[str, Any]) -> OrbInterruptResponse:
        session = self.get_session(session_id)
        await self._provider(session.provider_name).interrupt(session_id=session_id)
        session.state = "interrupted"
        if session.transcript:
            session.transcript[-1].interrupted = True
        record_audit_event(
            event_type="orb_voice_session",
            action="interrupt",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata={"mode": session.mode_decision.model_dump(), "raw_audio_stored": False},
        )
        return OrbInterruptResponse(session_id=session_id)

    async def end(self, *, session_id: str, current_user: dict[str, Any]) -> OrbSessionSummary:
        session = self.get_session(session_id)
        await self._provider(session.provider_name).end(session_id=session_id)
        session.state = "idle"
        session.ended_at = _now()
        record_audit_event(
            event_type="orb_voice_session",
            action="end",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata=self.summary(session_id).model_dump(),
        )
        return self.summary(session_id)

    def transcript(self, session_id: str) -> OrbTranscriptResponse:
        session = self.get_session(session_id)
        entries = [] if session.preferences.do_not_store_transcript else session.transcript
        return OrbTranscriptResponse(
            session_id=session_id,
            transcript=entries,
            storage_policy=transcript_storage_policy(
                session.preferences.do_not_store_transcript,
                session.preferences.transcript_retention_days,
            ),
        )

    def summary(self, session_id: str) -> OrbSessionSummary:
        session = self.get_session(session_id)
        return OrbSessionSummary(
            session_id=session.id,
            state=session.state,
            mode_decision=session.mode_decision,
            started_at=session.started_at,
            ended_at=session.ended_at,
            transcript_entries=0 if session.preferences.do_not_store_transcript else len(session.transcript),
            citations_used=session.citations_used[:30],
            records_retrieved=session.related_records[:30],
            records_changed=session.records_changed,
            pending_drafts=session.pending_drafts,
            privacy=session.preferences,
        )

    def _event_response(
        self,
        session: OrbSessionRecord,
        decision: OrbModeDecision,
        *,
        assistant_turn: OrbTranscriptEntry | None = None,
        pending_write_confirmation: OrbVoiceDraft | None = None,
        citations: list[dict[str, Any]] | None = None,
        related_records: list[dict[str, Any]] | None = None,
        suggested_actions: list[dict[str, Any]] | None = None,
        evidence_gaps: list[dict[str, Any]] | None = None,
        regulatory_links: list[dict[str, Any]] | None = None,
        operational_insights: dict[str, Any] | None = None,
        provider_event: dict[str, Any] | None = None,
    ) -> OrbSessionEventResponse:
        return OrbSessionEventResponse(
            session_id=session.id,
            state=session.state,
            mode_decision=decision,
            transcript=[] if session.preferences.do_not_store_transcript else session.transcript[-20:],
            assistant_turn=assistant_turn,
            pending_write_confirmation=pending_write_confirmation,
            citations=citations or [],
            related_records=related_records or [],
            suggested_actions=suggested_actions or [],
            evidence_gaps=evidence_gaps or [],
            regulatory_links=regulatory_links or [],
            operational_insights=operational_insights or {},
            provider_event=provider_event or {},
        )


orb_voice_session_service = OrbVoiceSessionService()

