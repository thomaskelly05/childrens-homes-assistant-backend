from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from schemas.orb_identity import OrbProductMode


SAFE_PREFERENCE_KEYS = {
    "preferred_response_length",
    "caption_preference",
    "voice_caption_mode",
    "reduced_motion",
    "high_contrast",
    "pacing_preference",
    "interaction_style",
    "recent_unresolved_topic",
    "recent_active_workflow",
    "last_used_mode",
    "prefers_brief_answers",
    "prefers_step_by_step",
}

BLOCKED_STANDALONE_KEYS = {"active_child_id", "child_name", "home_id", "provider_id", "chronology_id", "record_id"}


@dataclass
class OrbPresenceMemory:
    user_id: str
    product_mode: str
    scope_key: str
    preferences: dict[str, Any] = field(default_factory=dict)
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OrbPresenceMemoryService:
    """Safe minimal preference memory; no raw audio or full transcripts."""

    def __init__(self) -> None:
        self._store: dict[tuple[str, str, str], OrbPresenceMemory] = {}

    def scope_key(self, *, product_mode: OrbProductMode | str, user_id: Any, home_id: Any = None, active_child_id: Any = None) -> str:
        mode = OrbProductMode(str(product_mode))
        if mode == OrbProductMode.STANDALONE:
            return f"standalone:user:{user_id}"
        if active_child_id not in (None, "", [], {}):
            return f"os:user:{user_id}:home:{home_id}:child:{active_child_id}"
        return f"os:user:{user_id}:home:{home_id or 'unscoped'}"

    def remember(
        self,
        *,
        product_mode: OrbProductMode | str,
        user_id: Any,
        preferences: dict[str, Any],
        home_id: Any = None,
        active_child_id: Any = None,
    ) -> OrbPresenceMemory:
        mode = OrbProductMode(str(product_mode))
        safe = {key: value for key, value in preferences.items() if key in SAFE_PREFERENCE_KEYS and value not in (None, "", [], {})}
        if mode == OrbProductMode.STANDALONE:
            for key in BLOCKED_STANDALONE_KEYS:
                safe.pop(key, None)
            home_id = None
            active_child_id = None
        scope = self.scope_key(product_mode=mode, user_id=user_id, home_id=home_id, active_child_id=active_child_id)
        memory = OrbPresenceMemory(user_id=str(user_id), product_mode=mode.value, scope_key=scope, preferences=safe)
        self._store[(str(user_id), mode.value, scope)] = memory
        return memory

    def recall(self, *, product_mode: OrbProductMode | str, user_id: Any, home_id: Any = None, active_child_id: Any = None) -> dict[str, Any]:
        mode = OrbProductMode(str(product_mode))
        scope = self.scope_key(product_mode=mode, user_id=user_id, home_id=home_id, active_child_id=active_child_id)
        memory = self._store.get((str(user_id), mode.value, scope))
        return memory.preferences.copy() if memory else {}


orb_presence_memory_service = OrbPresenceMemoryService()

