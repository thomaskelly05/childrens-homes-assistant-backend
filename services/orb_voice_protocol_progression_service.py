"""ORB Voice v2 — progressive protocol questions without repeating answered slots."""

from __future__ import annotations

import re
from typing import Any

_BULLYING_OPENING = (
    "Who was involved, what was actually seen or heard, "
    "and what did adults do immediately to keep both young people safe?"
)

_BULLYING_SLOT_PATTERNS: dict[str, re.Pattern[str]] = {
    "peopleInvolvedKnown": re.compile(
        r"\b(two young people|young people involved|both young people|who was involved|"
        r"yp\b|young person|children involved|pupils involved|residents involved)\b",
        re.I,
    ),
    "observedOrReportedKnown": re.compile(
        r"\b(seen|heard|witnessed|observed|reported|overheard|shouting|name[\s-]?calling)\b",
        re.I,
    ),
    "adultResponseKnown": re.compile(
        r"\b(separated|intervened|de[\s-]?escalat|spoke to|checked|monitored|"
        r"removed|took to|calmed|supported|staff responded|adults did)\b",
        re.I,
    ),
    "immediateSafetyKnown": re.compile(
        r"\b(safe now|everyone is safe|no longer at risk|calmed down|"
        r"separated and safe|immediate safety)\b",
        re.I,
    ),
    "ongoingRiskKnown": re.compile(
        r"\b(pattern|ongoing|repeated|wider|escalat|again|recurring|follow[\s-]?up)\b",
        re.I,
    ),
}

_BULLYING_PROGRESSIVE: list[tuple[str, str]] = [
    (
        "peopleInvolvedKnown",
        "Thank you. What was actually seen or heard, and what did adults do at the time to keep both young people safe?",
    ),
    (
        "observedOrReportedKnown",
        "That helps. What did adults do at the time — separate, monitor, or speak with each young person?",
    ),
    (
        "adultResponseKnown",
        "That helps. Is everyone safe now, and is there any sign this is part of a wider pattern?",
    ),
    (
        "immediateSafetyKnown",
        "Understood. Who may need informing, and what may need recording from here?",
    ),
    (
        "ongoingRiskKnown",
        "What follow-up or oversight would help you feel this is being handled proportionately?",
    ),
]

_INCIDENT_PROGRESSIVE: list[tuple[str, str]] = [
    (
        "sequenceKnown",
        "Thank you. What was the child's presentation, and what did adults do to support them?",
    ),
    (
        "childPresentationKnown",
        "What follow-up or recording may be needed from here?",
    ),
]

_INCIDENT_SLOT_PATTERNS: dict[str, re.Pattern[str]] = {
    "sequenceKnown": re.compile(r"\b(happened|then|after|before|sequence|started when)\b", re.I),
    "childPresentationKnown": re.compile(r"\b(presentation|distress|upset|calm|withdrawn|agitated)\b", re.I),
    "adultResponseKnown": re.compile(r"\b(adult|staff|responded|intervened|supported|de[\s-]?escalat)\b", re.I),
}

_SAFEGUARDING_PROGRESSIVE: list[tuple[str, str]] = [
    (
        "immediateSafetyKnown",
        "Thank you. What is known versus suspected, and who has been informed so far?",
    ),
    (
        "knownVsSuspectedKnown",
        "Who may need informing next under your home safeguarding procedure?",
    ),
]


def _normalise_slots(raw: dict[str, Any] | None) -> dict[str, bool]:
    slots = dict(raw or {})
    return {str(k): bool(v) for k, v in slots.items()}


def update_protocol_slots(
    memory: dict[str, Any] | None,
    *,
    transcript: str,
    intent: str,
) -> dict[str, bool]:
    base = _normalise_slots((memory or {}).get("protocolSlots") or (memory or {}).get("protocol_slots"))
    text = (transcript or "").strip()
    if not text:
        return base

    patterns: dict[str, re.Pattern[str]] = {}
    if intent == "bullying_or_peer_conflict":
        patterns = _BULLYING_SLOT_PATTERNS
    elif intent == "incident_reflection":
        patterns = _INCIDENT_SLOT_PATTERNS
    elif intent == "safeguarding_thinking":
        patterns = {
            "immediateSafetyKnown": re.compile(r"\b(safe|safety|secure|no immediate risk)\b", re.I),
            "knownVsSuspectedKnown": re.compile(r"\b(known|suspected|disclosed|told us|reported)\b", re.I),
        }

    for slot, pattern in patterns.items():
        if pattern.search(text):
            base[slot] = True
    return base


def _next_progressive_question(intent: str, slots: dict[str, bool]) -> str | None:
    if intent == "bullying_or_peer_conflict":
        for slot, question in _BULLYING_PROGRESSIVE:
            if not slots.get(slot):
                return question
        return None
    if intent == "incident_reflection":
        if not slots.get("sequenceKnown"):
            return "Walk me through what happened in order — what triggered it and what adults did?"
        if not slots.get("childPresentationKnown"):
            return _INCIDENT_PROGRESSIVE[0][1]
        if not slots.get("adultResponseKnown"):
            return _INCIDENT_PROGRESSIVE[1][1]
        return None
    if intent == "safeguarding_thinking":
        if not slots.get("immediateSafetyKnown"):
            return "First, is everyone safe right now — what is known about immediate safety?"
        if not slots.get("knownVsSuspectedKnown"):
            return _SAFEGUARDING_PROGRESSIVE[1][1]
        return None
    return None


def protocol_progression_prompt_block(memory: dict[str, Any] | None, intent: str) -> str:
    slots = _normalise_slots((memory or {}).get("protocolSlots") or (memory or {}).get("protocol_slots"))
    next_q = _next_progressive_question(intent, slots)
    if not next_q:
        return ""
    answered = [name for name, filled in slots.items() if filled]
    answered_note = f"Slots already covered: {', '.join(answered)}." if answered else ""
    return (
        "Protocol progression: do not repeat questions for information the adult already gave. "
        f"{answered_note} Ask only this next focused question: {next_q}"
    ).strip()


def _looks_like_bullying_repeat(reply: str, slots: dict[str, bool]) -> bool:
    lower = reply.lower()
    if slots.get("peopleInvolvedKnown") and "who was involved" in lower and "seen or heard" in lower:
        return True
    return False


def refine_voice_reply_for_progression(
    reply: str,
    *,
    intent: str,
    memory: dict[str, Any] | None,
) -> str:
    slots = _normalise_slots((memory or {}).get("protocolSlots") or (memory or {}).get("protocol_slots"))
    next_q = _next_progressive_question(intent, slots)
    if not next_q:
        return reply

    if intent == "bullying_or_peer_conflict":
        if not slots.get("peopleInvolvedKnown") and not reply.strip():
            return _BULLYING_OPENING
        if _looks_like_bullying_repeat(reply, slots):
            return next_q

    lower = reply.lower()
    if intent == "bullying_or_peer_conflict" and slots.get("peopleInvolvedKnown"):
        if "who was involved" in lower and "seen or heard" in lower:
            return next_q

    return reply
