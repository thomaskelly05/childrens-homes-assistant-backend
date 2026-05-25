"""Lightweight in-process TTL cache for OS dashboard and badge endpoints."""

from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

logger = logging.getLogger("indicare.os_cache")

T = TypeVar("T")

DEFAULT_MAX_ENTRIES = 2000


@dataclass
class OsCacheEntry:
    value: Any
    expires_at: float
    stale_until: float | None = None


@dataclass
class OsCacheLookup:
    hit: bool
    stale: bool
    value: Any | None = None
    status: str = "miss"


class OsCacheService:
    """Thread-safe TTL cache with optional stale-while-revalidate and request coalescing."""

    def __init__(self, *, max_entries: int = DEFAULT_MAX_ENTRIES) -> None:
        self._max_entries = max(1, max_entries)
        self._entries: OrderedDict[str, OsCacheEntry] = OrderedDict()
        self._inflight: dict[str, threading.Event] = {}
        self._inflight_results: dict[str, tuple[Any, BaseException | None]] = {}
        self._lock = threading.Lock()

    def _evict_if_needed(self) -> None:
        while len(self._entries) > self._max_entries:
            self._entries.popitem(last=False)

    def get(self, key: str) -> OsCacheLookup:
        now = time.time()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return OsCacheLookup(hit=False, stale=False, status="miss")
            self._entries.move_to_end(key)
            if now < entry.expires_at:
                return OsCacheLookup(hit=True, stale=False, value=entry.value, status="hit")
            if entry.stale_until is not None and now < entry.stale_until:
                return OsCacheLookup(hit=True, stale=True, value=entry.value, status="stale")
            del self._entries[key]
        return OsCacheLookup(hit=False, stale=False, status="miss")

    def set(
        self,
        key: str,
        value: Any,
        *,
        ttl_seconds: float,
        stale_ttl_seconds: float | None = None,
    ) -> None:
        now = time.time()
        stale_until = now + ttl_seconds + stale_ttl_seconds if stale_ttl_seconds else None
        with self._lock:
            self._entries[key] = OsCacheEntry(
                value=value,
                expires_at=now + ttl_seconds,
                stale_until=stale_until,
            )
            self._entries.move_to_end(key)
            self._evict_if_needed()

    def delete(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        removed = 0
        with self._lock:
            keys = [key for key in self._entries if key.startswith(prefix)]
            for key in keys:
                del self._entries[key]
                removed += 1
        return removed

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._inflight.clear()
            self._inflight_results.clear()

    def get_or_build(
        self,
        key: str,
        builder: Callable[[], T],
        *,
        ttl_seconds: float,
        stale_ttl_seconds: float | None = None,
        coalesce: bool = True,
    ) -> tuple[T, OsCacheLookup]:
        lookup = self.get(key)
        if lookup.hit and lookup.value is not None:
            return lookup.value, lookup

        if not coalesce:
            value = builder()
            self.set(key, value, ttl_seconds=ttl_seconds, stale_ttl_seconds=stale_ttl_seconds)
            return value, OsCacheLookup(hit=False, stale=False, status="miss")

        leader = False
        event: threading.Event | None = None
        with self._lock:
            entry = self._entries.get(key)
            now = time.time()
            if entry is not None:
                if now < entry.expires_at:
                    return entry.value, OsCacheLookup(hit=True, stale=False, value=entry.value, status="hit")
                if entry.stale_until is not None and now < entry.stale_until:
                    return entry.value, OsCacheLookup(hit=True, stale=True, value=entry.value, status="stale")
            if key in self._inflight:
                event = self._inflight[key]
            else:
                event = threading.Event()
                self._inflight[key] = event
                leader = True

        if not leader and event is not None:
            event.wait(timeout=max(ttl_seconds, 30))
            lookup = self.get(key)
            if lookup.hit and lookup.value is not None:
                return lookup.value, OsCacheLookup(hit=True, stale=lookup.stale, status=lookup.status or "coalesced")
            with self._lock:
                result = self._inflight_results.pop(key, None)
            if result is not None:
                value, exc = result
                if exc is not None:
                    raise exc
                return value, OsCacheLookup(hit=False, stale=False, status="coalesced")

        try:
            value = builder()
            self.set(key, value, ttl_seconds=ttl_seconds, stale_ttl_seconds=stale_ttl_seconds)
            with self._lock:
                self._inflight_results[key] = (value, None)
            return value, OsCacheLookup(hit=False, stale=False, status="miss")
        except BaseException as exc:
            with self._lock:
                self._inflight_results[key] = (None, exc)
            raise
        finally:
            if leader and event is not None:
                event.set()
                with self._lock:
                    self._inflight.pop(key, None)

    def cache_metadata(self, lookup: OsCacheLookup) -> dict[str, str | bool]:
        return {
            "cache_hit": lookup.hit and not lookup.stale,
            "cache_stale": lookup.stale,
            "cache_status": lookup.status,
        }


os_cache_service = OsCacheService()
