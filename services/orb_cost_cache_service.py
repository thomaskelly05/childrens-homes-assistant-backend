from __future__ import annotations

import time
from functools import lru_cache
from typing import Any, Callable, TypeVar

T = TypeVar("T")

_CACHE: dict[str, tuple[float, Any]] = {}
_DEFAULT_TTL_SECONDS = 300


def cached_call(key: str, factory: Callable[[], T], *, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> T:
    now = time.time()
    entry = _CACHE.get(key)
    if entry and entry[0] > now:
        return entry[1]  # type: ignore[return-value]
    value = factory()
    _CACHE[key] = (now + max(1, ttl_seconds), value)
    return value


def clear_orb_cost_cache() -> None:
    _CACHE.clear()
    _cached_greeting_help.cache_clear()


@lru_cache(maxsize=32)
def _cached_greeting_help(kind: str) -> str:
    from services.orb_local_response_service import (
        DATA_SAFETY_HELP,
        HOW_TO_USE_ORB,
        PROFILE_HELP,
        VOICE_HELP,
        WHAT_ORB_CAN_DO,
    )

    return {
        "greeting": WHAT_ORB_CAN_DO,
        "data_safety": DATA_SAFETY_HELP,
        "voice": VOICE_HELP,
        "profile": PROFILE_HELP,
        "how_to": HOW_TO_USE_ORB,
    }.get(kind, WHAT_ORB_CAN_DO)


def cache_source_registry(loader: Callable[[], Any]) -> Any:
    return cached_call("orb_source_registry", loader, ttl_seconds=600)


def cache_scenario_family_packet(family: str, loader: Callable[[], Any]) -> Any:
    return cached_call(f"orb_scenario_family:{family}", loader, ttl_seconds=600)


def cache_citation_decision(cache_key: str, loader: Callable[[], Any]) -> Any:
    return cached_call(f"orb_citation:{cache_key}", loader, ttl_seconds=180)


def cache_document_lens(lens_key: str, loader: Callable[[], Any]) -> Any:
    return cached_call(f"orb_doc_lens:{lens_key}", loader, ttl_seconds=300)
