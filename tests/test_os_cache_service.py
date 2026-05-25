from __future__ import annotations

import time

import pytest

from services.os_cache_service import OsCacheService


@pytest.fixture
def cache():
    service = OsCacheService(max_entries=10)
    yield service
    service.clear()


def test_cache_hit_and_miss(cache):
    cache.set("k1", {"count": 1}, ttl_seconds=60)
    lookup = cache.get("k1")
    assert lookup.hit is True
    assert lookup.status == "hit"
    assert lookup.value == {"count": 1}
    assert cache.get("missing").status == "miss"


def test_cache_ttl_expiry(cache):
    cache.set("k2", "v", ttl_seconds=0.05)
    time.sleep(0.08)
    assert cache.get("k2").status == "miss"


def test_cache_stale_fallback(cache):
    cache.set("k3", {"n": 3}, ttl_seconds=0.05, stale_ttl_seconds=2)
    time.sleep(0.08)
    lookup = cache.get("k3")
    assert lookup.hit is True
    assert lookup.stale is True
    assert lookup.status == "stale"


def test_get_or_build_coalescing(cache):
    calls = {"n": 0}

    def builder():
        calls["n"] += 1
        time.sleep(0.05)
        return {"built": True}

    import threading

    results = []

    def worker():
        value, lookup = cache.get_or_build("coalesce", builder, ttl_seconds=30, coalesce=True)
        results.append((value, lookup.status))

    threads = [threading.Thread(target=worker) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=2)

    assert calls["n"] == 1
    assert len(results) == 4
    assert all(value == {"built": True} for value, _ in results)
