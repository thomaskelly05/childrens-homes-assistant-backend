from __future__ import annotations

import hashlib
import json
import logging
import os
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any

from core.policy_engine import context_from_user, policy_engine
from core.provider_context import ProviderContextError
from services.orb_observability_service import orb_observability_service

logger = logging.getLogger("indicare.realtime.event_bus")


REALTIME_EVENT_TYPES = {
    "orb.lifecycle",
    "chronology.update",
    "safeguarding.update",
    "shift.change",
    "notification",
    "action.update",
    "incident.update",
    "management.alert",
    "assistant.context_refresh",
    "operational_state.lifecycle",
    "audit.timeline",
    "inspection.evidence",
    "governance.signoff",
    "evidence.graph",
}


def _home_id(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return str(int(value))
    except (TypeError, ValueError):
        return str(value)


def _safe_payload(payload: dict[str, Any]) -> dict[str, Any]:
    redacted_keys = {"text", "transcript", "prompt", "audio", "child_name", "young_person_name", "content"}
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if str(key).lower() in redacted_keys:
            safe[key] = "[redacted]"
        elif isinstance(value, dict):
            safe[key] = _safe_payload(value)
        elif isinstance(value, list):
            safe[key] = f"{len(value)} item(s)"
        else:
            safe[key] = value
    return safe


class RealtimeEventBus:
    """Home-scoped realtime delivery with Redis pub/sub and local fallback."""

    def __init__(self) -> None:
        self._redis_client: Any | None = None
        self._redis_attempted = False
        self._recent_dedupe: dict[str, float] = {}
        self._throttle: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=50))
        self._memory_events: dict[str, deque[dict[str, Any]]] = defaultdict(lambda: deque(maxlen=50))
        self._sequence = 0

    def reset_for_tests(self) -> None:
        self._recent_dedupe.clear()
        self._throttle.clear()
        self._memory_events.clear()
        self._sequence = 0

    def publish(
        self,
        *,
        event_type: str,
        home_id: int | str | None,
        actor: dict[str, Any],
        payload: dict[str, Any] | None = None,
        required_permission: str = "assistant:access",
        dedupe_key: str | None = None,
        throttle_key: str | None = None,
    ) -> dict[str, Any]:
        if event_type not in REALTIME_EVENT_TYPES:
            raise ValueError(f"Unsupported realtime event type: {event_type}")
        home_scope = _home_id(home_id)
        if not home_scope:
            raise PermissionError("Realtime events must be home-scoped")
        if not self.can_access_home(actor, home_scope):
            raise PermissionError("Realtime event home scope is not permitted for this actor")
        if required_permission and not policy_engine.has_permission(actor, required_permission, home_id=home_scope):
            raise PermissionError("Realtime event permission denied")

        event_payload = _safe_payload(payload or {})
        dedupe = dedupe_key or self._dedupe_hash(event_type, home_scope, event_payload)
        if self._is_duplicate(dedupe):
            return {"published": False, "duplicate": True, "event_id": dedupe}
        if self._is_throttled(throttle_key or f"{home_scope}:{event_type}"):
            orb_observability_service.record_event("realtime_event_throttled", home_id=home_scope, metadata={"event_type": event_type})
            return {"published": False, "throttled": True, "event_id": dedupe}

        self._sequence += 1
        event = {
            "id": f"evt_{uuid.uuid4().hex[:16]}",
            "cursor": self._sequence,
            "type": event_type,
            "home_id": home_scope,
            "provider_id": actor.get("provider_id") or actor.get("providerId"),
            "payload": event_payload,
            "actor_id": str(actor.get("id") or actor.get("sub") or ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        channel = self._channel(home_scope)
        redis = self._redis()
        if redis:
            try:
                redis.publish(channel, json.dumps(event, separators=(",", ":")))
            except Exception:
                logger.warning("Redis realtime publish failed; retaining local replay buffer", exc_info=True)
        self._memory_events[channel].append(event)
        orb_observability_service.record_event("realtime_event_published", home_id=home_scope, metadata={"event_type": event_type})
        return {"published": True, "event_id": event["id"], "channel": channel}

    def recent_events_for_user(self, *, current_user: dict[str, Any], home_id: int | str | None, limit: int = 20) -> list[dict[str, Any]]:
        home_scope = _home_id(home_id)
        if not home_scope or not self.can_access_home(current_user, home_scope):
            return []
        channel = self._channel(home_scope)
        return list(self._memory_events[channel])[-limit:]

    def replay_for_user(
        self,
        *,
        current_user: dict[str, Any],
        home_id: int | str | None,
        after_cursor: int | None = None,
        since: str | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        home_scope = _home_id(home_id)
        if not home_scope or not self.can_access_home(current_user, home_scope):
            return {"ok": False, "events": [], "reason": "home_scope_denied", "next_cursor": after_cursor or 0}
        if not policy_engine.has_permission(current_user, "realtime:subscribe", home_id=home_scope):
            return {"ok": False, "events": [], "reason": "permission_denied", "next_cursor": after_cursor or 0}
        events = list(self._memory_events[self._channel(home_scope)])
        if after_cursor is not None:
            events = [event for event in events if int(event.get("cursor") or 0) > after_cursor]
        if since:
            events = [event for event in events if str(event.get("created_at") or "") >= since]
        capped = events[: max(1, min(limit, 500))]
        next_cursor = int(capped[-1]["cursor"]) if capped else after_cursor or 0
        return {"ok": True, "events": capped, "next_cursor": next_cursor}

    def can_access_home(self, current_user: dict[str, Any], home_id: int | str | None) -> bool:
        try:
            return context_from_user(current_user).can_access_home(home_id)
        except ProviderContextError:
            return False

    def event_visible_to_user(self, event: dict[str, Any], current_user: dict[str, Any]) -> bool:
        return self.can_access_home(current_user, event.get("home_id")) and policy_engine.has_permission(
            current_user,
            "realtime:subscribe",
            home_id=event.get("home_id"),
        )

    def _redis(self) -> Any | None:
        if self._redis_client is not None:
            return self._redis_client
        if self._redis_attempted:
            return None
        self._redis_attempted = True
        redis_url = os.getenv("ORB_REDIS_URL") or os.getenv("REDIS_URL")
        if not redis_url:
            return None
        try:
            import redis

            client = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
            client.ping()
            self._redis_client = client
            return client
        except Exception:
            logger.warning("Redis unavailable for realtime event bus; using local delivery only", exc_info=True)
            return None

    def _channel(self, home_id: str) -> str:
        return f"orb:home:{home_id}:events"

    def _dedupe_hash(self, event_type: str, home_id: str, payload: dict[str, Any]) -> str:
        digest = hashlib.sha256(json.dumps([event_type, home_id, payload], sort_keys=True, default=str).encode("utf-8")).hexdigest()
        return digest[:24]

    def _is_duplicate(self, key: str) -> bool:
        now = time.time()
        ttl = int(os.getenv("ORB_EVENT_DEDUPE_SECONDS", "20"))
        for existing, created_at in list(self._recent_dedupe.items()):
            if now - created_at > ttl:
                self._recent_dedupe.pop(existing, None)
        if key in self._recent_dedupe:
            return True
        self._recent_dedupe[key] = now
        return False

    def _is_throttled(self, key: str) -> bool:
        now = time.time()
        window = int(os.getenv("ORB_EVENT_THROTTLE_WINDOW_SECONDS", "5"))
        limit = int(os.getenv("ORB_EVENT_THROTTLE_LIMIT", "20"))
        bucket = self._throttle[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            return True
        bucket.append(now)
        return False


realtime_event_bus = RealtimeEventBus()
