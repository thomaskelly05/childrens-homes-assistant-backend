"""Lightweight ORB Voice brain — two-speed routing with specialist ORB Residential brain."""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

from services.ai_external_call_governance import FEATURE_VOICE_RESPOND, governed_draft_text
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_recording_contract_service import build_recording_contract_prompt_block
from services.orb_safety_scaffold_service import orb_safety_scaffold_service
from services.orb_voice_brain_router_service import (
    classify_voice_intent,
    log_voice_brain_route,
    update_session_memory,
)

logger = logging.getLogger(__name__)

VOICE_RESPOND_MAX_WORDS = int(os.environ.get("ORB_VOICE_RESPOND_MAX_WORDS") or "70")
VOICE_RESPOND_MIN_WORDS = 30
VOICE_RESPOND_MODEL = (os.environ.get("ORB_VOICE_RESPOND_MODEL") or "gpt-4o-mini").strip()
VOICE_RESPOND_MAX_OUTPUT_TOKENS = int(os.environ.get("ORB_VOICE_RESPOND_MAX_OUTPUT_TOKENS") or "200")
VOICE_SPECIALIST_MODEL = (os.environ.get("ORB_VOICE_SPECIALIST_MODEL") or VOICE_RESPOND_MODEL).strip()

VOICE_SYSTEM_PROMPT_BASE = (
    "You are ORB Voice, a specialist reflective companion for adults in Ofsted-regulated children's homes. "
    "Respond briefly, warmly and professionally in British English. "
    "Use practical residential childcare language — child-centred, factual and reflective. "
    "Ask one focused question (not a checklist unless the adult asks for more). "
    "Do not diagnose, make safeguarding decisions, or offer compliance guarantees. "
    "Do not use generic wellbeing language like 'emotional well-being' when practical facts are needed. "
    f"Keep each live reply between {VOICE_RESPOND_MIN_WORDS} and {VOICE_RESPOND_MAX_WORDS} words."
)

SAFETY_BOUNDARY_LINE = (
    "First, make sure immediate safety and your home's safeguarding procedure have been followed."
)

_POLICY_RETRIEVAL_PHRASES = (
    "regulation",
    "ofsted",
    "statutory",
    "guidance",
    "reg 44",
    "regulation 44",
    "children's homes regulations",
)


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in history or []:
        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or item.get("text") or "").strip()
        if not content:
            continue
        if role in {"adult", "user"}:
            rows.append({"role": "user", "content": content})
        elif role in {"orb", "assistant"}:
            rows.append({"role": "assistant", "content": content})
    return rows[-8:]


def _needs_policy_retrieval(message: str) -> bool:
    lower = message.lower()
    return any(phrase in lower for phrase in _POLICY_RETRIEVAL_PHRASES)


def _cap_words(text: str, max_words: int = VOICE_RESPOND_MAX_WORDS) -> str:
    words = re.findall(r"\S+", text.strip())
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).rstrip(".,;:") + "…"


def _tier_system_prompt(tier: str, protocol_block: str, convergence_block: str, scaffold_block: str) -> str:
    parts = [VOICE_SYSTEM_PROMPT_BASE]
    if tier == "voice_fast":
        parts.append("This is a quick reflective turn — stay concise with no retrieval.")
    elif tier == "voice_specialist":
        parts.append("Use ORB Residential specialist reflective guidance. Stay voice-shaped and concise.")
        if convergence_block:
            parts.append(convergence_block)
        if protocol_block:
            parts.append(protocol_block)
    else:
        parts.append("Safeguarding-aware reflective support. Do not make findings or decisions.")
        if scaffold_block:
            parts.append(scaffold_block)
        if convergence_block:
            parts.append(convergence_block)
        if protocol_block:
            parts.append(protocol_block)
    return "\n\n".join(part for part in parts if part).strip()


def _build_prompt(
    *,
    message: str,
    history: list[dict[str, str]],
    mode: str | None,
    session_memory: dict[str, Any] | None,
    route_intent: str,
) -> str:
    lines = [f"Reflective mode: {(mode or 'conversational').strip()}.", f"Detected intent: {route_intent}."]
    memory = session_memory or {}
    if memory.get("adultTurnCount"):
        lines.append(f"Voice session turn: {memory.get('adultTurnCount')}.")
    if memory.get("keyPeopleMentioned") or memory.get("key_people_mentioned"):
        people = memory.get("keyPeopleMentioned") or memory.get("key_people_mentioned") or []
        lines.append(f"People mentioned in session: {', '.join(str(p) for p in people)}.")
    if memory.get("knownFacts") or memory.get("known_facts"):
        facts = memory.get("knownFacts") or memory.get("known_facts") or []
        lines.append("Known facts so far:")
        for fact in facts[-4:]:
            lines.append(f"- {fact}")
    if memory.get("missingInfo") or memory.get("missing_info"):
        gaps = memory.get("missingInfo") or memory.get("missing_info") or []
        lines.append(f"Gaps to explore if helpful: {', '.join(str(g) for g in gaps[:4])}.")
    if history:
        lines.append("Recent conversation:")
        for turn in history:
            label = "Adult" if turn["role"] == "user" else "ORB"
            lines.append(f"{label}: {turn['content']}")
    lines.append(f"Adult now says: {message.strip()}")
    lines.append(
        "Reply in 1–3 short spoken sentences with one practical reflective question. "
        "Sound like ORB, not generic AI."
    )
    return "\n".join(lines)


def _brain_blocks(
    *,
    message: str,
    mode: str | None,
    tier: str,
    history: list[dict[str, str]],
    retrieval_needed: bool,
) -> tuple[str, str, str, dict[str, Any]]:
    convergence_block = ""
    scaffold_block = ""
    brain_meta: dict[str, Any] = {"brain_convergence": False, "safety_scaffold": False, "retrieval_used": False}

    if tier == "voice_fast":
        return convergence_block, scaffold_block, "", brain_meta

    scaffold = orb_safety_scaffold_service.build_from_message(message, mode=mode or "voice")
    brain_meta["safety_scaffold"] = True
    if tier == "voice_safeguarding" or scaffold.guardrail_active:
        scaffold_block = (
            "Safety scaffold: do not make safeguarding decisions; support immediate safety and escalation. "
            f"Risk level: {scaffold.risk_level}."
        )

    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        message,
        mode=mode or "voice",
        feature="voice",
        source_surface="voice",
        route="/orb/voice/v2/respond",
        prompt_tier="fast" if tier == "voice_specialist" else "deep",
        history=[{"role": t["role"], "content": t["content"]} for t in history],
    )
    convergence_block = orb_brain_convergence_orchestrator_service.build_convergence_prompt_block(decision)
    brain_meta["brain_convergence"] = True
    brain_meta["brain_metadata"] = orb_brain_convergence_orchestrator_service.convergence_metadata(
        decision,
        route="/orb/voice/v2/respond",
    )

    recording_block = ""
    if retrieval_needed:
        recording_block = build_recording_contract_prompt_block(message, note_type=None)
        brain_meta["retrieval_used"] = bool(recording_block)

    extra = "\n\n".join(part for part in (recording_block,) if part)
    return convergence_block, scaffold_block, extra, brain_meta


def generate_voice_response(
    *,
    message: str,
    mode: str | None = None,
    history: list[dict[str, Any]] | None = None,
    session_memory: dict[str, Any] | None = None,
    recent_turns: list[dict[str, Any]] | None = None,
    user_id: int | None = None,
    provider_id: int | None = None,
    home_id: int | None = None,
) -> dict[str, Any]:
    cleaned = (message or "").strip()
    if not cleaned:
        raise ValueError("transcript_required")

    started = time.perf_counter()
    compact_history = _normalise_history(history)
    turns_for_intent = recent_turns or [
        {"role": "user" if t["role"] == "user" else "orb", "text": t["content"]}
        for t in compact_history
    ]

    route = classify_voice_intent(transcript=cleaned, mode=mode, recent_turns=turns_for_intent)
    updated_memory = update_session_memory(session_memory, transcript=cleaned, route=route)
    policy_lookup = _needs_policy_retrieval(cleaned) or route.retrieval_needed

    convergence_block, scaffold_block, recording_extra, brain_meta = _brain_blocks(
        message=cleaned,
        mode=mode,
        tier=route.brain_tier,
        history=compact_history,
        retrieval_needed=policy_lookup,
    )

    protocol_block = route.protocol_block
    if recording_extra:
        protocol_block = f"{protocol_block}\n\n{recording_extra}".strip()

    system_prompt = _tier_system_prompt(route.brain_tier, protocol_block, convergence_block, scaffold_block)
    prompt = _build_prompt(
        message=cleaned,
        history=compact_history,
        mode=mode,
        session_memory=updated_memory,
        route_intent=route.intent,
    )

    model = VOICE_SPECIALIST_MODEL if route.brain_tier != "voice_fast" else VOICE_RESPOND_MODEL
    max_tokens = VOICE_RESPOND_MAX_OUTPUT_TOKENS if route.brain_tier == "voice_fast" else min(240, VOICE_RESPOND_MAX_OUTPUT_TOKENS + 40)

    logger.info(
        "orb_voice_respond request prompt_tier=%s intent=%s embeddings=0 retrieval=%s text_len=%s history_turns=%s",
        route.brain_tier,
        route.intent,
        policy_lookup,
        len(cleaned),
        len(compact_history),
    )

    gateway = governed_draft_text(
        feature=FEATURE_VOICE_RESPOND,
        system_prompt=system_prompt,
        prompt=prompt,
        model=model,
        user_id=user_id,
        provider_id=provider_id,
        home_id=home_id,
        max_output_tokens=max_tokens,
        metadata={
            "route": "orb_voice_respond",
            "prompt_tier": route.brain_tier,
            "voice_intent": route.intent,
            "embeddings_used": False,
            "retrieval_used": policy_lookup,
            "session_only": True,
            **brain_meta,
        },
    )

    reply = _cap_words(str(gateway.text or "").strip())
    if not reply:
        if route.intent == "bullying_or_peer_conflict":
            reply = (
                "Let's slow that down. Who was involved, what was actually seen or heard, "
                "and what did adults do immediately to keep both young people safe?"
            )
        else:
            reply = (
                "I can help you think that through. What happened just before things escalated, "
                "and what did adults do to support the young person?"
            )

    safety_boundary = route.should_use_safety_boundary
    if safety_boundary and SAFETY_BOUNDARY_LINE.lower() not in reply.lower():
        reply = f"{reply} {SAFETY_BOUNDARY_LINE}"

    reply = _cap_words(reply)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    log_voice_brain_route(route, elapsed_ms=elapsed_ms)

    logger.info(
        "orb_voice_respond ok prompt_tier=%s intent=%s elapsed_ms=%s reply_chars=%s safety_boundary=%s",
        route.brain_tier,
        route.intent,
        elapsed_ms,
        len(reply),
        safety_boundary,
    )

    return {
        "reply": reply,
        "mode": (mode or "conversational").strip(),
        "intent": route.intent,
        "brainTier": route.brain_tier,
        "riskLevel": route.risk_level,
        "safetyBoundaryApplied": safety_boundary,
        "shouldEscalateToPolicyReminder": safety_boundary,
        "prompt_tier": route.brain_tier,
        "promptTier": route.brain_tier,
        "embeddings_used": False,
        "retrieval_used": policy_lookup,
        "sessionMemory": updated_memory,
        "suggestedProtocol": route.suggested_protocol,
    }
