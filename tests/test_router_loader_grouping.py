from __future__ import annotations

from fastapi import FastAPI

from core.router_loader import (
    REQUIRED_ROUTERS,
    ROUTER_GROUPS,
    ROUTERS,
    get_router_registry_summary,
    include_router,
)


def test_router_groups_preserve_flat_manifest_order():
    grouped = [route for group in ROUTER_GROUPS for route in group.routers]

    assert ROUTERS == grouped
    assert len(ROUTERS) == len(set(ROUTERS))
    assert {"auth", "assistant", "chronology", "reporting", "documents", "safeguarding"} <= {
        group.name for group in ROUTER_GROUPS
    }


def test_required_router_set_stays_narrow_and_explicit():
    assert {
        "routers.auth_routes",
        "routers.mfa_routes",
        "routers.session_security_routes",
        "routers.debug_health_routes",
        "routers.frontend_compat",
        "routers.security_routes",
    } <= REQUIRED_ROUTERS
    assert "routers.assistant_general_routes" not in REQUIRED_ROUTERS


def test_assistant_general_ui_router_is_mounted_by_loader():
    app = FastAPI()

    mounted = include_router(app, "routers.assistant_general_routes")
    routes = {(method, route.path) for route in app.routes for method in getattr(route, "methods", [])}

    assert "ui_router" in mounted
    assert ("GET", "/assistant") in routes
    assert ("GET", "/assistant.html") in routes
    assert ("POST", "/assistant") in routes


def test_router_registry_summary_reports_domains_and_compatibility():
    summary = get_router_registry_summary()

    assert summary["router_count"] == len(ROUTERS)
    assert summary["required_router_count"] == len(REQUIRED_ROUTERS)
    assert summary["legacy_compatibility_router_count"] >= 1
    assert any(group["name"] == "operational-backend" for group in summary["groups"])
