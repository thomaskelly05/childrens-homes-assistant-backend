"""ORB brain selection shadow mode — measure tier choices without changing live routing.

Calls ``orb_brain_selection_service`` on every ORB Residential request, logs the
recommended tier alongside the live ``prompt_tier`` / ``expert_depth``, and returns
metadata for ``context_used``. Does not alter prompts, models, retrieval, or routing.
"""

from __future__ import annotations

import logging
from typing import Any

from services.orb_brain_selection_service import (
    BrainSelectionResult,
    orb_brain_selection_service,
)

logger = logging.getLogger("indicare.orb_brain_selection_shadow")

_PROMPT_TIER_TO_UNIFIED = {
    "fast": "quick",
    "residential": "standard",
    "deep": "deep",
}

_EXPERT_DEPTH_TO_UNIFIED = {
    "general_light": "quick",
    "residential_light": "standard",
    "residential_standard": "standard",
    "residential_deep": "deep",
    "safeguarding_critical": "deep",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _unified_from_prompt_tier(prompt_tier: str | None) -> str | None:
    tier = _text(prompt_tier).lower()
    if not tier:
        return None
    return _PROMPT_TIER_TO_UNIFIED.get(tier)


def _unified_from_expert_depth(expert_depth: str | None) -> str | None:
    depth = _text(expert_depth).lower()
    if not depth:
        return None
    return _EXPERT_DEPTH_TO_UNIFIED.get(depth)


def _build_shadow_payload(
    result: BrainSelectionResult,
    *,
    live_prompt_tier: str | None,
    live_expert_depth: str | None,
) -> dict[str, Any]:
    live_prompt = _text(live_prompt_tier) or None
    live_expert = _text(live_expert_depth) or None
    live_unified_from_prompt = _unified_from_prompt_tier(live_prompt)
    live_unified_from_expert = _unified_from_expert_depth(live_expert)

    agrees_with_prompt_tier = bool(live_prompt) and result.prompt_tier == live_prompt
    agrees_with_expert_depth = bool(live_expert) and result.expert_depth == live_expert
    agrees_with_unified_from_prompt_tier = (
        live_unified_from_prompt is not None and result.tier == live_unified_from_prompt
    )
    agrees_with_unified_from_expert_depth = (
        live_unified_from_expert is not None and result.tier == live_unified_from_expert
    )

    return {
        "shadow_mode": True,
        "tier": result.tier,
        "confidence": result.confidence,
        "reason": result.reason,
        "recommended_route": result.recommended_route,
        "selected_prompt_tier": result.prompt_tier,
        "selected_expert_depth": result.expert_depth,
        "selected_agent_depth": result.agent_depth,
        "live_prompt_tier": live_prompt,
        "live_expert_depth": live_expert,
        "live_unified_tier_from_prompt_tier": live_unified_from_prompt,
        "live_unified_tier_from_expert_depth": live_unified_from_expert,
        "agrees_with_prompt_tier": agrees_with_prompt_tier,
        "agrees_with_expert_depth": agrees_with_expert_depth,
        "agrees_with_unified_tier_from_prompt_tier": agrees_with_unified_from_prompt_tier,
        "agrees_with_unified_tier_from_expert_depth": agrees_with_unified_from_expert_depth,
        "signals": result.signals,
    }


def run_brain_selection_shadow(
    prompt: str,
    *,
    mode: str | None = None,
    attachments: list[Any] | None = None,
    agent_type: str | None = None,
    prompt_tier: str | None = None,
    expert_depth: str | None = None,
    route: str | None = None,
) -> dict[str, Any]:
    """Run brain selection in shadow mode and return ``brain_selection_shadow`` metadata."""
    result = orb_brain_selection_service.select_brain(
        prompt,
        mode=mode,
        attachments=attachments,
        agent_type=agent_type,
    )
    shadow = _build_shadow_payload(
        result,
        live_prompt_tier=prompt_tier,
        live_expert_depth=expert_depth,
    )
    logger.info(
        "orb_brain_selection_shadow route=%s tier=%s confidence=%s reason=%s "
        "live_prompt_tier=%s live_expert_depth=%s agrees_prompt_tier=%s agrees_expert_depth=%s "
        "agrees_unified_prompt=%s agrees_unified_expert=%s",
        route or "unknown",
        shadow["tier"],
        shadow["confidence"],
        shadow["reason"],
        shadow.get("live_prompt_tier"),
        shadow.get("live_expert_depth"),
        shadow.get("agrees_with_prompt_tier"),
        shadow.get("agrees_with_expert_depth"),
        shadow.get("agrees_with_unified_tier_from_prompt_tier"),
        shadow.get("agrees_with_unified_tier_from_expert_depth"),
    )
    return shadow


def attach_brain_selection_shadow(
    context_used: dict[str, Any] | None,
    shadow: dict[str, Any] | None,
) -> dict[str, Any]:
    """Merge shadow metadata into ``context_used`` when present."""
    base = dict(context_used or {})
    if shadow:
        base["brain_selection_shadow"] = shadow
    return base
