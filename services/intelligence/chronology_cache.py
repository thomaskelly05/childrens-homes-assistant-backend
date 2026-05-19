from __future__ import annotations

import os
import time
from typing import Any

CHRONOLOGY_CACHE_TTL_SECONDS = int(os.getenv("CHRONOLOGY_CACHE_TTL_SECONDS", "30"))
CHRONOLOGY_CACHE_MAX_ENTRIES = int(os.getenv("CHRONOLOGY_CACHE_MAX_ENTRIES", "5000"))

_CHRONOLOGY_CACHE: dict[str, tuple[float, Any]] = {}


def _now() -> float:
    return time.time()


def _prune_cache() -> None:
    while len(_CHRONOLOGY_CACHE) > CHRONOLOGY_CACHE_MAX_ENTRIES:
        first_key = next(iter(_CHRONOLOGY_CACHE), None)
        if first_key is None:
            break
        _CHRONOLOGY_CACHE.pop(first_key, None)


def chronology_cache_key(*parts: object) -> str:
    return "::".join(str(part or "") for part in parts)


def get_cached_chronology(key: str) -> Any | None:
    cached = _CHRONOLOGY_CACHE.get(key)
    if not cached:
        return None

    expires_at, payload = cached
    if expires_at <= _now():
        _CHRONOLOGY_CACHE.pop(key, None)
        return None

    return payload


def set_cached_chronology(key: str, payload: Any) -> Any:
    _CHRONOLOGY_CACHE[key] = (_now() + CHRONOLOGY_CACHE_TTL_SECONDS, payload)
    _prune_cache()
    return payload


def invalidate_chronology_cache(prefix: str | None = None) -> None:
    if not prefix:
        _CHRONOLOGY_CACHE.clear()
        return

    keys = [key for key in _CHRONOLOGY_CACHE.keys() if key.startswith(prefix)]
    for key in keys:
        _CHRONOLOGY_CACHE.pop(key, None)
