"""Phase 5K — compress ORB Voice replies for live speech."""

from __future__ import annotations

import re

VOICE_FAST_MAX_WORDS = 40
VOICE_SPECIALIST_MAX_WORDS = 55
VOICE_SAFEGUARDING_MAX_WORDS = 65
VOICE_TTS_CHAR_SOFT_CAP = 180
VOICE_TTS_CHAR_HARD_CAP = 220

_GENERIC_WELLBEING = re.compile(
    r"\b(emotional well-?being|wellbeing journey|holistic support|self-?care journey|take care of yourself)\b",
    re.IGNORECASE,
)
_CHECKLIST_LEAD = re.compile(r"^(?:first|second|third|finally|also|next)\s*,", re.IGNORECASE)

_INTENT_FALLBACKS: dict[str, str] = {
    "bullying_or_peer_conflict": (
        "Who was involved, what was actually seen or heard, and what did adults do immediately "
        "to keep both young people safe?"
    ),
    "supervision_prep": (
        "What is the main thing you want to take into supervision — the incident itself, your response, "
        "or the support you need next?"
    ),
    "safeguarding_concern": (
        "What happened, who is safe right now, and what has already been done under your home safeguarding procedure?"
    ),
}


def _count_words(text: str) -> int:
    return len(re.findall(r"\S+", text.strip()))


def _cap_words(text: str, max_words: int) -> str:
    words = re.findall(r"\S+", text.strip())
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).rstrip(".,;:") + "…"


def _cap_chars(text: str, hard_cap: int, soft_cap: int | None = None) -> str:
    trimmed = text.strip()
    if len(trimmed) <= hard_cap:
        return trimmed
    slice_at = soft_cap if soft_cap is not None else hard_cap
    clipped = trimmed[:slice_at]
    last_space = clipped.rfind(" ")
    safe = clipped[:last_space] if last_space > slice_at * 0.6 else clipped
    return safe.strip() + "…"


def _strip_markdown(text: str) -> str:
    cleaned = re.sub(r"[#*_`]", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def _prefer_focused_question(text: str) -> str:
    parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+(?=[A-Z\"“])", text) if part.strip()]
    if len(parts) <= 2:
        return text
    question = next((part for part in reversed(parts) if "?" in part), None)
    if not question:
        return " ".join(parts[-2:])
    setup = next((part for part in parts if "?" not in part and len(part) < 90), None)
    return f"{setup} {question}".strip() if setup else question


def _resolve_max_words(tier: str | None) -> int:
    normalised = (tier or "voice_fast").strip().lower()
    if normalised == "voice_safeguarding":
        return VOICE_SAFEGUARDING_MAX_WORDS
    if normalised == "voice_specialist":
        return VOICE_SPECIALIST_MAX_WORDS
    return VOICE_FAST_MAX_WORDS


def compress_voice_reply_for_speech(
    reply: str,
    *,
    intent: str | None = None,
    tier: str | None = None,
    personality: str | None = None,
    safety_boundary_applied: bool = False,
) -> str:
    del personality  # reserved for future tone-aware compression
    cleaned = _strip_markdown(reply or "")
    if not cleaned:
        return cleaned

    cleaned = _GENERIC_WELLBEING.sub("", cleaned)
    cleaned = _CHECKLIST_LEAD.sub("", cleaned).strip()
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = _prefer_focused_question(cleaned)

    max_words = _resolve_max_words(tier)
    if _count_words(cleaned) > max_words:
        fallback = _INTENT_FALLBACKS.get((intent or "").strip().lower())
        cleaned = fallback if fallback and _count_words(fallback) <= max_words else _cap_words(cleaned, max_words)

    if safety_boundary_applied and "safeguarding procedure" not in cleaned.lower():
        boundary = "First, make sure immediate safety and your home's safeguarding procedure have been followed."
        combined = f"{cleaned} {boundary}"
        cleaned = _cap_words(combined, max_words + 12) if _count_words(combined) > max_words + 12 else combined

    return _cap_chars(cleaned, VOICE_TTS_CHAR_HARD_CAP, VOICE_TTS_CHAR_SOFT_CAP)
