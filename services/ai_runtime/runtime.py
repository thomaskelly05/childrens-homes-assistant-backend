from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from dataclasses import dataclass
from typing import Any

# Central AI runtime for IndiCare AI.
# All products should eventually route through this layer:
# - IndiCare AI
# - I-Notes
# - IndiCare Docs
# - IndiCare Mail
# - IndiCare Connect
#
# Goals:
# - reduce AI spend
# - route tasks intelligently
# - centralise limits
# - support caching
# - support future local models
# - enforce fair use


@dataclass(slots=True)
class TaskProfile:
    name: str
    tier: str
    max_tokens: int
    temperature: float
    cacheable: bool = True
    structured_output: bool = False


TASKS: dict[str, TaskProfile] = {
    "chat": TaskProfile("chat", "balanced", 1200, 0.6, cacheable=False),
    "quick_chat": TaskProfile("quick_chat", "cheap", 500, 0.4, cacheable=False),
    "chronology": TaskProfile("chronology", "cheap", 700, 0.2),
    "mail_review": TaskProfile("mail_review", "cheap", 500, 0.2),
    "document_review": TaskProfile("document_review", "balanced", 1000, 0.3),
    "safeguarding_review": TaskProfile("safeguarding_review", "premium", 1500, 0.2, cacheable=False),
    "notes_cleanup": TaskProfile("notes_cleanup", "cheap", 700, 0.2),
    "meeting_summary": TaskProfile("meeting_summary", "cheap", 800, 0.3),
    "action_extraction": TaskProfile("action_extraction", "cheap", 500, 0.1),
    "tone_review": TaskProfile("tone_review", "cheap", 400, 0.1),
}


MODEL_LADDER = {
    "cheap": os.getenv("INDICARE_MODEL_CHEAP", "gpt-4o-mini"),
    "balanced": os.getenv("INDICARE_MODEL_BALANCED", "gpt-4o-mini"),
    "premium": os.getenv("INDICARE_MODEL_PREMIUM", "gpt-4.1-mini"),
}


class RuntimeCache:
    def __init__(self, ttl_seconds: int = 1800):
        self.ttl = ttl_seconds
        self._cache: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._cache.get(key)
            if not item:
                return None
            expires, value = item
            if expires < time.time():
                self._cache.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._cache[key] = (time.time() + self.ttl, value)


CACHE = RuntimeCache()


class UsageTracker:
    def __init__(self):
        self._usage: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()

    def track(self, organisation_id: str, task: str, estimated_tokens: int) -> None:
        with self._lock:
            state = self._usage.setdefault(organisation_id, {
                "tokens": 0,
                "requests": 0,
                "tasks": {},
                "updated_at": time.time(),
            })
            state["tokens"] += max(estimated_tokens, 0)
            state["requests"] += 1
            state["tasks"][task] = state["tasks"].get(task, 0) + 1
            state["updated_at"] = time.time()

    def get(self, organisation_id: str) -> dict[str, Any]:
        return self._usage.get(organisation_id, {
            "tokens": 0,
            "requests": 0,
            "tasks": {},
        })


USAGE = UsageTracker()


class Governor:
    # Soft limits suitable for ~£100/home pricing.
    MONTHLY_TOKEN_SOFT_LIMIT = int(os.getenv("INDICARE_AI_MONTHLY_TOKEN_LIMIT", "12000000"))
    MONTHLY_REQUEST_SOFT_LIMIT = int(os.getenv("INDICARE_AI_MONTHLY_REQUEST_LIMIT", "5000"))

    def should_throttle(self, organisation_id: str) -> bool:
        usage = USAGE.get(organisation_id)
        return (
            usage.get("tokens", 0) >= self.MONTHLY_TOKEN_SOFT_LIMIT
            or usage.get("requests", 0) >= self.MONTHLY_REQUEST_SOFT_LIMIT
        )

    def choose_model(self, task: str, force_tier: str | None = None) -> str:
        profile = TASKS.get(task, TASKS["chat"])
        tier = force_tier or profile.tier
        return MODEL_LADDER.get(tier, MODEL_LADDER["cheap"])

    def estimate_tokens(self, prompt: str) -> int:
        return max(1, len(prompt) // 4)

    def allow_structured_output(self, task: str) -> bool:
        return TASKS.get(task, TASKS["chat"]).structured_output


GOVERNOR = Governor()


class AIRuntime:
    def cache_key(self, task: str, payload: dict[str, Any]) -> str:
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        return f"{task}:{digest}"

    def route(self, *, task: str, organisation_id: str = "default", payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        profile = TASKS.get(task, TASKS["chat"])

        if GOVERNOR.should_throttle(organisation_id):
            return {
                "allowed": False,
                "reason": "monthly_soft_limit_reached",
                "fallback_model": MODEL_LADDER["cheap"],
            }

        cache_key = None
        cached = None

        if profile.cacheable:
            cache_key = self.cache_key(task, payload)
            cached = CACHE.get(cache_key)
            if cached is not None:
                return {
                    "allowed": True,
                    "cached": True,
                    "response": cached,
                    "profile": profile,
                    "model": GOVERNOR.choose_model(task),
                }

        prompt = str(payload.get("prompt") or payload.get("message") or "")
        estimated_tokens = GOVERNOR.estimate_tokens(prompt)

        USAGE.track(organisation_id, task, estimated_tokens)

        return {
            "allowed": True,
            "cached": False,
            "cache_key": cache_key,
            "estimated_tokens": estimated_tokens,
            "profile": profile,
            "model": GOVERNOR.choose_model(task),
            "structured_output": GOVERNOR.allow_structured_output(task),
        }

    def cache_response(self, cache_key: str | None, response: Any) -> None:
        if cache_key:
            CACHE.set(cache_key, response)

    def usage(self, organisation_id: str) -> dict[str, Any]:
        return USAGE.get(organisation_id)


runtime = AIRuntime()
