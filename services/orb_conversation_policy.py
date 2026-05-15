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
    r"\bbased on the records available,?\s*",
    r"\bbased on the available records,?\s*",
    r"\bit is important to note that\s+",
    r"\bi am analysing the chronology\.?",
    r"\bi am processing that request\.?",
    r"\bi will now provide\b\s*",
    r"\bthe system indicates that\s+",
    r"\bthe system indicates,?\s*",
    r"\baccording to the system,?\s*",
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
    first_partial_ms: int
    chunk_pacing_ms: int


@dataclass(frozen=True)
class EmotionalCadence:
    idle_motion: str
    listening_motion: str
    thinking_motion: str
    speaking_motion: str
    acknowledgement: str
    silence_prompt: str
    ambient_sound_hook: str | None = None


class OrbConversationPolicy:
    """Shapes Orb into a concise, calm spoken care assistant."""

    def provider_instructions(self, *, decision: OrbModeDecision, preferences: OrbPreferences) -> str:
        detail = preferences.response_detail
        max_sentences = 2 if preferences.concise_answers or detail == "concise" else 4
        return (
            "Conversation style: speak like a calm British senior colleague in a children's home. "
            "Use a calm British female voice profile, short natural sentences, light acknowledgement, small pauses, no 'AI assistant' phrasing, no Americanisms, no theatrics, and no long preamble. "
            f"Keep spoken answers to about {max_sentences} sentence(s) unless safeguarding detail is essential. "
            "Prefer phrases like 'I've linked that into Jamie's chronology', 'There's still a follow-up outstanding from yesterday', and 'Would you like help drafting that review?' over technical analysis language. "
            "If interrupted, stop cleanly, hold the unfinished thought, and continue from the user's new intent without restarting. "
            "Start with a short acknowledgement when useful, then stream the answer in small chunks with small pauses. "
            "When there is silence, stay present without pushing; use 'Take your time' or 'I'm still here'. "
            "For care records, answer operationally: what happened, what still needs follow-up, what changed, safeguarding context, positive progress, and the child's voice when visible. "
            "Do not read citations aloud unless explicitly asked."
        )

    def timing(self, *, preferences: OrbPreferences) -> ConversationTiming:
        sensitivity = preferences.interruption_sensitivity or "medium"
        return ConversationTiming(
            acknowledgement_ms=140 if sensitivity == "high" else 220,
            interruption_resume_ms=180 if sensitivity != "low" else 320,
            silence_timeout_ms=11000 if preferences.microphone_mode == "open_mic" else 14000,
            max_spoken_sentences=2 if preferences.concise_answers else 4,
            first_partial_ms=260 if sensitivity == "high" else 360,
            chunk_pacing_ms=170 if preferences.speaking_speed == "fast" else 290 if preferences.speaking_speed == "slow" else 230,
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
        shaped = re.sub(r"\bbased on the records available,?\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bbased on the available records,?\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bbased on the chronology,?\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bbased on the information provided,?\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bi am analysing the chronology\.?\s*", "Hang on, I am just checking the chronology. ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bi am processing that request\.?\s*", "Give me a second. ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bthe system indicates that\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
        shaped = re.sub(r"\bthe system indicates,?\s*", "From what I can see, ", shaped, flags=re.IGNORECASE)
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
            return "Yeah, I heard you. I will follow that instead."
        return "Yeah. I will pause there."

    def event_metadata(self, *, preferences: OrbPreferences) -> dict[str, Any]:
        timing = self.timing(preferences=preferences)
        cadence = self.cadence(preferences=preferences)
        return {
            "acknowledgement_ms": timing.acknowledgement_ms,
            "interruption_resume_ms": timing.interruption_resume_ms,
            "silence_timeout_ms": timing.silence_timeout_ms,
            "max_spoken_sentences": timing.max_spoken_sentences,
            "first_partial_ms": timing.first_partial_ms,
            "chunk_pacing_ms": timing.chunk_pacing_ms,
            "pause_after_acknowledgement_ms": 220 if preferences.quiet_mode else 170,
            "breathing_idle_state": True,
            "listening_shimmer": cadence.listening_motion,
            "speaking_cadence_glow": cadence.speaking_motion,
            "emotional_cadence": cadence.__dict__,
            "filler_suppression": True,
            "overtalk_prevention": True,
            "partial_transcript_streaming": True,
            "contextual_continuation_memory": True,
            "voice_quality": {
                "accent": "British",
                "gender_presentation": "female",
                "tone": "calm, warm, concise",
                "pace": preferences.speaking_speed,
            },
            "soft_acknowledgements": self.soft_acknowledgements(preferences=preferences),
        }

    def soft_acknowledgements(self, *, preferences: OrbPreferences) -> list[str]:
        if preferences.quiet_mode:
            return ["Mm. I am with you.", "Take your time.", "Right. I have that."]
        return ["Yeah. I am with you.", "Right. I have that.", "I will keep it brief."]

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
        text = re.sub(r"\butilize\b", "use", text, flags=re.IGNORECASE)
        text = re.sub(r"\banalyze\b", "look at", text, flags=re.IGNORECASE)
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
        if decision and decision.care_scope_required:
            max_sentences = max(max_sentences, 3)
        if decision and "safeguarding_sensitive" in decision.safety_flags:
            max_sentences = max(max_sentences, 3)
        if interrupted:
            max_sentences = 1
        sentences = re.split(r"(?<=[.!?])\s+", text)
        if len(sentences) <= max_sentences:
            return text
        return " ".join(sentences[:max_sentences])

    def cadence(self, *, preferences: OrbPreferences) -> EmotionalCadence:
        quiet = preferences.quiet_mode
        return EmotionalCadence(
            idle_motion="breathing_slow",
            listening_motion="shimmer_soft" if quiet else "shimmer_present",
            thinking_motion="wave_slow",
            speaking_motion="cadence_glow",
            acknowledgement="Mm. I am with you." if quiet else "Yeah. I am with you.",
            silence_prompt="Take your time." if quiet else "I’m still here.",
            ambient_sound_hook="orb_room_tone_quiet" if quiet else "orb_room_tone_soft",
        )

    def response_chunks(self, text: str, *, preferences: OrbPreferences | None = None) -> list[dict[str, Any]]:
        shaped = self.spoken_payload(text, preferences=preferences)
        if not shaped:
            return []
        timing = self.timing(preferences=preferences or OrbPreferences())
        sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", shaped) if sentence.strip()]
        return [
            {"index": index, "text": sentence, "delay_ms": timing.first_partial_ms if index == 0 else timing.chunk_pacing_ms}
            for index, sentence in enumerate(sentences)
        ]


orb_conversation_policy = OrbConversationPolicy()
