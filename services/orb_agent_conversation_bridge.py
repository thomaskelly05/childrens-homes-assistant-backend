"""Detects standalone agent intent in conversation — no OS record access."""

from __future__ import annotations

import re
from typing import Any

from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_registry_service import orb_agent_registry_service

AUTO_RUN_PATTERNS = (
    r"\bcreate a (?:manager )?briefing\b",
    r"\bdeep research\b",
    r"\bresearch what\b",
    r"\bcompare this policy\b",
    r"\bcreate (?:an? )?checklist\b",
    r"\bevidence map\b",
    r"\baction plan\b",
    r"\bmanager briefing\b",
)

SUGGEST_ONLY_PATTERNS = (
    r"\bresearch\b",
    r"\bbriefing\b",
    r"\bcompare\b",
    r"\bchecklist\b",
)


def _lower(text: str) -> str:
    return str(text or "").strip().lower()


def detect_agent_intent(message: str, *, mode: str | None = None) -> dict[str, Any] | None:
    """Return agent suggestion metadata if the message looks agent-worthy."""
    lower = _lower(message)
    if not lower:
        return None

    agent_type, reason = orb_agent_registry_service.classify_agent(message, mode=mode)
    auto_run = any(re.search(pattern, lower) for pattern in AUTO_RUN_PATTERNS)
    suggested = auto_run or any(re.search(pattern, lower) for pattern in SUGGEST_ONLY_PATTERNS)

    if not suggested:
        return None

    preferred_output = orb_agent_registry_service.default_output_format(agent_type)
    if "briefing" in lower:
        preferred_output = "briefing"
    elif "checklist" in lower:
        preferred_output = "checklist"
    elif "compare" in lower:
        preferred_output = "comparison"
    elif "action plan" in lower:
        preferred_output = "action_plan"
    elif "evidence map" in lower:
        preferred_output = "evidence_map"
    elif "supervision" in lower:
        preferred_output = "supervision_guide"

    return {
        "suggested": True,
        "agent_type": agent_type,
        "reason": reason,
        "auto_run": auto_run,
        "preferred_output": preferred_output,
        "depth": "deep" if "deep research" in lower else "standard",
    }


async def maybe_run_agent_for_conversation(
    message: str,
    *,
    mode: str | None = None,
    profile_context: str | None = None,
) -> dict[str, Any] | None:
    """Auto-run agent when intent is clear; returns answer payload or None."""
    intent = detect_agent_intent(message, mode=mode)
    if not intent or not intent.get("auto_run"):
        return None

    request = OrbAgentRunRequest(
        agent_type=intent["agent_type"],
        prompt=message,
        mode=mode,
        profile_context=profile_context,
        preferred_output=intent.get("preferred_output", "briefing"),
        depth=intent.get("depth", "standard"),
    )
    from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service

    response = await orb_agent_orchestrator_service.run_agent(request)
    return {
        "answer": response.output.body,
        "sources": response.sources,
        "citations": response.citations,
        "context_used": {
            **(response.context_used or {}),
            "agent": {
                "suggested": True,
                "agent_type": response.agent_type,
                "reason": intent.get("reason"),
                "auto_run": True,
            },
        },
        "tools_used": [f"standalone_agent:{response.agent_type}"],
        "agent_run": response.model_dump(),
    }
