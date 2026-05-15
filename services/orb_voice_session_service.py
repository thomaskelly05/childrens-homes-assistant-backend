from __future__ import annotations

import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from fastapi import HTTPException, status

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
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_intent_router import route_orb_intent
from services.orb_memory_service import orb_memory_service
from services.orb_operational_events_service import orb_operational_events_service
from services.orb_persona_policy import persona_instruction, spoken_acknowledgement, transcript_storage_policy
from services.orb_productivity_service import orb_productivity_service
from services.orb_conversation_policy import orb_conversation_policy
from services.orb_observability_service import orb_observability_service
from services.orb_realtime_conversation_service import orb_realtime_conversation_service
from services.orb_realtime_provider_service import (
    ALLOWED_SYNTHETIC_VOICES,
    orb_realtime_provider_service,
)
from services.orb_session_store import orb_session_store
from services.orb_tool_orchestration_service import orb_tool_orchestration_service
from services.orb_tool_router import tools_for_decision
from services.orb_wake_word_service import orb_wake_word_service
from services.orb_web_search_service import orb_web_search_service
from services.narrative_continuity_service import narrative_continuity_service


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


def _session_ttl_seconds() -> int:
    try:
        return max(300, int(os.getenv("ORB_SESSION_TTL_SECONDS", "7200")))
    except (TypeError, ValueError):
        return 7200


def _expires_at() -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=_session_ttl_seconds())).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _user_id(current_user: dict[str, Any]) -> int | None:
    try:
        value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
        return int(value) if value is not None else None
    except Exception:
        return None


def _enabled(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _normalised_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower().replace("-", "_")


def _provider_level(current_user: dict[str, Any]) -> bool:
    return _normalised_role(current_user) in {
        "admin",
        "administrator",
        "provider_admin",
        "super_admin",
        "superadmin",
        "founder",
        "owner",
        "ri",
        "responsible_individual",
    }


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    values = (
        current_user.get("allowed_home_ids")
        or current_user.get("allowedHomeIds")
        or current_user.get("home_ids")
        or current_user.get("homeIds")
        or []
    )
    if isinstance(values, (str, int)):
        values = [values]
    allowed: set[int] = set()
    for value in values:
        try:
            allowed.add(int(value))
        except (TypeError, ValueError):
            continue
    for key in ("home_id", "homeId", "default_home_id"):
        try:
            value = current_user.get(key)
            if value is not None:
                allowed.add(int(value))
        except (TypeError, ValueError):
            continue
    return allowed


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _provider_voice(profile: OrbVoiceProfile) -> str:
    configured = os.getenv("ORB_DEFAULT_VOICE") or profile.provider_voice or "shimmer"
    voice = str(configured).strip().lower()
    return voice if voice in ALLOWED_SYNTHETIC_VOICES else "shimmer"


def _public_openai_session_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Return only client-safe ephemeral realtime fields."""

    session = dict(payload or {})
    for key in ("api_key", "OPENAI_API_KEY", "authorization", "Authorization"):
        session.pop(key, None)
    client_secret = session.get("client_secret")
    if isinstance(client_secret, dict):
        value = client_secret.get("value")
        session["client_secret"] = {
            "value": value,
            "expires_at": client_secret.get("expires_at"),
        }
    return session


def _assistant_context_from_orb(
    context: OrbContext,
    decision: OrbModeDecision,
    conversation_id: str | None,
    memory_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    base = dict(context.assistant_context or {})
    remembered_child_id = _memory_selected_child_id(memory_context)
    base.update(
        {
            "route": context.route or base.get("route"),
            "current_route": context.route or base.get("current_route"),
            "workspace_type": context.workspace or base.get("workspace_type"),
            "current_workspace_type": context.workspace or base.get("current_workspace_type"),
            "page_title": context.page_title or base.get("page_title"),
            "selected_young_person_id": context.selected_young_person_id or base.get("selected_young_person_id") or remembered_child_id,
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
    if memory_context:
        base.update(memory_context)
    return {key: value for key, value in base.items() if value not in (None, "", [], {})}


def _memory_selected_child_id(memory_context: dict[str, Any] | None) -> Any:
    memory = (memory_context or {}).get("orb_conversation_memory") or {}
    if not isinstance(memory, dict):
        return None
    pinned = memory.get("pinned") if isinstance(memory.get("pinned"), dict) else {}
    active_child = pinned.get("active_child") if isinstance(pinned.get("active_child"), dict) else {}
    return active_child.get("id") or active_child.get("young_person_id") or memory.get("last_child_id")


def _active_child_payload(context: OrbContext, memory_context: dict[str, Any] | None) -> dict[str, Any]:
    if context.current_child:
        return dict(context.current_child)
    memory = (memory_context or {}).get("orb_conversation_memory") or {}
    pinned = memory.get("pinned") if isinstance(memory, dict) else {}
    active_child = pinned.get("active_child") if isinstance(pinned, dict) else {}
    return dict(active_child) if isinstance(active_child, dict) else {}


def _record_summary(record: dict[str, Any]) -> str:
    for key in ("summary", "narrative", "description", "title", "details", "body"):
        value = record.get(key)
        if value:
            return str(value).strip()
    return ""


def _low_evidence_answer(answer: Any) -> bool:
    text = str(answer or "").strip().lower()
    if not text:
        return True
    return any(
        phrase in text
        for phrase in (
            "do not have enough evidence",
            "don't have enough evidence",
            "i cannot access",
            "no records available",
            "orb request failed",
        )
    )


def _handover_or_continuity_request(message: str) -> bool:
    text = message.lower()
    return any(
        term in text
        for term in (
            "handover",
            "what happened",
            "today",
            "tonight",
            "next shift",
            "needs following up",
            "still needs",
            "safeguarding",
            "what changed",
            "worrying staff",
            "education",
            "missing chronology",
            "summarise",
            "summarize",
        )
    )


def _operational_recovery_answer(
    *,
    message: str,
    related_records: list[dict[str, Any]],
    context: OrbContext,
    memory_context: dict[str, Any] | None,
) -> str | None:
    if not _handover_or_continuity_request(message):
        return None
    child = _active_child_payload(context, memory_context)
    child_id = context.selected_young_person_id or _memory_selected_child_id(memory_context)
    home_id = context.home_id
    continuity = narrative_continuity_service.summarise(
        records=related_records,
        child=child,
        young_person_id=child_id,
        home_id=home_id,
    )
    if continuity["record_count"] == 0:
        return "I could not find enough scoped records for that just now. The safe next step is to check the chronology and handover log before relying on it."

    child_name = child.get("preferred_name") or child.get("preferredName") or child.get("name") or "they"
    latest = str(continuity.get("what_changed") or "There is a recent scoped record to review.").strip().replace(". ", "; ")
    unresolved = continuity.get("unresolved_themes") or []
    if not unresolved:
        visible_statuses = " ".join(str(record.get("status") or "") for record in related_records).lower()
        visible_text = " ".join(_record_summary(record) for record in related_records).lower()
        if any(term in f"{visible_statuses} {visible_text}" for term in ("follow-up", "follow up", "review", "open", "overdue")):
            unresolved = [{"reason": "Visible scoped records contain follow-up or review wording."}]
    if unresolved:
        latest = f"{latest.rstrip('.')}; there is still follow-up or review language that should carry into the next shift."
    parts = [f"Records indicate {child_name} had this recorded most recently: {latest}"]
    if unresolved:
        parts.append("For the next shift, keep that follow-up visible in handover and check who owns it.")
    safeguarding = any("safeguarding" in item.get("themes", []) for item in unresolved)
    if safeguarding:
        parts.append("Possible safeguarding wording is present, so keep facts separate from interpretation and check manager oversight.")
    progress = continuity.get("positive_progress") or []
    if progress:
        parts.append("Evidence found for positive progress; build on it calmly with familiar support.")
    child_voice = continuity.get("child_voice_continuity") or []
    if child_voice:
        parts.append("The child's own words or wishes are visible in the scoped record.")
    return " ".join(parts[:4])


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
        instructions = "\n\n".join(
            [
                persona_instruction(decision, request.voice_profile),
                orb_conversation_policy.provider_instructions(decision=decision, preferences=request.preferences),
            ]
        )
        return {
            "provider": self.name,
            "mock": True,
            "transport": "browser_media_recorder_text_fallback",
            "instructions": instructions,
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
        return orb_realtime_provider_service.configured()

    async def start_session(self, *, request: OrbSessionStartRequest, decision: OrbModeDecision, current_user: dict[str, Any]) -> dict[str, Any]:
        instructions = "\n\n".join(
            [
                persona_instruction(decision, request.voice_profile),
                orb_conversation_policy.provider_instructions(decision=decision, preferences=request.preferences),
            ]
        )
        return await orb_realtime_provider_service.create_ephemeral_session(
            instructions=instructions,
            voice=_provider_voice(request.voice_profile),
            current_user=current_user,
        )

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
    last_seen_at: str = field(default_factory=_now)
    expires_at: str = field(default_factory=_expires_at)


def _session_to_payload(session: OrbSessionRecord) -> dict[str, Any]:
    return {
        "id": session.id,
        "user_id": session.user_id,
        "current_user": session.current_user,
        "context": session.context.model_dump(),
        "preferences": session.preferences.model_dump(),
        "voice_profile": session.voice_profile.model_dump(),
        "selected_mode": session.selected_mode,
        "mode_decision": session.mode_decision.model_dump(),
        "provider_name": session.provider_name,
        "state": session.state,
        "started_at": session.started_at,
        "ended_at": session.ended_at,
        "transcript": [entry.model_dump() for entry in session.transcript],
        "pending_drafts": [draft.model_dump() for draft in session.pending_drafts],
        "citations_used": session.citations_used,
        "related_records": session.related_records,
        "records_changed": session.records_changed,
        "last_seen_at": session.last_seen_at,
        "expires_at": session.expires_at,
    }


def _session_from_payload(payload: dict[str, Any]) -> OrbSessionRecord:
    decision = OrbModeDecision(**payload["mode_decision"])
    return OrbSessionRecord(
        id=payload["id"],
        user_id=payload.get("user_id"),
        current_user=dict(payload.get("current_user") or {}),
        context=OrbContext(**(payload.get("context") or {})),
        preferences=OrbPreferences(**(payload.get("preferences") or {})),
        voice_profile=OrbVoiceProfile(**(payload.get("voice_profile") or {})),
        selected_mode=payload.get("selected_mode") or "auto",
        mode_decision=decision,
        provider_name=payload.get("provider_name") or "mock_voice",
        state=payload.get("state") or "idle",
        started_at=payload.get("started_at") or _now(),
        ended_at=payload.get("ended_at"),
        transcript=[OrbTranscriptEntry(**entry) for entry in payload.get("transcript") or []],
        pending_drafts=[OrbVoiceDraft(**draft) for draft in payload.get("pending_drafts") or []],
        citations_used=list(payload.get("citations_used") or []),
        related_records=list(payload.get("related_records") or []),
        records_changed=list(payload.get("records_changed") or []),
        last_seen_at=payload.get("last_seen_at") or _now(),
        expires_at=payload.get("expires_at") or _expires_at(),
    )


class OrbVoiceSessionService:
    """Orb voice/session foundation layered over shared realtime storage."""

    def __init__(self, assistant_response_service: AssistantResponseService | None = None) -> None:
        self.assistant_response_service = assistant_response_service or AssistantResponseService()
        self.sessions: dict[str, OrbSessionRecord] = {}
        self.providers: dict[str, VoiceProvider] = {
            "openai_realtime": OpenAIRealtimeVoiceProvider(),
            "mock_voice": MockVoiceProvider(),
        }

    def _provider(self, requested: str | None = None) -> VoiceProvider:
        requested = requested or os.getenv("ORB_VOICE_PROVIDER")
        if requested == "openai":
            requested = "openai_realtime"
        if requested == "mock":
            requested = "mock_voice"
        if requested and requested in self.providers:
            provider = self.providers[requested]
            if provider.configured() or requested == "mock_voice":
                return provider
        openai = self.providers["openai_realtime"]
        return openai if openai.configured() else self.providers["mock_voice"]

    def _cleanup_expired_sessions(self) -> None:
        expired: list[str] = []
        now = datetime.now(timezone.utc)
        for session_id, session in list(self.sessions.items()):
            try:
                if session.ended_at or now >= _parse_time(session.expires_at):
                    expired.append(session_id)
            except Exception:
                expired.append(session_id)
        for session_id in expired:
            self.sessions.pop(session_id, None)
            orb_session_store.delete_session(session_id)
            orb_realtime_conversation_service.end_session(session_id)
            orb_memory_service.end_session(session_id)

    def _cleanup_user_sessions(self, user_id: int | None) -> None:
        if user_id is None:
            return
        for session_id in orb_session_store.cleanup_user_sessions(user_id):
            self.sessions.pop(session_id, None)
            orb_realtime_conversation_service.end_session(session_id)
            orb_memory_service.end_session(session_id)
        for session_id, session in list(self.sessions.items()):
            if session.user_id == user_id and not session.ended_at:
                session.ended_at = _now()
                session.state = "idle"
                self.sessions.pop(session_id, None)
                orb_session_store.delete_session(session_id)
                orb_realtime_conversation_service.end_session(session_id)
                orb_memory_service.end_session(session_id)

    def _touch(self, session: OrbSessionRecord) -> None:
        session.last_seen_at = _now()
        session.expires_at = _expires_at()
        self._persist(session)

    def _persist(self, session: OrbSessionRecord) -> None:
        orb_session_store.save_session(
            session_id=session.id,
            user_id=session.user_id,
            home_id=session.context.home_id,
            payload=_session_to_payload(session),
            expires_at=session.expires_at,
        )

    def _assert_session_owner(self, session: OrbSessionRecord, current_user: dict[str, Any] | None) -> None:
        if not current_user:
            return
        current_user_id = _user_id(current_user)
        if session.user_id is not None and current_user_id != session.user_id and not _provider_level(current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb session does not belong to this user.")

    def _assert_context_scope(self, context: OrbContext, current_user: dict[str, Any]) -> None:
        if context.home_id is None or _provider_level(current_user):
            return
        allowed = _allowed_home_ids(current_user)
        try:
            requested_home_id = int(context.home_id)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Orb home scope.") from exc
        if allowed and requested_home_id not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Orb home scope is not permitted for this user.")

    def get_session(self, session_id: str) -> OrbSessionRecord:
        self._cleanup_expired_sessions()
        session = self.sessions.get(session_id)
        if not session:
            payload = orb_session_store.load_session(session_id)
            if payload:
                session = _session_from_payload(payload)
                self.sessions[session_id] = session
        if not session:
            raise KeyError(session_id)
        return session

    def get_session_for_user(self, session_id: str, current_user: dict[str, Any] | None) -> OrbSessionRecord:
        session = self.get_session(session_id)
        self._assert_session_owner(session, current_user)
        self._touch(session)
        return session

    async def start_session(self, *, request: OrbSessionStartRequest, current_user: dict[str, Any]) -> OrbSessionStartResponse:
        self._cleanup_expired_sessions()
        self._assert_context_scope(request.context, current_user)
        self._cleanup_user_sessions(_user_id(current_user))
        session_id = _id("orb_session")
        decision = route_orb_intent(message=None, current_user=current_user, selected_mode=request.selected_mode, context=request.context)
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
        self._persist(session)
        orb_memory_service.start_session(session_id=session_id, current_user=current_user, context=request.context)
        memory_snapshot = orb_memory_service.snapshot(session_id)
        realtime_state = orb_realtime_conversation_service.start_session(
            session_id=session_id,
            provider_name=provider.name,
            provider_configured=provider.configured(),
            context=request.context,
        )
        operational_event_subscriptions = orb_operational_events_service.subscriptions_for(
            current_user=current_user,
            context=request.context.model_dump(),
        )
        wake_word = orb_wake_word_service.capability()
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
                "provider_configured": provider.configured(),
                "raw_audio_stored": False,
                "memory_scope": memory_snapshot.get("scope"),
                "realtime_state": realtime_state,
                "expires_at": session.expires_at,
                "transcript_policy": transcript_storage_policy(
                    request.preferences.do_not_store_transcript,
                    request.preferences.transcript_retention_days,
                ),
            },
        )
        orb_observability_service.record_event(
            "session_started",
            session_id=session_id,
            user_id=session.user_id,
            home_id=request.context.home_id,
            metadata={"provider": provider.name, "provider_configured": provider.configured()},
        )
        return OrbSessionStartResponse(
            session_id=session_id,
            provider=provider.name,
            provider_configured=provider.configured(),
            state=state,
            expires_at=session.expires_at,
            voice_profile=request.voice_profile,
            preferences=request.preferences,
            mode_decision=decision,
            provider_session=provider_session,
            realtime={
                "transport": "webrtc" if provider.name == "openai_realtime" and provider.configured() else "mock_text_voice",
                "supports_interruptions": True,
                "supports_spoken_barge_in": provider.name == "openai_realtime" and provider.configured(),
                "supports_click_to_interrupt": True,
                "fallback_text_mode": not (provider.name == "openai_realtime" and provider.configured()),
                "supports_microphone_input": provider.name == "openai_realtime" and provider.configured(),
                "supports_microphone_streaming": provider.name == "openai_realtime" and provider.configured(),
                "supports_audio_playback": provider.name == "openai_realtime" and provider.configured(),
                "supports_partial_transcript": True,
                "supports_silence_detection": True,
                "server_vad": provider.name == "openai_realtime" and provider.configured(),
                "reconnect_supported": True,
                "token_refresh_required": provider.name == "openai_realtime" and provider.configured(),
                "session_ttl_seconds": _session_ttl_seconds(),
                "status": "available" if provider.name == "openai_realtime" and provider.configured() else "Realtime audio is not connected yet. Typed Orb remains available.",
                "architecture": "Browser WebRTC streams microphone to the provider; backend owns routed turns, memory, audit, tool previews and safe care retrieval.",
                "wake_phrase_foundation": "Hey Orb/Hey IndiCare optional foundation; passive wake-word detection is disabled by default.",
            },
            realtime_state=realtime_state,
            memory_snapshot=orb_memory_service.snapshot(session_id),
            wake_word=wake_word,
            operational_event_subscriptions=operational_event_subscriptions,
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
        session = self.get_session_for_user(session_id, current_user)
        context = event.context or session.context
        self._assert_context_scope(context, current_user)
        selected_mode = event.selected_mode or session.selected_mode
        message = event.text or ""
        decision = route_orb_intent(message=message, current_user=current_user, selected_mode=selected_mode, context=context)
        session.mode_decision = decision
        session.context = context
        session.selected_mode = selected_mode
        provider_event = await self._provider(session.provider_name).event(session_id=session_id, event=event)
        orb_memory_service.update_from_context(session_id=session_id, context=context, current_user=current_user)

        if event.type == "partial_transcript":
            session.state = "listening"
            realtime_state = orb_realtime_conversation_service.partial_user_transcript(session_id=session_id, text=message)
            self._persist(session)
            return self._event_response(session, decision, provider_event=provider_event, realtime_state=realtime_state)

        if event.type in {
            "speech_started",
            "speech_stopped",
            "recording_on",
            "recording_off",
            "mute",
            "unmute",
            "wake_listening_started",
            "wake_listening_stopped",
            "wake_word_detected",
            "silence_timeout",
            "reconnect",
            "operational_event",
            "response_started",
            "response_delta",
            "response_done",
        }:
            if event.type == "response_started":
                realtime_state = orb_realtime_conversation_service.assistant_response_started(session_id=session_id)
                session.state = "speaking"
            elif event.type == "response_delta":
                realtime_state = orb_realtime_conversation_service.assistant_response_delta(session_id=session_id, delta=message)
                session.state = "speaking"
            elif event.type == "response_done":
                realtime_state = orb_realtime_conversation_service.assistant_response_done(session_id=session_id)
                session.state = "idle"
            elif event.type == "reconnect":
                realtime_state = orb_realtime_conversation_service.reconnect(session_id=session_id)
                session.state = "reconnecting"
            else:
                realtime_state = orb_realtime_conversation_service.note_event(
                    session_id=session_id,
                    event_type=event.type,
                    metadata=event.metadata,
                )
                if event.state:
                    session.state = event.state
                elif event.type == "speech_started":
                    session.state = "listening"
                elif event.type == "speech_stopped":
                    session.state = "thinking"
                elif event.type == "mute":
                    session.state = "muted"
                elif event.type == "unmute":
                    session.state = "idle"
                elif event.type == "wake_listening_started":
                    session.state = "passive_listening"
                elif event.type == "silence_timeout":
                    session.state = "idle"
            if event.type != "operational_event":
                record_audit_event(
                    event_type="orb_voice_session",
                    action=event.type,
                    actor=current_user,
                    resource_type="orb_session",
                    resource_id=session_id,
                    metadata={"mode": decision.model_dump(), "state": session.state, "raw_audio_stored": False, "realtime_state": realtime_state},
                )
            self._persist(session)
            return self._event_response(session, decision, provider_event=provider_event, realtime_state=realtime_state)

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
            self._persist(session)
            return self._event_response(session, decision, provider_event=provider_event)

        safe_message = assert_safe_assistant_message(message)
        memory_snapshot = orb_memory_service.record_user_turn(
            session_id=session_id,
            text=safe_message,
            decision=decision,
            context=context,
            current_user=current_user,
        )
        if not session.preferences.do_not_store_transcript:
            session.transcript.append(
                OrbTranscriptEntry(id=_id("orb_turn"), role="user", content=safe_message, created_at=_now(), state="listening", mode_decision=decision)
            )
        session.state = "thinking"
        self._persist(session)
        orb_realtime_conversation_service.note_event(session_id=session_id, event_type="speech_stopped")

        tool_orchestration = orb_tool_orchestration_service.plan_turn(
            decision=decision,
            message=safe_message,
            context=context,
            memory_snapshot=memory_snapshot,
        )
        tools_used = tool_orchestration.get("manifest") or tools_for_decision(decision, safe_message)
        history = [
            {"role": entry.role, "content": entry.content}
            for entry in session.transcript
            if entry.role in {"user", "assistant"} and not entry.partial
        ][-8:]

        memory_context = orb_memory_service.prompt_context(session.id)
        if decision.care_scope_required:
            shared_context = build_shared_assistant_context(
                current_user=current_user,
                requested_context=_assistant_context_from_orb(
                    context,
                    decision,
                    session.id,
                    memory_context=memory_context,
                ),
                mode=decision.assistant_mode,
                conversation_id=session.id,
            )
            assistant_data = self.assistant_response_service.query(
                conn,
                message=safe_message,
                context=shared_context,
                current_user=current_user,
            )
        elif decision.brain == "web_research_brain":
            assistant_data = await orb_web_search_service.answer(safe_message)
        elif decision.brain == "productivity_brain":
            assistant_data = await orb_productivity_service.answer(
                safe_message,
                history=history,
                detail=session.preferences.response_detail,
            )
        else:
            assistant_data = await orb_general_assistant_service.answer(
                safe_message,
                history=history,
                detail=session.preferences.response_detail,
            )

        citations = list(assistant_data.get("citations") or assistant_data.get("sources") or [])
        related_records = list(assistant_data.get("related_records") or [])
        session.citations_used.extend(citations[:12])
        session.related_records.extend(related_records[:12])

        answer = assistant_data.get("answer")
        recovery_answer = _operational_recovery_answer(
            message=safe_message,
            related_records=related_records,
            context=context,
            memory_context=memory_context,
        ) if decision.care_scope_required else None
        if _low_evidence_answer(answer) and recovery_answer:
            answer = recovery_answer
        elif not answer:
            answer = "I could not load enough scoped records for that just now. Let us try the chronology again."
        answer = orb_conversation_policy.shape_response(
            f"{spoken_acknowledgement(decision, safe_message)}\n\n{answer}",
            decision=decision,
            preferences=session.preferences,
        )
        pending_draft: OrbVoiceDraft | None = None
        if decision.care_scope_required and _write_intent(safe_message):
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
            tools_used=tools_used,
            mode_decision=decision,
            draft=pending_draft,
        )
        if not session.preferences.do_not_store_transcript:
            session.transcript.append(assistant_turn)
        session.state = assistant_turn.state
        self._persist(session)
        realtime_state = orb_realtime_conversation_service.assistant_response_started(session_id=session_id)
        memory_snapshot = orb_memory_service.record_assistant_turn(
            session_id=session_id,
            text=answer,
            citations=citations,
            related_records=related_records,
        )

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
                "tools_used": tools_used,
                "tool_orchestration": tool_orchestration,
                "pending_write_confirmation": pending_draft.model_dump() if pending_draft else None,
                "memory_scope": memory_snapshot.get("scope"),
                "realtime_state": realtime_state,
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
            tools_used=tools_used,
            tool_orchestration=tool_orchestration,
            operational_insights=operational_insights,
            realtime_state=realtime_state,
            memory_snapshot=memory_snapshot,
            provider_event=provider_event,
        )

    async def interrupt(self, *, session_id: str, current_user: dict[str, Any]) -> OrbInterruptResponse:
        session = self.get_session(session_id)
        self._assert_session_owner(session, current_user)
        self._touch(session)
        await self._provider(session.provider_name).interrupt(session_id=session_id)
        session.state = "interrupted"
        interrupted_text = session.transcript[-1].content if session.transcript and session.transcript[-1].role == "assistant" else None
        if session.transcript:
            session.transcript[-1].interrupted = True
        self._persist(session)
        memory_snapshot = orb_memory_service.mark_interrupted(session_id=session_id, interrupted_text=interrupted_text)
        realtime_state = orb_realtime_conversation_service.interrupt(session_id=session_id)
        orb_observability_service.record_event("interruption", session_id=session_id, user_id=session.user_id, home_id=session.context.home_id)
        record_audit_event(
            event_type="orb_voice_session",
            action="interrupt",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata={"mode": session.mode_decision.model_dump(), "raw_audio_stored": False, "memory_scope": memory_snapshot.get("scope"), "realtime_state": realtime_state},
        )
        return OrbInterruptResponse(session_id=session_id)

    async def end(self, *, session_id: str, current_user: dict[str, Any]) -> OrbSessionSummary:
        session = self.get_session_for_user(session_id, current_user)
        await self._provider(session.provider_name).end(session_id=session_id)
        session.state = "idle"
        session.ended_at = _now()
        self._persist(session)
        summary = self._summary_from_session(session)
        orb_realtime_conversation_service.end_session(session_id)
        orb_memory_service.end_session(session_id)
        record_audit_event(
            event_type="orb_voice_session",
            action="end",
            actor=current_user,
            resource_type="orb_session",
            resource_id=session_id,
            metadata=summary.model_dump(),
        )
        self.sessions.pop(session_id, None)
        orb_session_store.delete_session(session_id)
        return summary

    def transcript(self, session_id: str, current_user: dict[str, Any] | None = None) -> OrbTranscriptResponse:
        session = self.get_session_for_user(session_id, current_user)
        entries = [] if session.preferences.do_not_store_transcript else session.transcript
        return OrbTranscriptResponse(
            session_id=session_id,
            transcript=entries,
            storage_policy=transcript_storage_policy(
                session.preferences.do_not_store_transcript,
                session.preferences.transcript_retention_days,
            ),
        )

    def summary(self, session_id: str, current_user: dict[str, Any] | None = None) -> OrbSessionSummary:
        session = self.get_session_for_user(session_id, current_user)
        return self._summary_from_session(session)

    def _summary_from_session(self, session: OrbSessionRecord) -> OrbSessionSummary:
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
        tools_used: list[dict[str, Any]] | None = None,
        operational_insights: dict[str, Any] | None = None,
        tool_orchestration: dict[str, Any] | None = None,
        realtime_state: dict[str, Any] | None = None,
        memory_snapshot: dict[str, Any] | None = None,
        provider_event: dict[str, Any] | None = None,
    ) -> OrbSessionEventResponse:
        current_realtime_state = realtime_state
        if current_realtime_state is None:
            realtime_session = orb_realtime_conversation_service.get(session.id)
            current_realtime_state = realtime_session.snapshot() if realtime_session else {}
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
            tools_used=tools_used or [],
            tool_orchestration=tool_orchestration or {},
            operational_insights=operational_insights or {},
            realtime_state=current_realtime_state,
            memory_snapshot=memory_snapshot or orb_memory_service.snapshot(session.id),
            provider_event=provider_event or {},
        )


orb_voice_session_service = OrbVoiceSessionService()

