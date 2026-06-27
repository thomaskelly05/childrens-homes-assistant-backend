"""One-shot OpenAI repair for live high-risk guardrail post-check failures."""

from __future__ import annotations

import logging

from services.ai_model_router_service import ai_model_router_service

logger = logging.getLogger("indicare.orb_live_guardrail_repair")

_REPAIR_SYSTEM = (
    "You are ORB, a residential children's homes safeguarding assistant. "
    "Revise the provided answer to include every missing required safeguard. "
    "British English. Child-centred. Do not invent law. Do not diagnose. "
    "Include local policy and professional judgement caveat. "
    "Return only the revised answer — no preamble."
)


async def repair_guardrail_answer(
    *,
    repair_prompt: str,
    user_message: str | None = None,
) -> str:
    """Call OpenAI once to repair a live answer that failed high-risk marker post-check."""
    message = repair_prompt.strip()
    if user_message:
        message = f"Original staff question/context:\n{user_message.strip()}\n\n{message}"

    try:
        response, _decision, _trace = await ai_model_router_service.complete_with_routing(
            message=message,
            system_prompt=_REPAIR_SYSTEM,
            mode="Safeguarding Thinking",
            detail_level="detailed",
            surface="orb_live_guardrail_repair",
            route="orb_live_guardrail_repair_service.repair_guardrail_answer",
            local_fallback_available=False,
        )
        repaired = str(getattr(response, "text", None) or response or "").strip()
        if repaired:
            return repaired
    except Exception:
        logger.warning("orb_live_guardrail_repair failed", exc_info=True)
    return ""
