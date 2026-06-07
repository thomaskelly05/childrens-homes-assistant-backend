from __future__ import annotations

import importlib

import pytest
from fastapi import FastAPI

import startup_life_echo_router_patch  # noqa: F401
from core.router_loader import (
    REQUIRED_ROUTERS,
    RETIRED_COMPATIBILITY_ROUTERS,
    ROUTERS,
    get_failed_routers,
    get_router_registry_summary,
    get_skipped_optional_routers,
    get_skipped_retired_compatibility_routers,
    get_skipped_unexpected_optional_routers,
    include_routers,
)


@pytest.fixture
def router_load_report(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SESSION_SECRET", "test-secret")
    app = FastAPI()
    return include_routers(app)


def test_retired_compatibility_registry_matches_missing_legacy_modules():
    assert len(RETIRED_COMPATIBILITY_ROUTERS) == 61
    assert RETIRED_COMPATIBILITY_ROUTERS <= set(ROUTERS)
    assert not RETIRED_COMPATIBILITY_ROUTERS & REQUIRED_ROUTERS

    for router_path in RETIRED_COMPATIBILITY_ROUTERS:
        with pytest.raises(ModuleNotFoundError) as exc_info:
            importlib.import_module(router_path)
        assert exc_info.value.name == router_path


def test_startup_load_counts_remain_stable(router_load_report):
    assert len(router_load_report.loaded) == 148
    assert len(router_load_report.failed) == 0
    assert len(router_load_report.skipped_optional) == 61
    assert not [router for router in REQUIRED_ROUTERS if router not in router_load_report.loaded]


def test_missing_optional_routers_split_retired_and_unexpected(router_load_report):
    retired = {entry["router"] for entry in get_skipped_retired_compatibility_routers()}
    unexpected = {entry["router"] for entry in get_skipped_unexpected_optional_routers()}
    optional = {entry["router"] for entry in get_skipped_optional_routers()}

    assert retired == RETIRED_COMPATIBILITY_ROUTERS
    assert unexpected == set()
    assert optional == retired
    assert len(router_load_report.skipped_retired_compatibility) == 61
    assert len(router_load_report.skipped_unexpected_optional) == 0


def test_router_registry_summary_reports_retired_and_unexpected_counts(router_load_report):
    summary = get_router_registry_summary()

    assert summary["router_count"] == len(ROUTERS)
    assert summary["retired_compatibility_router_registry_count"] == 61
    assert summary["skipped_optional_router_count"] == 61
    assert summary["skipped_retired_compatibility_router_count"] == 61
    assert summary["skipped_unexpected_optional_router_count"] == 0
    assert len(get_failed_routers()) == 0
