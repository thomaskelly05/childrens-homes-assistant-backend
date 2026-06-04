"""Development/debug timing marks for ORB chat stream and conversation routes."""

from __future__ import annotations

import os
import time
from typing import Any


def orb_chat_timing_debug_enabled() -> bool:
    flag = os.getenv("ORB_CHAT_TIMING_DEBUG", "").strip().lower()
    if flag in {"1", "true", "yes", "on"}:
        return True
    return os.getenv("ENV", "").strip().lower() in {"development", "dev", "local"}


class OrbChatTimingTracker:
    """Relative millisecond marks from route start (debug metadata only)."""

    def __init__(self) -> None:
        self._started = time.perf_counter()
        self._marks: dict[str, int] = {}

    def mark(self, key: str) -> None:
        self._marks[key] = int((time.perf_counter() - self._started) * 1000)

    def elapsed_ms(self, key: str) -> int | None:
        return self._marks.get(key)

    def to_debug_metadata(self) -> dict[str, Any]:
        if not orb_chat_timing_debug_enabled():
            return {}
        return {
            "request_received_ms": self._marks.get("request_received"),
            "core_start_ms": self._marks.get("core_start"),
            "core_complete_ms": self._marks.get("core_complete"),
            "model_start_ms": self._marks.get("model_start"),
            "first_token_ms": self._marks.get("first_token"),
            "stream_complete_ms": self._marks.get("stream_complete"),
            "finalise_start_ms": self._marks.get("finalise_start"),
            "quality_gate_complete_ms": self._marks.get("quality_gate_complete"),
            "ledger_complete_ms": self._marks.get("ledger_complete"),
            "response_sent_ms": self._marks.get("response_sent"),
        }
