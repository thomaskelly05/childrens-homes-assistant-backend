from __future__ import annotations

from services.orb_static_intelligence_cache import (
    clear_static_intelligence_cache,
    load_static_json,
    static_cache_load_count,
)
from services.orb_missingness_graph_service import orb_missingness_graph_service


def test_static_json_loaded_once_per_process():
    clear_static_intelligence_cache()
    path = "assistant/knowledge/orb_scenario_sequences.json"
    assert static_cache_load_count(path) == 0
    first = load_static_json(path)
    assert static_cache_load_count(path) == 1
    second = load_static_json(path)
    assert first is second


def test_missingness_graph_reuses_scenario_cache():
    clear_static_intelligence_cache()
    path = "assistant/knowledge/orb_scenario_sequences.json"
    orb_missingness_graph_service.build_graph("child missing overnight", risk_level="high")
    assert static_cache_load_count(path) == 1
    orb_missingness_graph_service.build_graph("restraint incident", risk_level="medium")
    assert static_cache_load_count(path) == 1
