"""In-process cache for static ORB / IndiCare Intelligence JSON knowledge assets.

Loads each file once per process. Never cache user-specific or permission-scoped data.
"""

from __future__ import annotations

import json
import os
from typing import Any

_CACHE: dict[str, Any] = {}

_KNOWN_STATIC_FILES = (
    "assistant/knowledge/indicare_registered_home_domain_map.json",
    "assistant/knowledge/orb_quality_standards_brain.json",
    "assistant/knowledge/trusted_sources_registry.json",
    "assistant/knowledge/orb_scenario_sequences.json",
)


def _repo_relative_path(relative_path: str) -> str:
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.normpath(os.path.join(base, relative_path))


def load_static_json(relative_path: str, *, reload: bool = False) -> dict[str, Any]:
    """Load a static JSON file from the repo (cached unless reload=True)."""
    key = relative_path.replace("\\", "/")
    if not reload and key in _CACHE:
        return _CACHE[key]
    path = _repo_relative_path(relative_path)
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        data = {"_root": data}
    _CACHE[key] = data
    return data


def clear_static_intelligence_cache() -> None:
    """Clear all cached static intelligence (development / tests)."""
    _CACHE.clear()


def static_cache_load_count(relative_path: str) -> int:
    """Return 1 if path is cached, else 0 (for contract tests)."""
    key = relative_path.replace("\\", "/")
    return 1 if key in _CACHE else 0
