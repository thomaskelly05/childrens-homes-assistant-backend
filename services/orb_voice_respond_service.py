"""Lightweight ORB Voice brain — short reflective replies without deep retrieval."""

from __future__ import annotations

import logging
import os
import re
from typing import Any

from services.ai_external_call_governance import FEATURE_VOICE_RESPOND, governed_draft_text

logger = logging.getLogger(__name__)

VOICE_RESPOND_MAX_WORDS = int(os.environ.get("ORB_VOICE_RESPOND_MAX_WORDS") or "80")
VOICE_RESPOND_MODEL = (os.environ.get("ORB_VOICE_RESPOND_MODEL") or "gpt-4o-mini").strip()
VOICE_RESPOND_MAX_OUTPUT_TOKENS = int(os.environ.get("ORB_VOICE_RESPOND_MAX_OUTPUT_TOKENS") or "180")

VOICE_SYSTEM_PROMPT = (
    "You are ORB Voice, a reflective voice companion for adults in Ofsted-regulated children's homes. "
    "Respond briefly, warmly and professionally in British English. Ask one useful reflective question. "
    "Keep the child central. Do not make safeguarding decisions. "
    "If risk or safeguarding is mentioned, remind the adult to follow local policy and management oversight. "
    f"Keep each reply under {VOICE_RESPOND_MAX_WORDS} words unless the adult explicitly asks for more detail."
)

RISK_KEYWORDS = (
    "abuse",
    "assault",
    "suicide",
    "self-harm",
    "weapon",
    "missing",
    "police",
    "ambulance",
    "a&e",
    "injury",
    "sexual",
    "exploitation",
    "neglect",
)

SAFETY_BOUNDARY_LINE = (
    "Follow your home's safeguarding procedure and management oversight for any immediate risk."
)


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in history or []:
        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or item.get("text") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        rows.append({"role": role, "content": content})
    return rows[-8:]


def _needs_safety_boundary(message: str, mode: str | None) -> bool:
    lower = message.lower()
    if any(keyword in lower for keyword in RISK_KEYWORDS):
        return True
    normalised_mode = (mode or "").strip().lower()
    return "safeguard" in normalised_mode


def _needs_policy_retrieval(message: str) -> bool:
    lower = message.lower()
    return any(
        phrase in lower
        for phrase in (
            "regulation",
            "ofsted",
            "statutory",
            "guidance",
            "reg 44",
            "regulation 44",
            "children's homes regulations",
        )
    )


def _cap_words(text: str, max_words: int = VOICE_RESPOND_MAX_WORDS) -> str:
    words = re.findall(r"\S+", text.strip())
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).rstrip(".,;:") + "…"


def _build_prompt(
    *,
    message: str,
    history: list[dict[str, str]],
    mode: str | None,
    session_memory: dict[str, Any] | None,
) -> str:
    lines = [f"Reflective mode: {(mode or 'conversational').strip()}."]
    memory = session_memory or {}
    if memory.get("adultTurnCount"):
        lines.append(f"Voice session turn: {memory.get('adultTurnCount')}.")
    if memory.get("mentionedPeople"):
        people = ", ".join(str(p) for p in memory.get("mentionedPeople") or [])
        if people:
            lines.append(f"People mentioned in session: {people}.")
    if history:
        lines.append("Recent conversation:")
        for turn in history:
            label = "Adult" if turn["role"] == "user" else "ORB"
            lines.append(f"{label}: {turn['content']}")
    lines.append(f"Adult now says: {message.strip()}")
    lines.append("Reply in 1–4 short spoken sentences with one reflective question.")
    return "\n".join(lines)


def generate_voice_response(
    *,
    message: str,
    mode: str | None = None,
    history: list[dict[str, Any]] | None = None,
    session_memory: dict[str, Any] | None = None,
    user_id: int | None = None,
    provider_id: int | None = None,
    home_id: int | None = None,
) -> dict[str, Any]:
    cleaned = (message or "").strip()
    if not cleaned:
        raise ValueError("message_required")

    safety_boundary = _needs_safety_boundary(cleaned, mode)
    policy_lookup = _needs_policy_retrieval(cleaned)
    compact_history = _normalise_history(history)
    prompt = _build_prompt(
        message=cleaned,
        history=compact_history,
        mode=mode,
        session_memory=session_memory,
    )

    logger.info(
        "orb_voice_respond request prompt_tier=voice_fast embeddings=0 retrieval=%s text_len=%s history_turns=%s",
        policy_lookup,
        len(cleaned),
        len(compact_history),
    )

    gateway = governed_draft_text(
        feature=FEATURE_VOICE_RESPOND,
        system_prompt=VOICE_SYSTEM_PROMPT,
        prompt=prompt,
        model=VOICE_RESPOND_MODEL,
        user_id=user_id,
        provider_id=provider_id,
        home_id=home_id,
        max_output_tokens=VOICE_RESPOND_MAX_OUTPUT_TOKENS,
        metadata={
            "route": "orb_voice_respond",
            "prompt_tier": "voice_fast",
            "embeddings_used": False,
            "retrieval_used": policy_lookup,
            "session_only": True,
        },
    )

    reply = _cap_words(str(gateway.text or "").strip())
    if not reply:
        reply = (
            "I can help you think that through. What happened just before things escalated, "
            "and what did adults do to support the young person?"
        )

    if safety_boundary and SAFETY_BOUNDARY_LINE.lower() not in reply.lower():
        reply = f"{reply} {SAFETY_BOUNDARY_LINE}"

    reply = _cap_words(reply)

    logger.info(
        "orb_voice_respond success prompt_tier=voice_fast reply_chars=%s safety_boundary=%s",
        len(reply),
        safety_boundary,
    )

    return {
        "reply": reply,
        "mode": (mode or "conversational").strip(),
        "safetyBoundaryApplied": safety_boundary,
        "shouldEscalateToPolicyReminder": safety_boundary,
        "prompt_tier": "voice_fast",
        "embeddings_used": False,
        "retrieval_used": policy_lookup,
    }
