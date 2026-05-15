from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from schemas.orb import OrbContext, OrbModeDecision


REFERENCE_TERMS = {
    "that child",
    "that young person",
    "that incident",
    "the incident",
    "the earlier one",
    "earlier one",
    "continue",
    "summarise that",
    "summarize that",
    "carry on",
    "pick that up",
    "yesterday",
    "that follow up",
    "that follow-up",
    "open it",
    "show me that",
    "what about",
    "how about",
    "and education",
    "education",
    "what else",
    "anything else",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clean_mapping(value: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    return {key: item for key, item in value.items() if item not in (None, "", [], {})}


def _home_id_from_user(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("home_id") or current_user.get("default_home_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    values = current_user.get("allowed_home_ids") or current_user.get("home_ids") or []
    if isinstance(values, (str, int)):
        values = [values]
    allowed: set[int] = set()
    for value in values:
        try:
            allowed.add(int(value))
        except (TypeError, ValueError):
            continue
    default_home_id = _home_id_from_user(current_user)
    if default_home_id is not None:
        allowed.add(default_home_id)
    return allowed


def _safe_home_id(context: OrbContext, current_user: dict[str, Any]) -> int | None:
    requested = context.home_id
    if requested is None:
        return _home_id_from_user(current_user)
    allowed = _allowed_home_ids(current_user)
    if allowed and int(requested) not in allowed:
        return None
    return int(requested)


def _safe_child_id(value: Any) -> int | str | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return str(value)


@dataclass
class OrbConversationMemory:
    session_id: str
    user_id: int | None
    home_id: int | None
    expires_at: datetime
    short_term_turns: list[dict[str, Any]] = field(default_factory=list)
    pinned_context: dict[str, Any] = field(default_factory=dict)
    operational_context: dict[str, Any] = field(default_factory=dict)
    interrupted_response: dict[str, Any] | None = None
    last_topic: str | None = None
    last_child_id: int | None = None
    last_record: dict[str, Any] | None = None

    def expired(self) -> bool:
        return _now() >= self.expires_at


class OrbMemoryService:
    """Process-local, home-scoped conversational memory for Orb voice turns.

    This is intentionally short-lived and non-audio. It keeps enough context for
    pronouns and follow-ups while avoiding cross-home or unsafe persistent memory.
    """

    def __init__(self, ttl_minutes: int = 180, max_turns: int = 12) -> None:
        self.ttl = timedelta(minutes=ttl_minutes)
        self.max_turns = max_turns
        self._store: dict[str, OrbConversationMemory] = {}

    def start_session(self, *, session_id: str, current_user: dict[str, Any], context: OrbContext) -> OrbConversationMemory:
        self._expire_old()
        memory = OrbConversationMemory(
            session_id=session_id,
            user_id=self._user_id(current_user),
            home_id=_safe_home_id(context, current_user),
            expires_at=_now() + self.ttl,
        )
        self._store[session_id] = memory
        self.update_from_context(session_id=session_id, context=context, current_user=current_user)
        return memory

    def get(self, session_id: str) -> OrbConversationMemory | None:
        memory = self._store.get(session_id)
        if memory and memory.expired():
            self._store.pop(session_id, None)
            return None
        return memory

    def update_from_context(self, *, session_id: str, context: OrbContext, current_user: dict[str, Any]) -> dict[str, Any]:
        memory = self.get(session_id)
        if not memory:
            memory = self.start_session(session_id=session_id, current_user=current_user, context=context)
        safe_home_id = _safe_home_id(context, current_user)
        if context.home_id is not None and safe_home_id is None:
            memory.operational_context["home_scope_error"] = "requested_home_not_permitted"
            return self.snapshot(session_id)
        if safe_home_id is not None:
            memory.home_id = safe_home_id

        if context.selected_young_person_id:
            child_id = _safe_child_id(context.selected_young_person_id)
            memory.last_child_id = child_id if isinstance(child_id, int) else memory.last_child_id
            memory.pinned_context["active_child"] = {
                **_clean_mapping(memory.pinned_context.get("active_child")),
                "id": child_id,
            }
        if context.current_child:
            memory.pinned_context["active_child"] = _clean_mapping(context.current_child)
        if context.current_shift:
            memory.pinned_context["active_shift"] = _clean_mapping(context.current_shift)
        if context.current_task:
            memory.pinned_context["active_task"] = _clean_mapping(context.current_task)
        if context.selected_record_id or context.selected_record_type or context.current_record_summary:
            memory.last_record = {
                "id": context.selected_record_id,
                "type": context.selected_record_type,
                "summary": context.current_record_summary,
                "home_id": memory.home_id,
            }
            memory.pinned_context["active_record"] = _clean_mapping(memory.last_record)

        operational = {
            "active_home": {"home_id": memory.home_id} if memory.home_id is not None else {},
            "active_report": context.operational_memory.get("active_report") if context.operational_memory else None,
            "active_chronology_cluster": context.operational_memory.get("active_chronology_cluster") if context.operational_memory else None,
            "active_safeguarding_review": context.operational_memory.get("active_safeguarding_review") if context.operational_memory else None,
            "active_investigation": context.operational_memory.get("active_investigation") if context.operational_memory else None,
            "active_inspection_prep": context.operational_memory.get("active_inspection_prep") if context.operational_memory else None,
        }
        memory.operational_context.update({key: value for key, value in operational.items() if value})
        memory.expires_at = _now() + self.ttl
        return self.snapshot(session_id)

    def record_user_turn(self, *, session_id: str, text: str, decision: OrbModeDecision, context: OrbContext, current_user: dict[str, Any]) -> dict[str, Any]:
        self.update_from_context(session_id=session_id, context=context, current_user=current_user)
        memory = self.get(session_id)
        if not memory:
            return {}
        resolved = self.resolve_references(text=text, session_id=session_id)
        memory.last_topic = self._topic_from(text, decision)
        memory.short_term_turns.append(
            {
                "role": "user",
                "text": text[:1200],
                "brain": decision.brain,
                "assistant_mode": decision.assistant_mode,
                "topic": memory.last_topic,
                "resolved_references": resolved,
                "created_at": _now().isoformat(),
            }
        )
        memory.short_term_turns = memory.short_term_turns[-self.max_turns :]
        memory.expires_at = _now() + self.ttl
        return self.snapshot(session_id)

    def record_assistant_turn(
        self,
        *,
        session_id: str,
        text: str,
        citations: list[dict[str, Any]] | None = None,
        related_records: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        memory = self.get(session_id)
        if not memory:
            return {}
        records = related_records or []
        if records:
            memory.last_record = _clean_mapping(records[0])
            memory.pinned_context["active_record"] = memory.last_record
        memory.short_term_turns.append(
            {
                "role": "assistant",
                "text": text[:1200],
                "citations_count": len(citations or []),
                "related_records_count": len(records),
                "created_at": _now().isoformat(),
            }
        )
        memory.short_term_turns = memory.short_term_turns[-self.max_turns :]
        memory.expires_at = _now() + self.ttl
        return self.snapshot(session_id)

    def mark_interrupted(self, *, session_id: str, interrupted_text: str | None) -> dict[str, Any]:
        memory = self.get(session_id)
        if not memory:
            return {}
        memory.interrupted_response = {
            "text": (interrupted_text or "")[:1200],
            "created_at": _now().isoformat(),
            "status": "interrupted",
        }
        memory.expires_at = _now() + self.ttl
        return self.snapshot(session_id)

    def resolve_references(self, *, text: str, session_id: str) -> dict[str, Any]:
        memory = self.get(session_id)
        if not memory:
            return {}
        lower = text.lower()
        resolved: dict[str, Any] = {}
        has_reference = any(term in lower for term in REFERENCE_TERMS)
        follow_up_without_subject = (
            lower.startswith(("what about", "how about", "and ", "anything", "what else"))
            or lower in {"education", "school", "safeguarding", "follow up", "follow-up"}
        )
        if not has_reference and not follow_up_without_subject:
            return {}
        if "child" in lower or "young person" in lower or follow_up_without_subject:
            resolved["that_child"] = memory.pinned_context.get("active_child") or {"id": memory.last_child_id}
        if "incident" in lower or "earlier one" in lower or "it" in lower or "that" in lower:
            resolved["that_record"] = memory.last_record or memory.pinned_context.get("active_record")
        if "continue" in lower or "summarise" in lower or "summarize" in lower or follow_up_without_subject:
            resolved["last_topic"] = memory.last_topic
            resolved["interrupted_response"] = memory.interrupted_response
        if "carry on" in lower or "pick that up" in lower:
            resolved["last_topic"] = memory.last_topic
            resolved["last_record"] = memory.last_record
        if follow_up_without_subject and memory.last_child_id is not None:
            resolved["selected_young_person_id"] = memory.last_child_id
        return {key: value for key, value in resolved.items() if value}

    def snapshot(self, session_id: str) -> dict[str, Any]:
        memory = self.get(session_id)
        if not memory:
            return {}
        return {
            "scope": {
                "session_id": memory.session_id,
                "user_id": memory.user_id,
                "home_id": memory.home_id,
                "expires_at": memory.expires_at.isoformat(),
                "raw_audio_stored": False,
                "persistent_memory": False,
            },
            "short_term": memory.short_term_turns[-6:],
            "pinned": memory.pinned_context,
            "operational": memory.operational_context,
            "last_topic": memory.last_topic,
            "last_child_id": memory.last_child_id,
            "last_record": memory.last_record,
            "interrupted_response": memory.interrupted_response,
        }

    def prompt_context(self, session_id: str) -> dict[str, Any]:
        snapshot = self.snapshot(session_id)
        if not snapshot:
            return {}
        return {
            "orb_conversation_memory": {
                "scope": snapshot["scope"],
                "pinned": snapshot["pinned"],
                "operational": snapshot["operational"],
                "recent_turns": snapshot["short_term"],
                "last_topic": snapshot["last_topic"],
                "last_record": snapshot["last_record"],
                "interrupted_response": snapshot["interrupted_response"],
                "safe_reference_guidance": [
                    "Resolve 'that', 'it' and 'carry on' only inside the same home and active child context.",
                    "Use memory to continue the thread, not to search across children.",
                    "Refer back naturally when helpful: 'from the note we were looking at' or 'from yesterday's follow-up'.",
                ],
            }
        }

    def end_session(self, session_id: str) -> None:
        self._store.pop(session_id, None)

    def _expire_old(self) -> None:
        expired = [session_id for session_id, memory in self._store.items() if memory.expired()]
        for session_id in expired:
            self._store.pop(session_id, None)

    @staticmethod
    def _user_id(current_user: dict[str, Any]) -> int | None:
        value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _topic_from(text: str, decision: OrbModeDecision) -> str:
        lower = text.lower()
        for topic in ("chronology", "safeguarding", "incident", "handover", "inspection", "weather", "schedule", "report"):
            if topic in lower:
                return topic
        return decision.assistant_mode or decision.brain


orb_memory_service = OrbMemoryService()
