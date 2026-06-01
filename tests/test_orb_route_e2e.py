from __future__ import annotations

import importlib

import pytest


CRITICAL_ROUTE_MODULES = [
    "routers.orb_standalone_routes",
    "routers.orb_billing_routes",
    "routers.orb_launch_routes",
    "routers.orb_dictate_routes",
    "routers.orb_knowledge_routes",
    "routers.orb_saved_output_routes",
    "routers.orb_saved_outputs_launch_routes",
    "routers.orb_system_routes",
    "routers.orb_voice_residential_routes",
    "routers.orb_usage_routes",
]


@pytest.mark.parametrize("module_path", CRITICAL_ROUTE_MODULES)
def test_critical_orb_router_imports(module_path: str):
    module = importlib.import_module(module_path)
    assert getattr(module, "router", None) is not None


def test_orb_system_health_route_registered():
    from routers.orb_system_routes import router

    paths = [getattr(route, "path", "") for route in router.routes]
    assert "/orb/system/health" in paths
