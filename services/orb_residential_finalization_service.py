"""Canonical ORB Residential answer finalisation — single pipeline for all record surfaces."""

from __future__ import annotations

from typing import Any

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import (
    finalize_standalone_intelligence,
    merge_intelligence_into_context,
)
from services.orb_chat_timing_service import OrbChatTimingTracker
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service


def finalize_orb_residential_answer(
    raw_answer: str,
    *,
    user_input: str,
    intent: str | None = None,
    record_type: str | None = None,
    surface: str = "orb_residential",
    streaming: bool = False,
    context: dict[str, Any] | None = None,
    mode: str | None = None,
    indicare_intelligence: dict[str, Any] | None = None,
    record_learning: bool = True,
    apply_gate_fixes: bool = True,
    sanitize_closer: Any | None = None,
    timing: OrbChatTimingTracker | None = None,
) -> tuple[str, dict[str, Any]]:
    """Apply ORB Residential final answer repair and validation to any generated answer.

    All ORB Residential record-generation routes should call this (directly or via
    finalize_document_intelligence) so adult identity, children's home terminology,
    safeguarding boundaries and live record discipline run consistently.
    """
    ctx = dict(context or {})
    packet = indicare_intelligence
    if not packet:
        resolved_mode = mode or record_type or intent or "Ask ORB"
        packet = indicare_intelligence_core_service.build_intelligence_packet(
            user_input,
            mode=resolved_mode,
        )

    resolved_mode = mode or record_type or intent or "Ask ORB"
    closer = sanitize_closer or orb_grounded_answer_style_service.sanitize_high_attention_closer

    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer=raw_answer,
        prompt_text=user_input,
        message=user_input,
        mode=resolved_mode,
        record_learning=record_learning,
        apply_gate_fixes=apply_gate_fixes,
        sanitize_closer=closer,
        timing=timing,
    )

    meta["orb_residential_finalization"] = {
        "surface": surface,
        "streaming": streaming,
        "intent": intent,
        "record_type": record_type,
        "pipeline": "finalize_orb_residential_answer",
    }
    if ctx:
        meta["route_context"] = {k: v for k, v in ctx.items() if k not in ("indicare_intelligence",)}

    return answer, meta


def merge_residential_finalization_into_context(
    context_used: dict[str, Any],
    finalization_meta: dict[str, Any],
) -> dict[str, Any]:
    """Merge finalisation metadata into route context_used payloads."""
    return merge_intelligence_into_context(context_used, finalization_meta)


__all__ = [
    "finalize_orb_residential_answer",
    "merge_residential_finalization_into_context",
]
