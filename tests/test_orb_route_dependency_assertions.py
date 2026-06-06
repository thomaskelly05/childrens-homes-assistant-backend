from __future__ import annotations

import app as app_module
from utils.orb_route_introspection import (
    ORB_BOOTSTRAP_DEPENDENCY,
    find_routes_by_path,
    route_has_bootstrap_dependency,
)


def test_bootstrap_routes_require_product_bootstrap_access():
    app = app_module.app
    for path in (
        "/orb/projects",
        "/orb/standalone/config",
        "/orb/voice/session/status",
        "/orb/standalone/outputs/summary",
    ):
        assert route_has_bootstrap_dependency(app, path, "GET"), path


def test_access_route_does_not_require_bootstrap():
    app = app_module.app
    handlers = find_routes_by_path(app, "/orb/standalone/access")
    assert handlers
    assert all(ORB_BOOTSTRAP_DEPENDENCY not in handler["dependencies"] for handler in handlers)


def test_front_door_verdict_is_public():
    app = app_module.app
    handlers = find_routes_by_path(app, "/orb/front-door/verdict")
    assert handlers
    assert all(ORB_BOOTSTRAP_DEPENDENCY not in handler["dependencies"] for handler in handlers)


def test_auth_me_does_not_require_bootstrap():
    app = app_module.app
    handlers = find_routes_by_path(app, "/auth/me")
    assert handlers
    assert all(ORB_BOOTSTRAP_DEPENDENCY not in handler["dependencies"] for handler in handlers)
