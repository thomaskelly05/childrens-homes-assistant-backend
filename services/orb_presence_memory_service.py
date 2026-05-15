from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from schemas.orb_identity import OrbProductMode


SAFE_PREFERENCE_KEYS = {
    "preferred_response_length",
    "caption_preference",
    "caption_density_preference",
    "voice_caption_mode",
    "reduced_motion",
    "reduced_stimulation",
    "high_contrast",
    "pacing_preference",
    "interaction_style",
    "interaction_rhythm",
    "tone_preference",
    "verbosity_preference",
    "preferred_response_style",
    "sensory_profile",
    "interruption_style",
    "concise_mode",
    "reflective_mode",
    "reflective_writing_preference",
    "emotional_safety_preferred",
    "emotional_overload_indicators",
    "mute_transition_preference",
    "acknowledgement_preference",
    "recent_unresolved_topic",
    "previous_unresolved_operational_topics",
    "recent_active_workflow",
    "last_used_mode",
    "prefers_brief_answers",
    "prefers_step_by_step",
    "accessibility_needs",
    "hearing_accessibility",
    "low_vision_preference",
    "dyslexia_preference",
    "voice_first_navigation",
}

BLOCKED_STANDALONE_KEYS = {"active_child_id", "child_name", "home_id", "provider_id", "chronology_id", "record_id"}
CLINICAL_KEYS = {"diagnosis", "clinical_conclusion", "risk_label", "mental_health_label", "clinical_profile"}


@dataclass
class OrbPresenceMemory:
    user_id: str
    product_mode: str
    scope_key: str
    preferences: dict[str, Any] = field(default_factory=dict)
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class OrbPresenceMemoryService:
    """Safe relationship-aware preference memory; no raw audio, full transcripts or clinical conclusions."""

    def __init__(self) -> None:
        self._store: dict[tuple[str, str, str], OrbPresenceMemory] = {}

    def scope_key(self, *, product_mode: OrbProductMode | str, user_id: Any, home_id: Any = None, active_child_id: Any = None) -> str:
        mode = OrbProductMode(str(product_mode))
        if mode == OrbProductMode.STANDALONE:
            return f"standalone:user:{user_id}"
        if active_child_id not in (None, "", [], {}):
            return f"os:user:{user_id}:home:{home_id}:child:{active_child_id}"
        return f"os:user:{user_id}:home:{home_id or 'unscoped'}"

    def _safe_preferences(self, preferences: dict[str, Any]) -> dict[str, Any]:
        safe: dict[str, Any] = {}
        for key, value in preferences.items():
            if key in CLINICAL_KEYS or key not in SAFE_PREFERENCE_KEYS or value in (None, "", [], {}):
                continue
            if key in {"previous_unresolved_operational_topics", "accessibility_needs", "emotional_overload_indicators"}:
                if isinstance(value, list):
                    safe[key] = [str(item)[:160] for item in value[:6] if item not in (None, "", [], {})]
                elif isinstance(value, str):
                    safe[key] = [value[:160]]
                continue
            safe[key] = value
        return safe

    def _merged_preferences(self, previous: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
        merged = {**previous, **current}
        for key in {"previous_unresolved_operational_topics", "accessibility_needs", "emotional_overload_indicators"}:
            combined: list[Any] = []
            for source in (previous.get(key), current.get(key)):
                if isinstance(source, list):
                    combined.extend(source)
                elif source not in (None, "", [], {}):
                    combined.append(source)
            if combined:
                deduped = list(dict.fromkeys(str(item)[:160] for item in combined if item not in (None, "", [], {})))
                merged[key] = deduped[-6:]
        return {key: value for key, value in merged.items() if value not in (None, "", [], {})}

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
        safe = self._safe_preferences(preferences)
        if mode == OrbProductMode.STANDALONE:
            for key in BLOCKED_STANDALONE_KEYS:
                safe.pop(key, None)
            home_id = None
            active_child_id = None
        scope = self.scope_key(product_mode=mode, user_id=user_id, home_id=home_id, active_child_id=active_child_id)
        existing = self._store.get((str(user_id), mode.value, scope))
        merged = self._merged_preferences(existing.preferences if existing else {}, safe)
        memory = OrbPresenceMemory(user_id=str(user_id), product_mode=mode.value, scope_key=scope, preferences=merged)
        self._store[(str(user_id), mode.value, scope)] = memory
        return memory

    def recall(self, *, product_mode: OrbProductMode | str, user_id: Any, home_id: Any = None, active_child_id: Any = None) -> dict[str, Any]:
        mode = OrbProductMode(str(product_mode))
        scope = self.scope_key(product_mode=mode, user_id=user_id, home_id=home_id, active_child_id=active_child_id)
        memory = self._store.get((str(user_id), mode.value, scope))
        return memory.preferences.copy() if memory else {}

    def continuity_notes(self, preferences: dict[str, Any]) -> list[str]:
        notes: list[str] = []
        if preferences.get("reduced_stimulation") or preferences.get("sensory_profile") == "reduced_stimulation":
            notes.append("I'll keep things calmer.")
        if preferences.get("prefers_brief_answers") or preferences.get("concise_mode") or preferences.get("preferred_response_length") in {"brief", "short"}:
            notes.append("You usually prefer concise support.")
        if preferences.get("caption_preference") == "on" or preferences.get("voice_caption_mode") == "caption_supported":
            notes.append("Captions are still enabled.")
        topics = preferences.get("previous_unresolved_operational_topics") or preferences.get("recent_unresolved_topic")
        if isinstance(topics, list) and topics:
            notes.append(f"I'll keep {topics[-1]} visible until it is resolved.")
        elif isinstance(topics, str):
            notes.append(f"I'll keep {topics} visible until it is resolved.")
        if preferences.get("reflective_mode") or preferences.get("reflective_writing_preference"):
            notes.append("I'll leave more room for reflective writing.")
        return notes[:4]


orb_presence_memory_service = OrbPresenceMemoryService()

