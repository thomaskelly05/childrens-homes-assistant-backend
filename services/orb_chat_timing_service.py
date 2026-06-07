"""ORB Residential route timing marks — safe relative-ms metadata for performance audits."""

from __future__ import annotations

import logging
import os
import time
from typing import Any

logger = logging.getLogger("indicare.orb_timing")

# Stage keys safe to expose in context_used (no record payloads).
STAGE_MARK_KEYS = (
    "request_received",
    "context_build_start",
    "retrieval_complete",
    "shared_cognition_complete",
    "prompt_build_complete",
    "core_start",
    "core_complete",
    "model_start",
    "model_complete",
    "first_token",
    "stream_complete",
    "citations_complete",
    "explainability_complete",
    "finalise_start",
    "quality_gate_complete",
    "ledger_complete",
    "governance_complete",
    "response_sent",
)


def orb_chat_timing_debug_enabled() -> bool:
    flag = os.getenv("ORB_CHAT_TIMING_DEBUG", "").strip().lower()
    if flag in {"1", "true", "yes", "on"}:
        return True
    return os.getenv("ENV", "").strip().lower() in {"development", "dev", "local"}


class OrbChatTimingTracker:
    """Relative millisecond marks from route start (safe metadata only)."""

    def __init__(self) -> None:
        self._started = time.perf_counter()
        self._marks: dict[str, int] = {}

    def mark(self, key: str) -> None:
        self._marks[key] = int((time.perf_counter() - self._started) * 1000)

    def elapsed_ms(self, key: str) -> int | None:
        return self._marks.get(key)

    def stage_durations_ms(self) -> dict[str, int | None]:
        """Pairwise stage durations derived from marks (no PII)."""
        marks = self._marks
        return {
            "context_build_ms": _span(marks, "context_build_start", "retrieval_complete"),
            "retrieval_ms": _span(marks, "retrieval_complete", "shared_cognition_complete"),
            "shared_cognition_ms": _span(marks, "shared_cognition_complete", "prompt_build_complete"),
            "prompt_build_ms": _span(marks, "prompt_build_complete", "model_start"),
            "model_ms": _span(marks, "model_start", "model_complete")
            or _span(marks, "model_start", "stream_complete"),
            "post_model_ms": _span(marks, "model_complete", "response_sent")
            or _span(marks, "stream_complete", "response_sent"),
            "finalise_ms": _span(marks, "finalise_start", "quality_gate_complete"),
            "ledger_ms": _span(marks, "quality_gate_complete", "ledger_complete"),
            "citations_ms": _span(marks, "model_complete", "citations_complete")
            or _span(marks, "stream_complete", "citations_complete"),
            "explainability_ms": _span(marks, "citations_complete", "explainability_complete"),
        }

    def to_stage_metadata(self) -> dict[str, int | None]:
        """Always-on relative marks for context_used (no child/staff/home data)."""
        return {f"{key}_ms": self._marks.get(key) for key in STAGE_MARK_KEYS if key in self._marks}

    def to_debug_metadata(self) -> dict[str, Any]:
        if not orb_chat_timing_debug_enabled():
            return {}
        payload = self.to_stage_metadata()
        payload.update(self.stage_durations_ms())
        return payload


def _span(marks: dict[str, int], start: str, end: str) -> int | None:
    if start not in marks or end not in marks:
        return None
    delta = marks[end] - marks[start]
    return delta if delta >= 0 else None


def build_route_timing_payload(
    tracker: OrbChatTimingTracker | None,
    *,
    route: str,
    elapsed_ms: int | None = None,
    retrieval_elapsed_ms: int | None = None,
    provider_elapsed_ms: int | None = None,
    prompt_tier: str | None = None,
    prompt_char_estimate: int | None = None,
    grounding_char_count: int | None = None,
    model: str | None = None,
    provider: str | None = None,
    first_token_ms: int | None = None,
    shared_cognition_skipped: bool | None = None,
    expert_depth: str | None = None,
    stream_mode: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Assemble safe timing metadata for ORB Residential context_used."""
    payload: dict[str, Any] = {
        "route": route,
        "elapsed_ms": elapsed_ms,
        "total_elapsed_ms": elapsed_ms,
        "retrieval_elapsed_ms": retrieval_elapsed_ms,
        "provider_elapsed_ms": provider_elapsed_ms,
        "prompt_tier": prompt_tier,
        "prompt_char_estimate": prompt_char_estimate,
        "grounding_char_count": grounding_char_count,
        "model": model,
        "provider": provider,
    }
    if first_token_ms is not None:
        payload["first_token_ms"] = first_token_ms
    if shared_cognition_skipped is not None:
        payload["shared_cognition_skipped"] = shared_cognition_skipped
        if shared_cognition_skipped:
            payload["shared_cognition_elapsed_ms"] = 0
    if expert_depth:
        payload["expert_depth"] = expert_depth
    if stream_mode:
        payload["stream_mode"] = stream_mode
    if tracker:
        payload["stages"] = tracker.to_stage_metadata()
        durations = tracker.stage_durations_ms()
        for key, value in durations.items():
            if value is not None:
                payload[key] = value
        if orb_chat_timing_debug_enabled():
            debug = tracker.to_debug_metadata()
            if debug:
                payload["debug_timing"] = debug
    if extra:
        payload.update(extra)
    return {k: v for k, v in payload.items() if v is not None}


def log_orb_route_timing(
    route: str,
    timing: dict[str, Any],
    *,
    mode: str | None = None,
    event: str = "ok",
) -> None:
    """INFO-level timing summary for ORB Residential routes (no record data)."""
    logger.info(
        "orb_route_timing route=%s event=%s mode=%s elapsed_ms=%s retrieval_ms=%s provider_ms=%s "
        "first_token_ms=%s prompt_tier=%s prompt_chars=%s",
        route,
        event,
        mode or "",
        timing.get("elapsed_ms") or timing.get("total_elapsed_ms"),
        timing.get("retrieval_elapsed_ms"),
        timing.get("provider_elapsed_ms"),
        timing.get("first_token_ms"),
        timing.get("prompt_tier"),
        timing.get("prompt_char_estimate"),
    )
