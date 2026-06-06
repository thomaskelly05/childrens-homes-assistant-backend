from __future__ import annotations

import app as app_module
from utils.orb_route_introspection import duplicate_route_paths, find_routes_by_path

CRITICAL_PATHS = (
    "/orb/projects",
    "/orb/standalone/config",
    "/orb/voice/session/status",
    "/orb/standalone/outputs/summary",
    "/orb/standalone/access",
    "/orb/standalone/conversation/stream",
    "/orb/front-door/verdict",
    "/auth/me",
    "/auth/passkeys/status",
)


def test_critical_orb_paths_have_single_get_handler():
    app = app_module.app
    for path in CRITICAL_PATHS:
        handlers = find_routes_by_path(app, path)
        method_handlers = [item for item in handlers if "GET" in item["methods"] or "POST" in item["methods"]]
        assert method_handlers, f"missing handler for {path}"
        if path != "/orb/projects":
            assert len(method_handlers) == 1, f"duplicate handlers for {path}: {method_handlers}"


def test_no_duplicate_route_keys_for_critical_paths():
    app = app_module.app
    duplicates = duplicate_route_paths(app)
    for key, entries in duplicates.items():
        for path in CRITICAL_PATHS:
            if path in key:
                assert len(entries) == 1, f"duplicate route registration: {key} -> {entries}"
