from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from schemas.orb import OrbModeDecision, OrbPreferences


AI_PHRASES = [
    r"\bas an ai assistant,?\s*",
    r"\bas an artificial intelligence,?\s*",
    r"\bi can confirm that\s+",
    r"\bbased on the information provided,?\s*",
    r"\bit is important to note that\s+",
]

FILLER_PREFIXES = {
    "certainly": "Yeah",
    "sure": "Yeah",
    "of course": "Yeah",
}


@dataclass(frozen=True)
class ConversationTiming:
    acknowledgement_ms: int
    interruption_resume_ms: int
    silence_timeout_ms: int
    max_spoken_sentences: int


class OrbConversationPolicy:
    """Shapes Orb into a concise, calm spoken care assistant."""

    def provider_instructions(self, *, decision: OrbModeDecision, preferences: OrbPreferences) -> str:
        detail = preferences.response_detail
        max_sentences = 2 if preferences.concise_answers or detail == "concise" else 4
        return (
            "Conversation style: speak like a calm senior colleague in a children's home. "
            "Use short natural sentences, no 'AI assistant' phrasing, no theatrics, and no long preamble. "
            f"Keep spoken answers to about {max_sentences} sentence(s) unless safeguarding detail is essential. "
            "If interrupted, stop cleanly and continue from the user's new intent. "
            "Do not read citations aloud unless explicitly asked."
        )

    def timing(self, *, preferences: OrbPreferences) -> ConversationTiming:
        sensitivity = preferences.interruption_sensitivity or "medium"
        return ConversationTiming(
            acknowledgement_ms=180 if sensitivity == "high" else 260,
            interruption_resume_ms=220 if sensitivity != "low" else 360,
            silence_timeout_ms=9000 if preferences.microphone_mode == "open_mic" else 12000,
            max_spoken_sentences=2 if preferences.concise_answers else 4,
        )

    def shape_response(
        self,
        text: str,
        *,
        decision: OrbModeDecision | None = None,
        preferences: OrbPreferences | None = None,
        interrupted: bool = False,
    ) -> str:
        shaped = (text or "").strip()
        for phrase in AI_PHRASES:
            shaped = re.sub(phrase, "", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\s+", " ", shaped)
        shaped = self._naturalise_opening(shaped)
        shaped = self._suppress_filler(shaped)
        shaped = self._shorten(shaped, decision=decision, preferences=preferences, interrupted=interrupted)
        return shaped.strip()

    def spoken_payload(self, text: str, *, preferences: OrbPreferences | None = None) -> str:
        shaped = self.shape_response(text, preferences=preferences)
        shaped = re.sub(r"\[[^\]]*(citation|source)[^\]]*\]", "", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\((source|citation)[^)]+\)", "", shaped, flags=re.IGNORECASE)
        return re.sub(r"\s+", " ", shaped).strip()

    def continuation_prompt(self, *, interrupted_response: str | None, user_text: str | None = None) -> str:
        if not interrupted_response:
            return "Yeah. Go ahead."
        if user_text:
            return "Yeah, I heard you. I’ll follow that instead."
        return "Yeah. I’ll pause there."

    def event_metadata(self, *, preferences: OrbPreferences) -> dict[str, Any]:
        timing = self.timing(preferences=preferences)
        return {
            "acknowledgement_ms": timing.acknowledgement_ms,
            "interruption_resume_ms": timing.interruption_resume_ms,
            "silence_timeout_ms": timing.silence_timeout_ms,
            "max_spoken_sentences": timing.max_spoken_sentences,
            "filler_suppression": True,
            "overtalk_prevention": True,
        }

    def _naturalise_opening(self, text: str) -> str:
        if not text:
            return text
        lowered = text.lower()
        for prefix, replacement in FILLER_PREFIXES.items():
            if lowered.startswith(prefix):
                return replacement + text[len(prefix):]
        return text

    def _suppress_filler(self, text: str) -> str:
        text = re.sub(r"^(yeah,\s*){2,}", "Yeah, ", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(please note that|for your information)\b,?\s*", "", text, flags=re.IGNORECASE)
        return text

    def _shorten(
        self,
        text: str,
        *,
        decision: OrbModeDecision | None,
        preferences: OrbPreferences | None,
        interrupted: bool,
    ) -> str:
        if not text:
            return text
        max_sentences = 2
        if preferences and not preferences.concise_answers:
            max_sentences = 4
        if decision and "safeguarding_sensitive" in decision.safety_flags:
            max_sentences = max(max_sentences, 3)
        if interrupted:
            max_sentences = 1
        sentences = re.split(r"(?<=[.!?])\s+", text)
        if len(sentences) <= max_sentences:
            return text
        return " ".join(sentences[:max_sentences])


orb_conversation_policy = OrbConversationPolicy()
