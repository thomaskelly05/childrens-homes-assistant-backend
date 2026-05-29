from __future__ import annotations

import logging
from typing import Any

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from db.orb_residential_db import record_orb_usage_event

logger = logging.getLogger("indicare.orb_standalone_usage")


def _estimate_cost(tokens_in: int, tokens_out: int, *, cost_tier: str | None = None) -> float:
    tier = str(cost_tier or "standard").lower()
    if tier in {"none", "low"}:
        rate_in, rate_out = 0.0000005, 0.000001
    elif tier == "premium":
        rate_in, rate_out = 0.000003, 0.000012
    else:
        rate_in, rate_out = 0.000001, 0.000004
    return round(tokens_in * rate_in + tokens_out * rate_out, 6)


def record_standalone_orb_usage(
    *,
    user_id: int | None,
    result: dict[str, Any] | None = None,
    event_type: str = "conversation",
    mode: str | None = None,
    action_id: str | None = None,
    document_lens: str | None = None,
    latency_ms: int | None = None,
    success: bool = True,
) -> None:
    context = (result or {}).get("context_used") or {}
    routing = context.get("model_routing") or {}
    timing = context.get("timing") or {}
    prompt_tier = context.get("prompt_tier") or routing.get("prompt_tier")
    tokens_in = int(routing.get("tokens_in") or timing.get("tokens_in") or 0)
    tokens_out = int(routing.get("tokens_out") or timing.get("tokens_out") or 0)
    if not tokens_out and result and result.get("answer"):
        tokens_out = max(1, len(str(result["answer"])) // 4)
    if not tokens_in and result and result.get("answer"):
        tokens_in = max(1, len(str(result.get("answer", ""))) // 8)
    estimated = float(
        routing.get("estimated_cost")
        or _estimate_cost(tokens_in, tokens_out, cost_tier=routing.get("cost_tier"))
    )
    try:
        conn = get_db_connection()
    except DatabaseUnavailableError:
        return
    try:
        record_orb_usage_event(
            conn,
            user_id=user_id,
            event_type=event_type,
            mode=mode,
            workflow="standalone_orb",
            model=str(routing.get("model") or timing.get("model") or "template"),
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            estimated_cost=estimated,
            latency_ms=latency_ms,
            success=success,
            route=str(routing.get("route") or context.get("surface") or "standalone_orb"),
            action_id=action_id,
            document_lens=document_lens,
            prompt_tier=str(prompt_tier) if prompt_tier else None,
            provider=str(routing.get("provider") or timing.get("provider") or "local"),
            metadata={
                "task_type": routing.get("task_type"),
                "cost_tier": routing.get("cost_tier"),
                "local_template": context.get("local_template"),
                "no_llm": (result or {}).get("no_llm") or context.get("local_template"),
            },
        )
        conn.commit()
    except Exception:
        logger.debug("standalone ORB usage event not recorded", exc_info=True)
        try:
            conn.rollback()
        except Exception:
            pass
    finally:
        release_db_connection(conn)
